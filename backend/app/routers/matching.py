"""Step 4: 服务匹配路由 — POST /api/matching/recommend"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.services.matching_service import recommend_products

router = APIRouter(prefix="/api/matching", tags=["Step 4: 服务匹配"])


class MatchingRequest(BaseModel):
    """匹配请求：接收企业画像"""
    profile: dict


@router.post("/recommend")
async def recommend(req: MatchingRequest):
    """根据企业画像推荐 BOCHK 产品（规则引擎 + LLM 推荐理由）"""
    return await recommend_products(req.profile)
