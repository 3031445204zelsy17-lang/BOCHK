"""Step 5: ESG 合规分析路由 — POST /api/esg/analyze"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.services.llm_client import llm_client
from app.config import settings

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
    country: str
    standard: str
    gaps: list[ESGGap]
    roadmap: str
    disclaimer: str


# ── Mock 数据 ──────────────────────────────────────────────

MOCK_ESG = {
    "overall_score": 45,
    "country": "泰国",
    "standard": "destination",
    "gaps": [
        {
            "regulation": "碳排放报告",
            "category": "E",
            "status": "red",
            "source_text": "根据泰国SEC ESG信息披露指引，上市公司及大型企业需按年度披露范围一和范围二的温室气体排放数据。",
            "source_ref": "泰国SEC ESG指引 第3.2条",
            "ai_judgment": "不满足",
            "confidence": "high",
            "gap_description": "企业未建立碳排放核算体系，无法提供符合要求的排放报告",
            "suggestion": "建议聘请第三方碳核查机构，建立ISO 14064碳排放核算体系",
            "suggestion_confidence": "medium",
            "difficulty": "中等",
            "estimated_time": "3-6个月"
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
            "difficulty": "低",
            "estimated_time": "1-2个月"
        },
        {
            "regulation": "公司治理结构",
            "category": "G",
            "status": "green",
            "source_text": "泰国SEC要求企业建立基本的公司治理框架，包括董事会组成和信息披露机制。",
            "source_ref": "泰国SEC公司治理指引 第2.1条",
            "ai_judgment": "基本满足",
            "confidence": "high",
            "gap_description": "企业已建立基本治理结构，但独立董事比例可优化",
            "suggestion": "考虑引入1-2名独立董事，完善董事会 diversity",
            "suggestion_confidence": "medium",
            "difficulty": "低",
            "estimated_time": "1-3个月"
        }
    ],
    "roadmap": "建议分三阶段推进：第一阶段(1-2月)完善劳工权益和治理结构；第二阶段(3-4月)建立碳排放核算体系；第三阶段(5-6月)完成首份ESG报告编制。",
    "disclaimer": "以上分析由AI生成，仅供参考，不构成法律或合规建议。"
}


@router.post("/analyze", response_model=ESGResponse)
async def analyze_esg(req: ESGRequest):
    """ESG 合规缺口分析"""

    if settings.LLM_MODE == "mock":
        # 根据请求的国家/标准调整 mock 数据
        result = MOCK_ESG.copy()
        country_map = {
            "thailand": "泰国",
            "singapore": "新加坡",
            "hong_kong": "香港",
            "eu": "欧盟",
            "sg": "新加坡",
            "th": "泰国",
            "hk": "香港",
        }
        result["country"] = country_map.get(req.target_country, req.target_country)
        result["standard"] = req.standard
        return result

    # 真实 LLM 调用（P5-3 实现）
    import json
    messages = [
        {"role": "system", "content": "你是ESG合规分析专家。根据企业信息和问卷回答，对照目标国家法规进行合规缺口分析。"},
        {"role": "user", "content": json.dumps({
            "profile": req.profile,
            "target_country": req.target_country,
            "standard": req.standard,
            "answers": [a.model_dump() for a in req.answers]
        }, ensure_ascii=False)}
    ]
    result = await llm_client.call_kimi(messages)

    return json.loads(result)
