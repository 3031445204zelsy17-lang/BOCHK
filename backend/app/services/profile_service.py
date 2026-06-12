"""Step 1 企业画像 — 业务逻辑层

组装约束式 Prompt → 调用 LLM → 解析校验 JSON → 返回结构化画像
含重试机制（3 次）和 Mock 降级兜底
"""

import json
import logging
from pathlib import Path

from app.services.llm_client import llm_client
from app.prompts.profile_prompt import (
    SYSTEM_PROMPT,
    RULES,
    SCORING,
    FEWSHOT_USER,
    FEWSHOT_ASSISTANT,
    USER_TEMPLATE,
    OUTPUT_FORMAT,
    RETRY_HINT,
)

logger = logging.getLogger(__name__)

# Mock 企业数据路径
MOCK_DATA_PATH = Path(__file__).parent.parent / "data" / "mock_enterprises.json"

# 画像字段校验规则：字段名 → (期望类型, 是否必填)
REQUIRED_FIELDS = {
    "industry_tags": list,
    "size_level": str,
    "trade_capability": str,
    "export_markets": list,
    "readiness_score": int,
    "tags": list,
}

MAX_RETRIES = 3


def _build_messages(req, retry_error: str | None = None) -> list[dict]:
    """组装约束式 Prompt messages 列表"""
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
                    SCORING,
                    "",
                    OUTPUT_FORMAT,
                    "",
                    USER_TEMPLATE.format(
                        company_name=req.company_name,
                        industry=req.industry,
                        size=req.size,
                        description=req.description,
                        export_experience=req.export_experience,
                        target_markets="、".join(req.target_markets) if req.target_markets else "未指定",
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


def _validate_profile(data: dict) -> tuple[bool, str]:
    """校验画像 JSON 字段完整性和类型正确性"""
    for field, expected_type in REQUIRED_FIELDS.items():
        if field not in data:
            return False, f"缺少字段: {field}"
        if not isinstance(data[field], expected_type):
            return False, f"字段 {field} 类型错误: 期望 {expected_type.__name__}, 实际 {type(data[field]).__name__}"
    # readiness_score 范围校验
    score = data["readiness_score"]
    if not (0 <= score <= 100):
        return False, f"readiness_score 超出范围: {score}"
    # size_level 枚举校验
    if data["size_level"] not in ("小型", "中小型", "中型"):
        return False, f"size_level 值无效: {data['size_level']}"
    return True, ""


def _get_mock_fallback() -> dict:
    """从 mock_enterprises.json 加载第一个企业作为兜底"""
    try:
        with open(MOCK_DATA_PATH, "r", encoding="utf-8") as f:
            enterprises = json.load(f)
        return enterprises[0]["preset_profile"]
    except Exception as e:
        logger.error(f"加载 mock 数据失败: {e}")
        return {
            "industry_tags": ["电子制造", "消费电子"],
            "size_level": "中型",
            "trade_capability": "高",
            "export_markets": ["东南亚", "欧洲"],
            "readiness_score": 78,
            "tags": ["制造业", "有出海经验", "电子"],
        }


async def generate_profile(req) -> dict:
    """
    生成企业画像：调用 LLM → 解析 JSON → 校验 → 返回

    重试最多 MAX_RETRIES 次，全部失败则返回 mock 兜底数据
    """
    retry_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            messages = _build_messages(req, retry_error)
            raw = await llm_client.call_kimi(messages, temperature=0.3)

            # 解析 JSON
            profile = json.loads(raw)

            # 校验字段
            ok, err = _validate_profile(profile)
            if ok:
                logger.info(f"画像生成成功 (第 {attempt} 次): {req.company_name}")
                return profile

            # 校验失败，记录错误用于下次重试
            retry_error = raw
            logger.warning(f"画像校验失败 (第 {attempt} 次): {err}")

        except json.JSONDecodeError as e:
            retry_error = raw if "raw" in dir() else str(e)
            logger.warning(f"JSON 解析失败 (第 {attempt} 次): {e}")

        except Exception as e:
            logger.warning(f"LLM 调用失败 (第 {attempt} 次): {e}")

    # 全部重试失败，返回 mock 兜底
    logger.error(f"画像生成 {MAX_RETRIES} 次全部失败，返回 mock 兜底: {req.company_name}")
    return _get_mock_fallback()
