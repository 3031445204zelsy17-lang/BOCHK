"""Step 1: 企业画像路由 — POST /api/profile/generate"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.services.llm_client import llm_client
from app.config import settings

router = APIRouter(prefix="/api/profile", tags=["Step 1: 企业画像"])


class ProfileRequest(BaseModel):
    """企业信息输入"""
    company_name: str
    industry: str
    size: str
    description: str
    export_experience: str


class ProfileResponse(BaseModel):
    """企业画像输出"""
    profile: dict


# ── Mock 数据 ──────────────────────────────────────────────

MOCK_PROFILE = {
    "profile": {
        "industry_tags": ["电子制造", "消费电子"],
        "size_level": "中型",
        "trade_capability": "高",
        "export_markets": ["东南亚", "欧洲"],
        "readiness_score": 78,
        "tags": ["制造业", "有出海经验", "电子"]
    }
}


@router.post("/generate", response_model=ProfileResponse)
async def generate_profile(req: ProfileRequest):
    """根据企业信息生成结构化画像"""

    if settings.LLM_MODE == "mock":
        return MOCK_PROFILE

    # 真实 LLM 调用（P2-1 实现）
    messages = [
        {"role": "system", "content": "你是一个企业出海分析专家。根据企业提供的信息，生成结构化企业画像。"},
        {"role": "user", "content": f"企业名称：{req.company_name}\n行业：{req.industry}\n规模：{req.size}\n描述：{req.description}\n出海经验：{req.export_experience}"}
    ]
    result = await llm_client.call_glm(messages)

    import json
    profile_data = json.loads(result)
    return {"profile": profile_data}
