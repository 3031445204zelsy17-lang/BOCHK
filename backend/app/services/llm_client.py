"""LLM 客户端 — 支持 mock/real 切换，MVP 统一使用 GLM-5.1"""

import asyncio
import json
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """统一 LLM 调用客户端，mock 模式返回预设数据，real 模式调用真实 API"""

    def __init__(self):
        self.mode = settings.LLM_MODE
        self._semaphore = asyncio.Semaphore(2)  # 最多 2 个并发 LLM 请求
        self._last_call_time = 0  # 上次调用时间戳，用于节流
        self._min_interval = 1.0  # 两次请求之间最少间隔 1 秒

    async def call_glm(self, messages: list[dict], temperature: float = 0.7) -> str:
        """调用 GLM-5.1（Step 1 企业画像 + Step 4 服务匹配），含 429 退避重试"""
        if self.mode == "mock":
            return self._mock_glm_response(messages)

        return await self._call_with_retry(
            base_url=settings.GLM_BASE_URL,
            api_key=settings.GLM_API_KEY,
            model="glm-5.1",
            messages=messages,
            temperature=temperature,
            timeout=60,
        )

    async def call_glm_json(
        self, messages: list[dict], temperature: float = 0.3
    ) -> str:
        """调用 GLM-5.1 并强制返回 JSON 格式，含 429 退避重试"""
        if self.mode == "mock":
            return self._mock_glm_response(messages)

        return await self._call_with_retry(
            base_url=settings.GLM_BASE_URL,
            api_key=settings.GLM_API_KEY,
            model="glm-5.1",
            messages=messages,
            temperature=temperature,
            timeout=60,
            response_format={"type": "json_object"},
        )

    async def call_kimi(self, messages: list[dict], temperature: float = 0.3) -> str:
        """调用 Kimi K2.6（Step 5 ESG 分析），含 429 退避重试"""
        if self.mode == "mock":
            return self._mock_kimi_response(messages)

        return await self._call_with_retry(
            base_url=settings.KIMI_BASE_URL,
            api_key=settings.KIMI_API_KEY,
            model="moonshot-v1-128k",
            messages=messages,
            temperature=temperature,
            timeout=120,
        )

    # ── 统一调用 + 429 退避重试 ───────────────────────────────

    async def _call_with_retry(
        self,
        base_url: str,
        api_key: str,
        model: str,
        messages: list[dict],
        temperature: float,
        timeout: int,
        response_format: dict | None = None,
    ) -> str:
        """统一 API 调用，含并发控制 + 节流 + 429 退避重试"""
        import time

        async with self._semaphore:
            # 节流：确保两次请求之间至少间隔 _min_interval 秒
            now = time.monotonic()
            elapsed = now - self._last_call_time
            if elapsed < self._min_interval:
                await asyncio.sleep(self._min_interval - elapsed)

            max_retries = 3
            for attempt in range(max_retries):
                async with httpx.AsyncClient(timeout=timeout) as client:
                    payload = {
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                    }
                    if response_format:
                        payload["response_format"] = response_format

                    self._last_call_time = time.monotonic()
                    resp = await client.post(
                        f"{base_url}/chat/completions",
                        headers={"Authorization": f"Bearer {api_key}"},
                        json=payload,
                    )

                    if resp.status_code == 429:
                        wait = 2 ** (attempt + 1)  # 2, 4, 8 秒
                        logger.warning(f"429 限流，第 {attempt + 1} 次重试，等待 {wait} 秒...")
                        await asyncio.sleep(wait)
                        continue

                    resp.raise_for_status()
                    return resp.json()["choices"][0]["message"]["content"]

        # 3 次都 429，最后再试一次不等待
        raise httpx.HTTPStatusError(
            f"429 Too Many Requests: 重试 {max_retries} 次后仍被限流",
            request=resp.request,
            response=resp,
        )

    # ── mock 数据 ──────────────────────────────────────────

    def _mock_glm_response(self, messages: list[dict]) -> str:
        """Mock 模式：根据 prompt 内容返回对应的预设 JSON"""
        prompt_text = str(messages[-1].get("content", ""))

        # 检测是画像生成还是产品匹配
        if "画像" in prompt_text or "profile" in prompt_text.lower():
            return json.dumps({
                "industry_tags": ["电子制造", "消费电子"],
                "size_level": "中型",
                "trade_capability": "高",
                "export_markets": ["东南亚", "欧洲"],
                "readiness_score": 78,
                "tags": ["制造业", "有出海经验", "电子"]
            }, ensure_ascii=False)

        # 产品匹配：返回推荐列表
        if "推荐" in prompt_text or "产品" in prompt_text or "match_score" in prompt_text:
            return json.dumps([
                {
                    "product_id": "trade_finance",
                    "product_name": "贸易融资",
                    "match_score": 99,
                    "amount_range": "根据交易金额而定",
                    "reason": "作为电子制造领域的中型出口企业，贸易融资可为您的东南亚和欧洲业务提供信用证和发票融资支持。",
                    "advice": "建议整理现有出口贸易合同和商业发票，优先申请信用证服务。"
                },
                {
                    "product_id": "forex_management",
                    "product_name": "外汇管理",
                    "match_score": 99,
                    "amount_range": "不限",
                    "reason": "贵司出口东南亚和欧洲，涉及多币种结算，外汇管理服务可有效对冲汇率波动风险。",
                    "advice": "建议开通多币种账户，了解远期外汇合约锁定汇率策略。"
                },
                {
                    "product_id": "supply_chain",
                    "product_name": "供应链融资",
                    "match_score": 93,
                    "amount_range": "根据供应链规模而定",
                    "reason": "贵司在电子元器件供应链中处于关键位置，供应链融资可优化上下游资金周转。",
                    "advice": "建议梳理核心供应商和客户关系，准备供应链合同材料。"
                },
                {
                    "product_id": "green_finance",
                    "product_name": "绿色融资",
                    "match_score": 89,
                    "amount_range": "HK$100万 - 2000万",
                    "reason": "贵司作为有出海经验的电子制造商，绿色融资可支持环保项目并享受利率优惠。",
                    "advice": "建议准备ESG报告和环境影响评估材料，申请利率优惠审批。"
                }
            ], ensure_ascii=False)

        # 默认返回推荐理由
        return json.dumps({
            "reason": "基于贵司在电子制造领域的丰富经验和稳定的出口业绩，该产品能有效支持您的海外扩张计划。",
            "advice": "建议优先准备近三年的出口贸易数据和银行流水，以加快审批流程。"
        }, ensure_ascii=False)

    def _mock_kimi_response(self, messages: list[dict]) -> str:
        """Mock 模式：根据 prompt 内容返回对应的预设 JSON"""
        prompt_text = str(messages[-1].get("content", ""))

        # 检测是产品匹配还是 ESG 分析
        if "推荐" in prompt_text or "产品" in prompt_text or "match_score" in prompt_text:
            return json.dumps([
                {
                    "product_id": "trade_finance",
                    "product_name": "贸易融资",
                    "match_score": 99,
                    "amount_range": "根据交易金额而定",
                    "reason": "作为电子制造领域的中型出口企业，贸易融资可为您的东南亚和欧洲业务提供信用证和发票融资支持。",
                    "advice": "建议整理现有出口贸易合同和商业发票，优先申请信用证服务。"
                },
                {
                    "product_id": "forex_management",
                    "product_name": "外汇管理",
                    "match_score": 99,
                    "amount_range": "不限",
                    "reason": "贵司出口东南亚和欧洲，涉及多币种结算，外汇管理服务可有效对冲汇率波动风险。",
                    "advice": "建议开通多币种账户，了解远期外汇合约锁定汇率策略。"
                },
                {
                    "product_id": "supply_chain",
                    "product_name": "供应链融资",
                    "match_score": 93,
                    "amount_range": "根据供应链规模而定",
                    "reason": "贵司在电子元器件供应链中处于关键位置，供应链融资可优化上下游资金周转。",
                    "advice": "建议梳理核心供应商和客户关系，准备供应链合同材料。"
                },
                {
                    "product_id": "green_finance",
                    "product_name": "绿色融资",
                    "match_score": 89,
                    "amount_range": "HK$100万 - 2000万",
                    "reason": "贵司作为有出海经验的电子制造商，绿色融资可支持环保项目并享受利率优惠。",
                    "advice": "建议准备ESG报告和环境影响评估材料，申请利率优惠审批。"
                }
            ], ensure_ascii=False)

        # 默认返回 ESG 分析结果
        return json.dumps({
            "overall_score": 45,
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
        }, ensure_ascii=False)


# 全局单例
llm_client = LLMClient()
