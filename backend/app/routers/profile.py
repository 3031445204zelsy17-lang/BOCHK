"""Step 1: 企业画像路由 — POST /api/profile/generate"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.config import settings
from app.services import profile_service

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
        "tags": ["制造业", "有出海经验", "电子"],
    }
}


@router.post("/generate", response_model=ProfileResponse)
async def generate_profile(req: ProfileRequest):
    """根据企业信息生成结构化画像"""

    # Mock 模式：返回硬编码数据
    if settings.LLM_MODE == "mock":
        return MOCK_PROFILE

    # 真实模式：调用 LLM 生成画像
    profile_data = await profile_service.generate_profile(req)
    return {"profile": profile_data}
