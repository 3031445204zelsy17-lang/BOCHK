"""Step 5 ESG 合规分析 — 业务逻辑层

加载问卷 → 筛选法规 → 构建约束式 Prompt → 调用 LLM → 解析校验 → 返回结构化结果
含重试机制（3 次）、缓存和 Mock 降级兜底

遵循 profile_service.py / matching_service.py 的成熟模式。
"""

import hashlib
import json
import logging
from collections import OrderedDict
from pathlib import Path

from app.parsers.md_parser import get_regulation_context
from app.services.llm_client import llm_client
from app.prompts.esg_prompt import (
    SYSTEM_PROMPT,
    RULES,
    SCORING,
    FEWSHOT_USER,
    FEWSHOT_ASSISTANT,
    OUTPUT_FORMAT,
    USER_TEMPLATE,
    RETRY_HINT,
)

logger = logging.getLogger(__name__)

# ── 常量 ────────────────────────────────────────────────────

# 国家代码映射（前端发送的值 → MD 数据中的地区代码）
COUNTRY_MAP = {
    "thailand": "TH", "th": "TH",
    "singapore": "SG", "sg": "SG",
    "hong_kong": "HK", "hk": "HK",
    "eu": "EU",
}

# 地区代码 → 中文显示名
COUNTRY_DISPLAY = {
    "TH": "泰国", "SG": "新加坡", "HK": "香港", "EU": "欧盟",
}

# 标准代码 → 中文显示名
STANDARD_DISPLAY = {
    "destination": "目的地法规",
    "bochk": "BOCHK 准入",
}

# ESG 加权权重（参考 EcoVadis）
CATEGORY_WEIGHTS = {"E": 0.30, "S": 0.35, "G": 0.35}

# 问卷数据目录
ESG_DATA_DIR = Path(__file__).parent.parent / "data" / "esg"

MAX_RETRIES = 3

# ── 缓存 ────────────────────────────────────────────────────

_esg_cache: OrderedDict[str, dict] = {}
_CACHE_MAX_SIZE = 50


def _cache_key(req) -> str:
    """生成缓存 key：profile 关键字段 + country + standard + answers 排序"""
    profile = req.profile or {}
    core = (
        json.dumps(sorted(profile.get("industry_tags", [])), ensure_ascii=False),
        profile.get("size_level", ""),
        profile.get("trade_capability", ""),
        req.target_country,
        req.standard,
        json.dumps(
            sorted([a.model_dump() for a in req.answers], key=lambda x: x["question_id"]),
            ensure_ascii=False,
        ),
    )
    raw = "|".join(core)
    return hashlib.md5(raw.encode()).hexdigest()


def _cache_get(key: str) -> dict | None:
    """从缓存获取结果"""
    return _esg_cache.get(key)


def _cache_put(key: str, result: dict) -> None:
    """写入缓存，超过上限时 FIFO 淘汰"""
    _esg_cache[key] = result
    while len(_esg_cache) > _CACHE_MAX_SIZE:
        _esg_cache.popitem(last=False)


# ── 问卷加载 ────────────────────────────────────────────────

_questionnaire_cache: dict[str, list[dict]] = {}


def _load_questionnaire(standard: str) -> list[dict]:
    """加载问卷 JSON，destination 或 bochk"""
    if standard in _questionnaire_cache:
        return _questionnaire_cache[standard]

    filename = {
        "destination": "questionnaire_destination.json",
        "bochk": "questionnaire_bochk.json",
    }.get(standard)

    if not filename:
        raise ValueError(f"未知标准类型: {standard}")

    path = ESG_DATA_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    _questionnaire_cache[standard] = data
    return data


# ── 法规筛选 ────────────────────────────────────────────────

def _resolve_regulation_ids(
    questionnaire: list[dict],
    region: str,
    standard: str,
    answers: dict[str, str],
) -> list[str]:
    """从问卷的 regulation_mapping 字段收集相关法规 ID。

    destination 标准：regulation_mapping 是 {region: [ids]}，需检查 applicable_regions
    bochk 标准：regulation_mapping 是 flat [ids]，无地区过滤
    """
    ids = []
    for q in questionnaire:
        qid = q.get("id", "")
        if qid not in answers:
            continue

        mapping = q.get("regulation_mapping", {})

        if standard == "destination":
            # 检查问题是否适用于该地区
            applicable = q.get("applicable_regions", [])
            if region not in applicable:
                continue
            # 获取该地区对应的法规 ID 列表
            region_ids = mapping.get(region, [])
            ids.extend(region_ids)

        elif standard == "bochk":
            # bochk 的 mapping 是 flat array
            if isinstance(mapping, list):
                ids.extend(mapping)
            elif isinstance(mapping, dict):
                ids.extend(mapping.get(region, []))

    # 去重保序
    return list(dict.fromkeys(ids))


# ── 法规上下文构建 ──────────────────────────────────────────

def _build_regulation_context(regulation_ids: list[str], max_total: int = 6000) -> str:
    """对每个法规 ID 调用 get_regulation_context()，拼成 Prompt 文本。

    总长度控制在 max_total 字符以内，避免 prompt 过长导致 LLM 输出截断。
    法规数量过多时，每条法规按比例压缩。
    """
    if not regulation_ids:
        return ""

    # 每条法规的上限 = 总上限 / 法规数，最少 200 字
    per_max = max(200, max_total // len(regulation_ids))

    parts = []
    total_len = 0
    for rid in regulation_ids:
        ctx = get_regulation_context(rid, max_len=per_max)
        if ctx:
            parts.append(f"--- 法规 {rid} ---\n{ctx}")
            total_len += len(ctx) + 20  # 20 = 分隔行的大致长度
        else:
            logger.warning(f"法规 {rid} 无内容，跳过")

        if total_len >= max_total:
            logger.info(f"法规上下文已达 {max_total} 字符上限，截断剩余法规")
            break

    return "\n\n".join(parts)


# ── 基础分计算 ──────────────────────────────────────────────

def _compute_base_score(
    answers: dict[str, str],
    questionnaire: list[dict],
    region: str,
    standard: str,
) -> tuple[int, dict[str, int]]:
    """从问卷选项的 score 值计算 E/S/G 加权总分。

    每题 0/1/2 (not_met/partial/met)
    加权：E 30% / S 35% / G 35%
    缺类按比例重分配权重
    返回 (overall_score, {"E": 45, "S": 72, "G": 60})
    """
    # 构建 question_id → question dict 查找表
    q_map = {q["id"]: q for q in questionnaire}

    # 按 category 累加 actual / max
    category_scores: dict[str, list[int]] = {}  # cat → [actual, max]

    for qid, answer_value in answers.items():
        q = q_map.get(qid)
        if not q:
            continue

        # 检查适用性
        if standard == "destination":
            applicable = q.get("applicable_regions", [])
            if region not in applicable:
                continue

        # 查找选项得分
        score = 0
        for opt in q.get("options", []):
            if opt.get("value") == answer_value:
                score = opt.get("score", 0)
                break

        cat = q.get("category", "G")
        if cat not in category_scores:
            category_scores[cat] = [0, 0]
        category_scores[cat][0] += score
        category_scores[cat][1] += 2  # 每题满分 2

    if not category_scores:
        return 30, {}  # 无有效回答时给个基础分

    # 计算各类别百分比
    category_pcts = {}
    for cat, (actual, max_val) in category_scores.items():
        if max_val > 0:
            category_pcts[cat] = actual / max_val * 100
        else:
            category_pcts[cat] = 0

    # 计算加权总分（缺类重分配权重）
    present_cats = set(category_pcts.keys())
    present_weight_sum = sum(CATEGORY_WEIGHTS.get(c, 0) for c in present_cats)

    if present_weight_sum == 0:
        return 30, {}

    weighted_score = 0
    for cat in present_cats:
        base_weight = CATEGORY_WEIGHTS.get(cat, 0)
        normalized_weight = base_weight / present_weight_sum
        weighted_score += category_pcts[cat] * normalized_weight

    # 百分比取整
    rounded_pcts = {cat: round(pct) for cat, pct in category_pcts.items()}

    return round(max(0, min(100, weighted_score))), rounded_pcts


def _score_to_grade(score: int) -> str:
    """将数值分数映射为等级 A/B/C"""
    if score >= 80:
        return "A"
    if score >= 60:
        return "B"
    return "C"


# ── Prompt 构建 ─────────────────────────────────────────────

def _build_answers_summary(answers: list, questionnaire: list[dict]) -> str:
    """将问卷回答格式化为可读文本"""
    q_map = {q["id"]: q for q in questionnaire}
    lines = []
    for a in answers:
        q = q_map.get(a.question_id)
        if q:
            lines.append(f"Q({a.question_id}): {q.get('question', '')}")
            lines.append(f"A: {a.answer}")
            lines.append("")
    return "\n".join(lines)


def _build_messages(
    req,
    questionnaire: list[dict],
    regulation_context: str,
    base_score: int,
    region: str,
    retry_error: str | None = None,
) -> list[dict]:
    """组装约束式 Prompt messages 列表"""
    profile_json = json.dumps(req.profile or {}, ensure_ascii=False)
    answers_summary = _build_answers_summary(req.answers, questionnaire)
    country_display = COUNTRY_DISPLAY.get(region, req.target_country)
    standard_display = STANDARD_DISPLAY.get(req.standard, req.standard)

    user_content = "\n".join([
        RULES,
        "",
        SCORING,
        "",
        OUTPUT_FORMAT,
        "",
        USER_TEMPLATE.format(
            profile=profile_json,
            country_display=country_display,
            standard_display=standard_display,
            answers_summary=answers_summary,
            regulation_context=regulation_context,
            base_score=base_score,
        ),
    ])

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        # Few-shot 示例
        {"role": "user", "content": FEWSHOT_USER},
        {"role": "assistant", "content": FEWSHOT_ASSISTANT},
        # 真实请求
        {"role": "user", "content": user_content},
    ]

    # 重试时追加错误提示
    if retry_error:
        messages.append({"role": "assistant", "content": retry_error})
        messages.append({"role": "user", "content": RETRY_HINT})

    return messages


# ── LLM JSON 解析（含修复逻辑） ────────────────────────────────

import re


def _parse_llm_json(raw: str) -> dict:
    """解析 LLM 返回的 JSON，支持多种修复策略。

    1. 直接 json.loads
    2. 提取 ```json ... ``` 代码块
    3. 查找第一个 { 到最后一个 } 的子串
    4. 截断修复：补全未闭合的字符串/数组/对象
    """
    raw = raw.strip()

    # 策略 1：直接解析
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # 策略 2：提取 markdown 代码块
    code_block = re.search(r"```(?:json)?\s*\n?(.*?)```", raw, re.DOTALL)
    if code_block:
        try:
            return json.loads(code_block.group(1).strip())
        except json.JSONDecodeError:
            pass

    # 策略 3：提取第一个 { 到最后一个 }
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        substring = raw[start:end + 1]
        try:
            return json.loads(substring)
        except json.JSONDecodeError:
            # 策略 4：截断修复
            return _repair_truncated_json(substring)

    raise json.JSONDecodeError("无法从 LLM 输出中提取有效 JSON", raw, 0)


def _repair_truncated_json(s: str) -> dict:
    """修复被截断的 JSON：补全未闭合的字符串、数组、对象。

    常见场景：LLM 输出 token 不够，JSON 在某个字段值中间被截断。
    策略：从末尾向前找到最后一个完整的 gap 对象，截断并补全。
    """
    # 尝试直接修复：逐层闭合
    repaired = s.rstrip()

    # 去掉末尾的尾部逗号
    repaired = repaired.rstrip().rstrip(",")

    # 计算未闭合的括号/引号，尝试补全
    # 找到最后一个完整的 key-value 对
    # 策略：找到最后一个 "estimated_time" 或 "difficulty" 字段结束的位置
    # （这些是 gap 对象的尾部字段）

    # 先尝试找到最后一个完整的 }, 然后补全外层结构
    last_complete_obj = repaired.rfind("}")
    if last_complete_obj < 0:
        raise json.JSONDecodeError("JSON 无闭合对象", s, 0)

    # 截取到最后一个完整的 } 之后，尝试补全
    truncated = repaired[:last_complete_obj + 1]

    # 计算需要闭合的层级
    open_braces = truncated.count("{") - truncated.count("}")
    open_brackets = truncated.count("[") - truncated.count("]")

    # 补全闭合
    truncated += "]" * max(open_brackets, 0)
    truncated += "}" * max(open_braces, 0)

    try:
        result = json.loads(truncated)
        logger.info(f"JSON 截断修复成功: 原始长度={len(s)}, 修复后长度={len(truncated)}")
        return result
    except json.JSONDecodeError:
        pass

    # 最后手段：找所有完整 gap 对象，手动拼装
    gap_pattern = re.compile(
        r'\{\s*"regulation"\s*:.*?"estimated_time"\s*:\s*"[^"]*"\s*\}',
        re.DOTALL,
    )
    gaps_found = gap_pattern.findall(truncated)
    if gaps_found:
        # 尝试解析每个 gap
        valid_gaps = []
        for g in gaps_found:
            try:
                valid_gaps.append(json.loads(g))
            except json.JSONDecodeError:
                continue
        if valid_gaps:
            # 从截断文本中提取 overall_score
            score_match = re.search(r'"overall_score"\s*:\s*(\d+)', truncated)
            score = int(score_match.group(1)) if score_match else 50
            # 提取 roadmap 和 disclaimer
            roadmap_match = re.search(r'"roadmap"\s*:\s*"([^"]*)"', truncated)
            disclaimer_match = re.search(r'"disclaimer"\s*:\s*"([^"]*)"', truncated)
            return {
                "overall_score": score,
                "gaps": valid_gaps,
                "roadmap": roadmap_match.group(1) if roadmap_match else "请基于上述分析制定改善计划。",
                "disclaimer": disclaimer_match.group(1) if disclaimer_match else "以上分析由AI生成，仅供参考，不构成法律或合规建议。",
            }

    raise json.JSONDecodeError("JSON 修复失败", s, 0)


# ── 响应校验 ────────────────────────────────────────────────

_GAP_REQUIRED_FIELDS = {
    "regulation", "category", "status", "source_text", "source_ref",
    "ai_judgment", "confidence", "gap_description", "suggestion",
    "suggestion_confidence", "difficulty", "estimated_time",
}

_VALID_CATEGORIES = {"E", "S", "G"}
_VALID_STATUSES = {"red", "yellow", "green"}
_VALID_CONFIDENCES = {"high", "medium", "low"}


def _validate_response(data: dict) -> tuple[bool, str]:
    """校验 LLM 返回的 ESG 分析 JSON（宽容模式：缺失的文本字段自动补全）"""
    # 顶层字段
    if "overall_score" not in data:
        return False, "缺少 overall_score"
    if not isinstance(data["overall_score"], (int, float)) or not (0 <= data["overall_score"] <= 100):
        # 尝试将 float 转为 int
        try:
            data["overall_score"] = int(data["overall_score"])
        except (ValueError, TypeError):
            return False, f"overall_score 无效: {data['overall_score']}"

    if "gaps" not in data or not isinstance(data["gaps"], list):
        return False, "缺少或 gaps 不是数组"
    if len(data["gaps"]) == 0:
        return False, "gaps 不能为空"

    # 自动补全可能被截断的文本字段
    if "roadmap" not in data or not isinstance(data.get("roadmap"), str) or not data.get("roadmap"):
        data["roadmap"] = "请基于上述缺口分析，按由易到难顺序分阶段制定改善计划。"
    if "disclaimer" not in data or not isinstance(data.get("disclaimer"), str) or not data.get("disclaimer"):
        data["disclaimer"] = "以上分析由AI生成，仅供参考，不构成法律或合规建议。"

    # 每个 gap 的字段（宽容模式：缺失字段用默认值填充）
    for i, gap in enumerate(data["gaps"]):
        # 填充缺失的可选文本字段
        for field, default in [
            ("source_text", "（法规原文未完整引用）"),
            ("source_ref", "（来源待补充）"),
            ("ai_judgment", "（判断说明待补充）"),
            ("gap_description", "（缺口描述待补充）"),
            ("suggestion", "（建议待补充）"),
            ("estimated_time", "时间待评估"),
            ("difficulty", "中等"),
        ]:
            if field not in gap or not gap[field]:
                gap[field] = default

        # 校验必须的枚举字段
        missing = _GAP_REQUIRED_FIELDS - set(gap.keys())
        if missing:
            return False, f"第 {i + 1} 个 gap 缺少字段: {missing}"

        if gap.get("category") not in _VALID_CATEGORIES:
            return False, f"第 {i + 1} 个 gap category 无效: {gap['category']}"
        if gap.get("status") not in _VALID_STATUSES:
            return False, f"第 {i + 1} 个 gap status 无效: {gap['status']}"
        if gap.get("confidence") not in _VALID_CONFIDENCES:
            gap["confidence"] = "medium"
        if gap.get("suggestion_confidence") not in _VALID_CONFIDENCES:
            gap["suggestion_confidence"] = "medium"

    return True, ""


# ── Mock 降级 ───────────────────────────────────────────────

MOCK_FALLBACK = {
    "overall_score": 45,
    "category_scores": {"E": 30, "S": 55, "G": 60},
    "grade": "C",
    "gaps": [
        {
            "regulation": "碳排放报告",
            "category": "E",
            "status": "red",
            "source_text": "根据泰国 SEC ESG 信息披露指引，上市公司及大型企业需按年度披露范围一和范围二的温室气体排放数据。",
            "source_ref": "泰国 SEC ESG 指引 第3.2条",
            "ai_judgment": "不满足",
            "confidence": "high",
            "gap_description": "企业未建立碳排放核算体系，无法提供符合要求的排放报告",
            "suggestion": "建议聘请第三方碳核查机构，建立 ISO 14064 碳排放核算体系",
            "suggestion_confidence": "medium",
            "difficulty": "中等",
            "estimated_time": "3-6个月",
        },
        {
            "regulation": "劳工权益保护",
            "category": "S",
            "status": "yellow",
            "source_text": "泰国劳动保护法要求企业为员工提供社会保险和工作安全培训。",
            "source_ref": "泰国劳动保护法 B.E.2541 第22条",
            "ai_judgment": "部分满足",
            "confidence": "medium",
            "gap_description": "企业有基本社保但缺乏系统的安全培训记录",
            "suggestion": "建立员工安全培训档案，定期开展职业健康培训",
            "suggestion_confidence": "high",
            "difficulty": "容易",
            "estimated_time": "1-2个月",
        },
        {
            "regulation": "公司治理结构",
            "category": "G",
            "status": "green",
            "source_text": "泰国 SEC 要求企业建立基本的公司治理框架，包括董事会组成和信息披露机制。",
            "source_ref": "泰国 SEC 公司治理指引 第2.1条",
            "ai_judgment": "基本满足",
            "confidence": "high",
            "gap_description": "企业已建立基本治理结构，但独立董事比例可优化",
            "suggestion": "考虑引入1-2名独立董事，完善董事会 diversity",
            "suggestion_confidence": "medium",
            "difficulty": "容易",
            "estimated_time": "1-3个月",
        },
    ],
    "roadmap": "建议分三阶段推进：第一阶段(1-2月)完善劳工权益和治理结构；第二阶段(3-4月)建立碳排放核算体系；第三阶段(5-6月)完成首份 ESG 报告编制。",
    "disclaimer": "以上分析由AI生成，仅供参考，不构成法律或合规建议。（降级模式：LLM 服务不可用，显示示例数据）",
}


def _get_mock_fallback(req) -> dict:
    """返回 Mock 降级数据，填充请求中的国家/标准"""
    import copy
    result = copy.deepcopy(MOCK_FALLBACK)
    region = COUNTRY_MAP.get(req.target_country, "")
    result["country"] = COUNTRY_DISPLAY.get(region, req.target_country)
    result["standard"] = req.standard
    return result


# ── 主入口 ──────────────────────────────────────────────────

async def analyze_esg(req) -> dict:
    """
    ESG 合规缺口分析主入口。

    流程：国家映射 → 缓存检查 → 加载问卷 → 筛选法规 → 构建上下文
          → 计算基础分 → LLM 重试循环(3x) → 校验 → 缓存 → 返回

    全部失败则 Mock 降级。
    """
    # 1. 国家代码映射
    region = COUNTRY_MAP.get(req.target_country)
    if not region:
        logger.warning(f"未知目标国家: {req.target_country}")
        return {
            "overall_score": 0,
            "category_scores": {},
            "grade": "C",
            "country": req.target_country,
            "standard": req.standard,
            "gaps": [],
            "roadmap": f"暂不支持 {req.target_country} 的 ESG 分析",
            "disclaimer": "不支持的国家或地区。",
        }

    # 2. 缓存检查
    cache_k = _cache_key(req)
    cached = _cache_get(cache_k)
    if cached:
        logger.info(f"ESG 分析命中缓存: {req.target_country}/{req.standard}")
        return cached

    # 3. 加载问卷
    try:
        questionnaire = _load_questionnaire(req.standard)
    except ValueError as e:
        logger.error(f"加载问卷失败: {e}")
        return _get_mock_fallback(req)

    # 4. 构建回答字典
    answers_dict = {a.question_id: a.answer for a in req.answers}

    # 没有回答则无法分析
    if not answers_dict:
        region_display = COUNTRY_DISPLAY.get(region, req.target_country)
        standard_display = STANDARD_DISPLAY.get(req.standard, req.standard)
        return {
            "overall_score": 0,
            "category_scores": {},
            "grade": "C",
            "country": region_display,
            "standard": req.standard,
            "gaps": [],
            "roadmap": f"请先完成 {standard_display} 问卷后再进行分析。",
            "disclaimer": "以上分析由AI生成，仅供参考，不构成法律或合规建议。",
        }

    # 5. 筛选相关法规
    regulation_ids = _resolve_regulation_ids(questionnaire, region, req.standard, answers_dict)

    if not regulation_ids:
        logger.warning(f"未找到相关法规: {req.target_country}/{req.standard}")
        region_display = COUNTRY_DISPLAY.get(region, req.target_country)
        return {
            "overall_score": 0,
            "category_scores": {},
            "grade": "C",
            "country": region_display,
            "standard": req.standard,
            "gaps": [],
            "roadmap": f"当前问卷回答未匹配到 {COUNTRY_DISPLAY.get(region)} 的具体法规，请确认问卷是否完整。",
            "disclaimer": "以上分析由AI生成，仅供参考，不构成法律或合规建议。",
        }

    logger.info(f"筛选到 {len(regulation_ids)} 条法规: {regulation_ids}")

    # 6. 构建法规上下文
    regulation_context = _build_regulation_context(regulation_ids)

    # 7. 计算基础分 + 分类得分
    base_score, category_scores = _compute_base_score(answers_dict, questionnaire, region, req.standard)

    # 8. LLM 重试循环
    retry_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            messages = _build_messages(
                req, questionnaire, regulation_context,
                base_score, region, retry_error,
            )
            raw = await llm_client.call_kimi(messages, temperature=0.3)

            # 解析 JSON（含修复逻辑）
            result = _parse_llm_json(raw)

            # 校验格式
            ok, err = _validate_response(result)
            if ok:
                # 补充元数据
                result["country"] = COUNTRY_DISPLAY.get(region, req.target_country)
                result["standard"] = req.standard
                result["category_scores"] = category_scores
                result["grade"] = _score_to_grade(result["overall_score"])
                # 缓存
                _cache_put(cache_k, result)
                logger.info(
                    f"ESG 分析成功 (第 {attempt} 次): "
                    f"{req.target_country}/{req.standard}, "
                    f"score={result['overall_score']}, "
                    f"gaps={len(result['gaps'])}"
                )
                return result

            retry_error = raw
            logger.warning(f"ESG 分析校验失败 (第 {attempt} 次): {err}")

        except json.JSONDecodeError as e:
            retry_error = raw if "raw" in dir() else str(e)
            logger.warning(f"ESG JSON 解析失败 (第 {attempt} 次): {e}")

        except Exception as e:
            retry_error = str(e)
            logger.warning(f"ESG LLM 调用失败 (第 {attempt} 次): {e}")

    # 9. 全部失败，Mock 降级
    logger.error(f"ESG 分析 {MAX_RETRIES} 次全部失败，返回 Mock 降级: {req.target_country}/{req.standard}")
    return _get_mock_fallback(req)
