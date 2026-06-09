"""Step 4: 服务匹配路由 — POST /api/matching/recommend"""

import json
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.llm_client import llm_client
from app.config import settings

router = APIRouter(prefix="/api/matching", tags=["Step 4: 服务匹配"])

# 加载产品数据
DATA_DIR = Path(__file__).parent.parent / "data"


class MatchingRequest(BaseModel):
    """匹配请求：接收企业画像"""
    profile: dict


class ProductRecommendation(BaseModel):
    """单个产品推荐"""
    product_id: str
    product_name: str
    match_score: int
    amount_range: str
    reason: str
    advice: str


class MatchingResponse(BaseModel):
    """匹配结果"""
    recommendations: list[ProductRecommendation]


# ── Mock 数据 ──────────────────────────────────────────────

MOCK_RECOMMENDATIONS = {
    "recommendations": [
        {
            "product_id": "xqi",
            "product_name": "小企钱",
            "match_score": 92,
            "amount_range": "HK$50万 - 500万",
            "reason": "基于贵司在电子制造领域的稳定出口业绩和中等规模，小企钱能提供灵活的营运资金支持，助力东南亚市场扩张。",
            "advice": "建议准备近三个月银行流水和商业登记证，可快速获得批核。"
        },
        {
            "product_id": "trade_finance",
            "product_name": "贸易融资",
            "match_score": 87,
            "amount_range": "根据交易金额而定",
            "reason": "贵司已有东南亚出口经验，贸易融资服务可为跨境交易提供信用证和发票融资支持，降低交易风险。",
            "advice": "建议整理现有贸易合同和出口发票，配合信用证申请流程。"
        },
        {
            "product_id": "supply_chain",
            "product_name": "供应链融资",
            "match_score": 78,
            "amount_range": "根据供应链规模而定",
            "reason": "作为电子元器件制造商，贵司在供应链中处于关键位置，供应链融资可帮助优化上下游资金周转。",
            "advice": "建议梳理核心供应商和客户关系，准备供应链合同材料。"
        },
        {
            "product_id": "forex_management",
            "product_name": "外汇管理",
            "match_score": 75,
            "amount_range": "不限",
            "reason": "贵司出口东南亚和欧洲市场，涉及多币种结算，外汇管理服务可有效对冲汇率波动风险。",
            "advice": "建议开通多币种账户，了解远期外汇合约锁定汇率策略。"
        }
    ]
}


@router.post("/recommend", response_model=MatchingResponse)
async def recommend_products(req: MatchingRequest):
    """根据企业画像推荐 BOCHK 产品"""

    if settings.LLM_MODE == "mock":
        return MOCK_RECOMMENDATIONS

    # 真实 LLM 调用（P3-1 实现）
    products_path = DATA_DIR / "bochk_products.json"
    with open(products_path, "r", encoding="utf-8") as f:
        products = json.load(f)

    messages = [
        {"role": "system", "content": "你是BOCHK产品匹配专家。根据企业画像，推荐最适合的银行产品。"},
        {"role": "user", "content": f"企业画像：{json.dumps(req.profile, ensure_ascii=False)}\n\n可选产品：{json.dumps(products, ensure_ascii=False)}"}
    ]
    result = await llm_client.call_glm(messages)

    return {"recommendations": json.loads(result)}
