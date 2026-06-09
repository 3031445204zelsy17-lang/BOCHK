"""Step 4 服务匹配 — 业务逻辑层

规则引擎打分 → 筛选 top 产品 → LLM 生成推荐理由
含重试机制（3 次）和 Mock 降级兜底
"""

import json
import logging
from pathlib import Path

from app.services.llm_client import llm_client
from app.prompts.matching_prompt import (
    SYSTEM_PROMPT,
    RULES,
    FEWSHOT_USER,
    FEWSHOT_ASSISTANT,
    USER_TEMPLATE,
    OUTPUT_FORMAT,
    RETRY_HINT,
)

logger = logging.getLogger(__name__)

# 产品数据路径
PRODUCTS_PATH = Path(__file__).parent.parent / "data" / "bochk_products.json"

# 出海经验 → export_stages 映射
_EXPORT_STAGE_MAP = {
    "低": "无",
    "中": "计划中",
    "高": "有出海经验",
}

# 行业关键词匹配表（profile 的 industry_tags → 产品的 industries）
_INDUSTRY_ALIASES = {
    "电子制造": "电子制造",
    "消费电子": "电子制造",
    "电子元器件": "电子制造",
    "纺织制造": "纺织制造",
    "纺织": "纺织制造",
    "服装": "纺织制造",
    "家居制造": "家居制造",
    "家居": "家居制造",
    "家具": "家居制造",
    "贸易": "贸易",
    "零售": "零售",
    "消费品": "消费品",
    "机械制造": "机械制造",
    "新能源": "新能源",
    "环保科技": "环保科技",
}

MAX_RETRIES = 3


def _load_products() -> list[dict]:
    """加载产品数据"""
    with open(PRODUCTS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _match_industry(tag: str, product_industries: list[str]) -> bool:
    """检查企业行业标签是否匹配产品的适用行业"""
    alias = _INDUSTRY_ALIASES.get(tag)
    if alias and alias in product_industries:
        return True
    # 直接匹配
    return tag in product_industries


def _score_product(product: dict, profile: dict) -> int:
    """
    规则引擎打分：基于企业画像对单个产品计算匹配度（0-100）

    5 个维度，总分 100：
    - 行业匹配：0-30 分（按标签匹配比例，不是全有或全无）
    - 规模匹配：0-20 分
    - 出海阶段匹配：0-20 分
    - 贸易能力 × 产品类型亲和度：0-15 分
    - 出海市场多样性 × 产品类型：0-15 分
    """
    score = 0
    suitable = product.get("suitable_for", {})
    category = product.get("category", "")

    # ── 行业匹配（0-30）：按标签匹配比例计算 ──
    industry_tags = profile.get("industry_tags", [])
    product_industries = suitable.get("industries", [])
    if industry_tags:
        matched = sum(1 for tag in industry_tags if _match_industry(tag, product_industries))
        score += int(30 * matched / len(industry_tags))

    # ── 规模匹配（0-20）──
    size_level = profile.get("size_level", "")
    product_sizes = suitable.get("sizes", [])
    if size_level in product_sizes:
        score += 20

    # ── 出海阶段匹配（0-20）──
    trade_cap = profile.get("trade_capability", "")
    export_stage = _EXPORT_STAGE_MAP.get(trade_cap, "无")
    product_stages = suitable.get("export_stages", [])
    if export_stage in product_stages:
        score += 20

    # ── 贸易能力 × 产品类型亲和度（0-15）──
    # 高贸易能力 → 偏好贸易/外汇/供应链类产品
    # 中/低贸易能力 → 偏好营运/担保/数字化类产品
    _TRADE_HIGH = {"贸易服务": 15, "外汇服务": 14, "供应链金融": 12, "可持续金融": 10, "科技金融": 8, "担保融资": 7, "营运融资": 6, "电商融资": 5}
    _TRADE_MID = {"营运融资": 13, "担保融资": 12, "科技金融": 11, "电商融资": 10, "供应链金融": 9, "可持续金融": 8, "贸易服务": 7, "外汇服务": 5}
    _TRADE_LOW = {"营运融资": 15, "担保融资": 14, "科技金融": 13, "电商融资": 10, "供应链金融": 8, "可持续金融": 6, "贸易服务": 4, "外汇服务": 3}
    if trade_cap == "高":
        score += _TRADE_HIGH.get(category, 5)
    elif trade_cap == "中":
        score += _TRADE_MID.get(category, 5)
    else:
        score += _TRADE_LOW.get(category, 5)

    # ── 出海市场多样性 × 产品类型（0-15）──
    # 多市场 → 偏好外汇/贸易类；单/无市场 → 偏好营运/担保类
    export_markets = profile.get("export_markets", [])
    market_count = len(export_markets)
    if market_count >= 2:
        _MULTI_MARKET = {"外汇服务": 15, "贸易服务": 14, "供应链金融": 11, "可持续金融": 9, "科技金融": 8, "电商融资": 7, "营运融资": 6, "担保融资": 5}
        score += _MULTI_MARKET.get(category, 5)
    elif market_count == 1:
        _SINGLE_MARKET = {"贸易服务": 13, "营运融资": 11, "电商融资": 10, "供应链金融": 9, "科技金融": 8, "担保融资": 7, "外汇服务": 6, "可持续金融": 5}
        score += _SINGLE_MARKET.get(category, 5)
    else:
        _NO_MARKET = {"营运融资": 14, "担保融资": 13, "科技金融": 12, "电商融资": 9, "供应链金融": 6, "可持续金融": 5, "贸易服务": 3, "外汇服务": 2}
        score += _NO_MARKET.get(category, 5)

    return min(100, score)


def score_all_products(profile: dict) -> list[tuple[dict, int]]:
    """
    对所有产品打分，返回 [(product, score)] 按分数降序排列
    """
    products = _load_products()
    scored = []
    for product in products:
        score = _score_product(product, profile)
        scored.append((product, score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


def _build_llm_payload(profile: dict, top_products: list[tuple[dict, int]]) -> str:
    """组装发给 LLM 的产品列表（精简版，去掉 suitable_for 等内部字段）"""
    items = []
    for product, score in top_products:
        items.append({
            "product_id": product["id"],
            "product_name": product["name"],
            "match_score": score,
            "amount_range": product["amount_range"],
            "category": product["category"],
            "description": product["description"],
        })
    return json.dumps(items, ensure_ascii=False)


def _build_messages(
    profile: dict,
    top_products: list[tuple[dict, int]],
    retry_error: str | None = None,
) -> list[dict]:
    """组装约束式 Prompt messages 列表"""
    products_json = _build_llm_payload(profile, top_products)
    profile_json = json.dumps(profile, ensure_ascii=False)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        # Few-shot 示例
        {"role": "user", "content": FEWSHOT_USER},
        {"role": "assistant", "content": FEWSHOT_ASSISTANT},
        # 真实请求
        {
            "role": "user",
            "content": "\n".join(
                [
                    RULES,
                    "",
                    OUTPUT_FORMAT,
                    "",
                    USER_TEMPLATE.format(
                        profile=profile_json,
                        products=products_json,
                    ),
                ]
            ),
        },
    ]

    # 重试时追加错误提示
    if retry_error:
        messages.append({"role": "assistant", "content": retry_error})
        messages.append({"role": "user", "content": RETRY_HINT})

    return messages


def _validate_recommendations(data: list[dict], expected_ids: list[str]) -> tuple[bool, str]:
    """校验 LLM 返回的推荐列表格式（只校验 LLM 负责的字段：product_id, reason, advice）"""
    if not isinstance(data, list):
        return False, "返回值不是数组"

    if len(data) != len(expected_ids):
        return False, f"产品数量不匹配: 期望 {len(expected_ids)}, 实际 {len(data)}"

    # LLM 只需要返回 product_id + reason + advice，其他字段从产品数据合并
    required_fields = {"product_id", "reason", "advice"}
    for i, item in enumerate(data):
        missing = required_fields - set(item.keys())
        if missing:
            return False, f"第 {i + 1} 个产品缺少字段: {missing}"

        if item.get("product_id") != expected_ids[i]:
            return False, f"第 {i + 1} 个产品 ID 不匹配: 期望 {expected_ids[i]}, 实际 {item.get('product_id')}"

    return True, ""


def _enrich_recommendations(
    recommendations: list[dict], top_products: list[tuple[dict, int]]
) -> list[dict]:
    """将产品详情合并进推荐结果（LLM 只负责 reason+advice，其余全从产品数据补充）"""
    product_map = {p["id"]: (p, s) for p, s in top_products}

    enriched = []
    for rec in recommendations:
        product, score = product_map.get(rec["product_id"], ({}, 0))
        enriched.append({
            "product_id": rec["product_id"],
            "product_name": product.get("name", rec.get("product_name", "")),
            "match_score": score,
            "amount_range": product.get("amount_range", ""),
            "reason": rec.get("reason", ""),
            "advice": rec.get("advice", ""),
            "category": product.get("category", ""),
            "description": product.get("description", ""),
            "key_features": product.get("key_features", []),
            "required_docs": product.get("required_docs", []),
        })
    return enriched


def _get_mock_recommendations(profile: dict) -> list[dict]:
    """Mock 降级：基于规则引擎分数生成推荐（含产品详情）"""
    scored = score_all_products(profile)
    top = scored[:4]
    return [
        {
            "product_id": product["id"],
            "product_name": product["name"],
            "match_score": score,
            "amount_range": product["amount_range"],
            "reason": f"基于贵司在{profile.get('industry_tags', ['未知'])[0]}领域的背景，{product['name']}({product['category']})可提供针对性的金融服务支持。",
            "advice": f"建议准备{product['category']}相关材料，咨询BOCHK客户经理了解具体申请流程。",
            "category": product["category"],
            "description": product["description"],
            "key_features": product.get("key_features", []),
            "required_docs": product.get("required_docs", []),
        }
        for product, score in top
    ]


async def recommend_products(profile: dict) -> dict:
    """
    生成产品推荐：规则引擎打分 → 筛选 top 产品 → LLM 生成推荐理由 → 合并产品详情

    重试最多 MAX_RETRIES 次，全部失败则返回 mock 兜底数据
    """
    # 1. 规则引擎打分，取 top 4（过滤 0 分产品）
    scored = score_all_products(profile)
    top = [(p, s) for p, s in scored if s > 0][:4]

    # 没有匹配的产品，返回空
    if not top:
        logger.warning(f"无匹配产品: {profile.get('industry_tags', [])}")
        return {"recommendations": []}

    expected_ids = [p["id"] for p, _ in top]
    retry_error = None

    # 2. LLM 生成个性化推荐理由
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            messages = _build_messages(profile, top, retry_error)
            raw = await llm_client.call_kimi(messages, temperature=0.3)

            # 解析 JSON
            result = json.loads(raw)

            # 校验格式
            ok, err = _validate_recommendations(result, expected_ids)
            if ok:
                # 合并产品详情
                enriched = _enrich_recommendations(result, top)
                logger.info(f"产品推荐生成成功 (第 {attempt} 次)")
                return {"recommendations": enriched}

            retry_error = raw
            logger.warning(f"推荐结果校验失败 (第 {attempt} 次): {err}")

        except json.JSONDecodeError as e:
            retry_error = raw if "raw" in dir() else str(e)
            logger.warning(f"JSON 解析失败 (第 {attempt} 次): {e}")

        except Exception as e:
            logger.warning(f"LLM 调用失败 (第 {attempt} 次): {e}")

    # 3. LLM 全部失败，用规则引擎结果兜底
    logger.error(f"推荐理由生成 {MAX_RETRIES} 次全部失败，返回规则引擎兜底")
    return {"recommendations": _get_mock_recommendations(profile)}
