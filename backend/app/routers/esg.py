"""Step 5: ESG 合规分析路由 — POST /api/esg/analyze"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.config import settings
from app.data.esg_mock_data import get_mock_esg_response

router = APIRouter(prefix="/api/esg", tags=["Step 5: ESG 合规分析"])


class ESGAnswer(BaseModel):
    """单个问卷回答"""
    question_id: str
    answer: str


class ESGRequest(BaseModel):
    """ESG 分析请求"""
    profile: dict
    target_country: str
    standard: str = "destination"  # "destination" 或 "bochk"
    answers: list[ESGAnswer] = []


class ESGGap(BaseModel):
    """单个合规缺口"""
    regulation: str
    category: str       # E / S / G
    status: str         # red / yellow / green
    source_text: str
    source_ref: str
    ai_judgment: str
    confidence: str     # high / medium / low
    gap_description: str
    suggestion: str
    suggestion_confidence: str
    difficulty: str
    estimated_time: str


class ESGResponse(BaseModel):
    """ESG 分析结果"""
    overall_score: int
    category_scores: dict = {}    # {"E": 45, "S": 72, "G": 60}
    grade: str = "C"              # "A" / "B" / "C"
    country: str
    standard: str
    gaps: list[ESGGap]
    roadmap: str
    disclaimer: str


# ── Mock 数据已迁移至 app.data.esg_mock_data，按地区复用 ───


@router.post("/analyze", response_model=ESGResponse)
async def analyze_esg(req: ESGRequest):
    """ESG 合规缺口分析"""

    if settings.LLM_MODE == "mock":
        # Mock 快速返回：按目标地区返回对应示例数据
        return get_mock_esg_response(req.target_country, req.standard)

    # 真实分析：委托 esg_service
    from app.services.esg_service import analyze_esg as esg_analyze
    return await esg_analyze(req)
