"""LLM 客户端 — 支持 mock/real 切换，MVP 统一使用 GLM-5.1"""

import json
import httpx
from app.config import settings


class LLMClient:
    """统一 LLM 调用客户端，mock 模式返回预设数据，real 模式调用真实 API"""

    def __init__(self):
        self.mode = settings.LLM_MODE

    async def call_glm(self, messages: list[dict], temperature: float = 0.7) -> str:
        """调用 GLM-5.1（Step 1 企业画像 + Step 4 服务匹配）"""
        if self.mode == "mock":
            return self._mock_glm_response(messages)

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{settings.GLM_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {settings.GLM_API_KEY}"},
                json={
                    "model": "glm-5.1",
                    "messages": messages,
                    "temperature": temperature,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    async def call_glm_json(
        self, messages: list[dict], temperature: float = 0.3
    ) -> str:
        """调用 GLM-5.1 并强制返回 JSON 格式"""
        if self.mode == "mock":
            return self._mock_glm_response(messages)

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{settings.GLM_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {settings.GLM_API_KEY}"},
                json={
                    "model": "glm-5.1",
                    "messages": messages,
                    "temperature": temperature,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    async def call_kimi(self, messages: list[dict], temperature: float = 0.3) -> str:
        """调用 Kimi K2.6（Step 5 ESG 分析）"""
        if self.mode == "mock":
            return self._mock_kimi_response(messages)

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{settings.KIMI_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {settings.KIMI_API_KEY}"},
                json={
                    "model": "moonshot-v1-128k",
                    "messages": messages,
                    "temperature": temperature,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

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

        # 默认返回推荐理由
        return json.dumps({
            "reason": "基于贵司在电子制造领域的丰富经验和稳定的出口业绩，该产品能有效支持您的海外扩张计划。",
            "advice": "建议优先准备近三年的出口贸易数据和银行流水，以加快审批流程。"
        }, ensure_ascii=False)

    def _mock_kimi_response(self, messages: list[dict]) -> str:
        """Mock 模式：返回预设 ESG 分析结果"""
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
