"""MD 法规文件解析器 — frontmatter 提取 + section 拆分 + 引用追踪

将 71 个结构化 MD 文件解析为 MDContent dataclass，
供 ESG 分析服务(P5-3)加载法规详情、生成 LLM prompt 上下文。

不依赖第三方 YAML 库，仅使用 Python 标准库。
"""

import json
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── 数据目录 ────────────────────────────────────────────────
ESG_DATA_DIR = Path(__file__).parent.parent / "data" / "esg"
DETAILS_DIR = ESG_DATA_DIR / "details"
INDEX_DIR = ESG_DATA_DIR / "index"

MAX_EXCERPT_LEN = 500  # 引用追踪截断长度（字符）

# ── 模块级缓存（按需加载，只解析一次） ──────────────────────
_cache: dict[str, "MDContent"] = {}


# ── 数据结构 ────────────────────────────────────────────────

@dataclass
class MDContent:
    """解析后的 MD 文件结构"""
    id: str
    frontmatter: dict                     # YAML 字段字典
    sections: dict[str, str]              # section 标题 → 正文内容
    checklists: list[str] = field(default_factory=list)   # 合规检查项
    quotes: list[dict] = field(default_factory=list)       # [{"text": ..., "source": ...}]
    related_refs: list[str] = field(default_factory=list)  # ["sg_010", "sg_011"]


# ── 基础解析函数 ─────────────────────────────────────────────

def parse_frontmatter(content: str) -> tuple[dict, str]:
    """从 MD 内容分离 frontmatter 和正文。

    手写 YAML 子集解析器，仅支持本项目的简单标量和行内列表。
    不依赖第三方库。

    Returns:
        (frontmatter_dict, body_text)
    """
    # 匹配首尾 ---
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)", content, re.DOTALL)
    if not match:
        logger.warning("无法识别 frontmatter 格式，返回空字典")
        return {}, content

    fm_text = match.group(1)
    body = match.group(2)

    result = {}
    for line in fm_text.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        # 在第一个 : 处分割键值
        colon_pos = line.find(":")
        if colon_pos == -1:
            continue

        key = line[:colon_pos].strip()
        value = line[colon_pos + 1:].strip()

        if not value:
            result[key] = ""
            continue

        # 行内列表 [a, b, c] — 无引号，本项目特有格式
        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            if inner:
                # 按逗号分割，去除首尾空格
                result[key] = [item.strip() for item in inner.split(",") if item.strip()]
            else:
                result[key] = []
            continue

        # 带引号的字符串
        if (value.startswith('"') and value.endswith('"')) or \
           (value.startswith("'") and value.endswith("'")):
            result[key] = value[1:-1]
            continue

        # 普通标量
        result[key] = value

    return result, body


def split_sections(body: str) -> dict[str, str]:
    """按 ## H2 标题拆分正文为 section 字典。

    H3 子标题、表格等保留在所属 H2 section 内。
    标题中的 HTML 注释会被去除以获得纯净标题名。
    """
    # 匹配所有 ## 标题行
    pattern = re.compile(r"^## (.+)$", re.MULTILINE)
    matches = list(pattern.finditer(body))

    if not matches:
        return {}

    sections = {}
    for i, match in enumerate(matches):
        # 去掉 HTML 注释，获得纯净标题
        raw_title = match.group(1).strip()
        clean_title = re.sub(r"\s*<!--.*?-->\s*", "", raw_title).strip()

        # section 正文 = 从标题行之后到下一个 ## 标题之前
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        sections[clean_title] = body[start:end].strip()

    return sections


def extract_checklists(text: str) -> list[str]:
    """从「合规检查项」section 提取 checkbox 列表项。

    输入: "- [ ] 发行人是否..."
    输出: ["发行人是否..."]
    """
    items = []
    for line in text.split("\n"):
        # 匹配 - [ ] 或 - [x] 开头的行
        match = re.match(r"^\s*- \[[ x]\]\s*(.+)", line)
        if match:
            items.append(match.group(1).strip())
    return items


def extract_quotes(text: str) -> list[dict]:
    """从「法规原文摘要」section 提取 blockquote 和来源。

    每个 blockquote 可能是多行（连续 > 开头的行）。
    来源行格式: "> —— 来源：..." 或 "—— 来源：..." 或 "> ——（...）"

    Returns:
        [{"text": "引用原文", "source": "来源标注"}]
    """
    quotes = []
    current_text_lines = []
    current_source = ""

    lines = text.split("\n")

    for line in lines:
        stripped = line.strip()

        # 来源行：> —— 来源： 或 —— 来源： 或 > ——（
        source_match = re.match(r"^>?\s*——\s*(?:来源[：:]\s*)?(.+)", stripped)
        if source_match and current_text_lines:
            current_source = source_match.group(1).strip()
            continue

        # blockquote 行：> 开头
        if stripped.startswith(">"):
            content = stripped[1:].strip()
            # 跳过纯来源行
            if content.startswith("——"):
                if current_text_lines:
                    source_inner = re.sub(r"^——\s*(?:来源[：:]\s*)?", "", content).strip()
                    if source_inner:
                        current_source = source_inner
                continue
            current_text_lines.append(content)
            continue

        # 空行或非 > 行：如果前面有积累的 quote，保存
        if current_text_lines:
            quote_text = " ".join(current_text_lines)
            if quote_text:
                quotes.append({
                    "text": quote_text,
                    "source": current_source,
                })
            current_text_lines = []
            current_source = ""

    # 处理末尾剩余
    if current_text_lines:
        quote_text = " ".join(current_text_lines)
        if quote_text:
            quotes.append({
                "text": quote_text,
                "source": current_source,
            })

    return quotes


def extract_related_refs(text: str) -> list[str]:
    """从「相关法规」section 提取引用的 MD 文件 ID。

    输入: "- details/sg_010.md"
    输出: ["sg_010"]
    """
    refs = []
    for line in text.split("\n"):
        match = re.match(r"^\s*-\s+details/([a-z_]+\d+)\.md", line.strip())
        if match:
            refs.append(match.group(1))
    return refs


# ── 组合解析 ─────────────────────────────────────────────────

def parse_md_file(md_path: Path) -> Optional[MDContent]:
    """解析单个 MD 文件，返回结构化内容。"""
    if not md_path.exists():
        logger.warning(f"MD 文件不存在: {md_path}")
        return None

    content = md_path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(content)
    sections = split_sections(body)

    md_id = fm.get("id", md_path.stem)

    # 提取各 section 的结构化内容
    checklists = extract_checklists(sections.get("合规检查项", ""))
    quotes = extract_quotes(sections.get("法规原文摘要", ""))
    related_refs = extract_related_refs(sections.get("相关法规", ""))

    return MDContent(
        id=md_id,
        frontmatter=fm,
        sections=sections,
        checklists=checklists,
        quotes=quotes,
        related_refs=related_refs,
    )


def load_regulation(regulation_id: str) -> Optional[MDContent]:
    """根据法规 ID 加载并解析 MD 文件（带缓存）。

    Args:
        regulation_id: 如 "hk_001", "sg_013", "bochk_gf_010"

    Returns:
        MDContent 或 None（文件不存在时）
    """
    if regulation_id in _cache:
        return _cache[regulation_id]

    md_path = DETAILS_DIR / f"{regulation_id}.md"
    result = parse_md_file(md_path)

    if result:
        _cache[regulation_id] = result

    return result


# ── LLM Prompt 用接口 ────────────────────────────────────────

def get_excerpt(regulation_id: str, max_len: int = MAX_EXCERPT_LEN) -> str:
    """获取法规关键内容摘要（用于 LLM prompt 引用）。

    拼接顺序：title + 合规检查项 + SME 常见差距
    总长度控制在 max_len 字符以内。
    """
    md = load_regulation(regulation_id)
    if not md:
        return ""

    parts = []

    # 标题
    title = md.frontmatter.get("title", "")
    if title:
        parts.append(f"【{title}】")

    # 合规检查项
    if md.checklists:
        parts.append("检查项: " + "；".join(md.checklists))

    # SME 常见差距
    gaps_text = md.sections.get("SME 常见差距", "")
    if gaps_text:
        # 去掉 HTML 注释和多余空白
        clean = re.sub(r"\s*<!--.*?-->\s*", "", gaps_text).strip()
        clean = re.sub(r"\n{2,}", "\n", clean)
        if clean:
            parts.append("常见差距: " + clean)

    excerpt = "\n".join(parts)

    # 截断
    if len(excerpt) > max_len:
        excerpt = excerpt[:max_len - 3] + "..."

    return excerpt


def batch_excerpts(regulation_ids: list[str]) -> dict[str, str]:
    """批量获取多个法规的摘要。

    Returns:
        {regulation_id: excerpt_text}，跳过不存在的 ID
    """
    result = {}
    for rid in regulation_ids:
        excerpt = get_excerpt(rid)
        if excerpt:
            result[rid] = excerpt
    return result


# ── 索引查询 ─────────────────────────────────────────────────

# 地区代码 → 索引文件名映射
_REGION_INDEX: dict[str, str] = {
    "HK": "hk.json",
    "SG": "sg.json",
    "TH": "th.json",
    "EU": "eu.json",
    "BOCHK": "bochk.json",
}

# 索引缓存
_index_cache: dict[str, list[dict]] = {}


def _load_index(region: str) -> list[dict]:
    """加载指定地区的 JSON 索引（带缓存）"""
    if region in _index_cache:
        return _index_cache[region]

    filename = _REGION_INDEX.get(region)
    if not filename:
        logger.warning(f"未知地区代码: {region}")
        return []

    index_path = INDEX_DIR / filename
    if not index_path.exists():
        logger.warning(f"索引文件不存在: {index_path}")
        return []

    with open(index_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    _index_cache[region] = data
    return data


def filter_index(region: str = None, category: str = None) -> list[dict]:
    """从 JSON 索引筛选法规条目。

    Args:
        region: 地区代码 ("HK", "SG", "TH", "EU", "BOCHK")
        category: 类别 ("E", "S", "G")

    Returns:
        匹配的索引条目列表
    """
    if region:
        entries = _load_index(region)
    else:
        # 加载所有地区
        entries = []
        for reg in _REGION_INDEX:
            entries.extend(_load_index(reg))

    if category:
        entries = [e for e in entries if e.get("category") == category]

    return entries
