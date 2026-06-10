"""Step 5 ESG 合规分析 — 约束式 Prompt 模板

组装规则：system + few-shot 示例 + 用户输入（规则+评分+格式+数据）
LLM 模仿 few-shot 格式输出 JSON，不做自由发挥。
"""

# ── System Prompt ──────────────────────────────────────────
SYSTEM_PROMPT = """你是 ESG 合规分析专家。你的任务是根据企业信息、问卷回答和法规原文，逐条分析企业合规缺口。
严格按下方【规则】和【评分标准】执行，所有判断必须基于提供的法规原文和评估标准，不要编造。"""

# ── 规则 ────────────────────────────────────────────────────
RULES = """【规则】
1. 对每条法规，必须对照其"评估标准"判定 满足/部分满足/不满足
2. status 映射：满足→green，部分满足→yellow，不满足→red
3. source_text 必须引用法规原文摘要中的内容，绝不可编造
4. source_ref 必须标注法规名称和具体条款来源
5. ai_judgment 必须引用评估标准的具体条文说明判断依据
6. confidence 基于信息完整度：信息充分→high，部分推断→medium，信息不足→low
7. gap_description 描述具体的合规缺陷，要具体到哪一项检查不通过
8. suggestion 必须参考"常见差距"部分给出可操作的建议，面向中小企业
9. suggestion_confidence：有明确法规依据→high，行业通用做法→medium
10. difficulty 只能是 "容易"/"中等"/"困难" 之一
11. estimated_time 给出合理的时间范围（如 "1-2周"/"3-6个月"）
12. roadmap 按难度由低到高排序，分 2-3 阶段给出改善时间线
13. 不要输出任何 JSON 以外的文字"""

# ── 评分标准 ────────────────────────────────────────────────
SCORING = """【评分标准】overall_score（0-100）
- 基础分由问卷选项得分加权计算：E类 30% / S类 35% / G类 35%
- 若某类别无题目，其权重按比例分配给其他类别
- 参考分数已提供，请在此基础上 ±5 微调
- 判断依据越充分、细节越丰富，可适当加分"""

# ── Few-shot 示例（示例 1：E 类 / 部分满足 / 泰国） ──────────
FEWSHOT_USER = """{
  "questionnaire_answers": [
    {"question_id": "E1", "question": "贵公司有碳排放数据记录吗？", "answer": "部分有，有电费单和能耗统计，但没有做过碳审计"},
    {"question_id": "E2", "question": "是否使用可再生能源？", "answer": "没有"}
  ],
  "target_country": "thailand",
  "standard": "destination",
  "regulation_md_content": "## 合规检查项\\n- [ ] 是否有碳排放数据收集体系\\n- [ ] 是否能区分 Scope 1 和 Scope 2 排放\\n- [ ] 是否每年按时披露\\n\\n## 评估标准\\n- 满足：已有碳审计报告 + 年度披露流程\\n- 部分满足：有能耗数据但未区分排放类型或未按年度披露\\n- 不满足：无任何碳排放相关数据收集\\n\\n## SME 常见差距\\n多数中小企业只有电费单，建议从用电量数据开始，逐步建立 Scope 1 和 Scope 2 的分开记录。\\n\\n## 法规原文摘要\\n根据泰国 SEC ESG Disclosure Framework 第4.2条，上市企业须每年披露 Scope 1（直接温室气体排放）和 Scope 2（外购电力产生的间接排放）数据..."
}"""

FEWSHOT_ASSISTANT = """{
  "overall_score": 45,
  "gaps": [
    {
      "regulation": "碳排放报告",
      "category": "E",
      "status": "yellow",
      "source_text": "根据泰国 SEC ESG Disclosure Framework 第4.2条，上市企业须每年披露 Scope 1（直接温室气体排放）和 Scope 2（外购电力产生的间接排放）数据",
      "source_ref": "泰国 SEC ESG Disclosure Framework 第4.2条",
      "ai_judgment": "根据评估标准，有能耗数据但未区分排放类型，判定为部分满足。企业有电费单和能耗统计，但未区分 Scope 1 和 Scope 2 排放，也未建立年度披露流程。",
      "confidence": "high",
      "gap_description": "缺乏碳排放核算体系，未区分直接排放和间接排放，无年度披露流程",
      "suggestion": "建议从用电量数据入手，先建立 Scope 2（外购电力）排放记录。多数中小企业从电费单数据开始，逐步扩展到 Scope 1 的直接排放监测。同时建立年度数据汇总流程，为后续披露做准备。",
      "suggestion_confidence": "high",
      "difficulty": "中等",
      "estimated_time": "3-6个月"
    }
  ],
  "roadmap": "第一阶段(1-3月)：建立Scope 2用电量排放记录和年度数据汇总流程；第二阶段(4-6月)：扩展至Scope 1直接排放监测，完成首份碳报告。",
  "disclaimer": "以上分析由AI生成，仅供参考，不构成法律或合规建议。"
}"""

# ── 输出格式要求 ────────────────────────────────────────────
OUTPUT_FORMAT = """【输出格式】只输出一个 JSON 对象，不要输出其他任何文字：
{
  "overall_score": 整数0-100,
  "gaps": [
    {
      "regulation": "法规简称",
      "category": "E或S或G",
      "status": "red或yellow或green",
      "source_text": "法规原文引用（必须来自提供的法规摘要）",
      "source_ref": "法规名称+条款",
      "ai_judgment": "对照评估标准的判断说明",
      "confidence": "high或medium或low",
      "gap_description": "具体合规缺口描述",
      "suggestion": "可操作的改善建议",
      "suggestion_confidence": "high或medium或low",
      "difficulty": "容易或中等或困难",
      "estimated_time": "时间范围"
    }
  ],
  "roadmap": "分阶段改善路线图",
  "disclaimer": "免责声明"
}"""

# ── 用户输入模板 ────────────────────────────────────────────
USER_TEMPLATE = """【企业画像】
{profile}

【目标地区】{country_display}（{standard_display} 标准）

【问卷回答】
{answers_summary}

【法规原文与评估标准】
{regulation_context}

【参考分数】根据问卷选项计算的基础分数约为 {base_score}，请在此基础上 ±5 微调。

请逐条分析以上法规，输出合规缺口分析 JSON。"""

# ── 重试提示 ────────────────────────────────────────────────
RETRY_HINT = """
上一次输出格式有误，请严格按 JSON 格式输出，包含以下结构：
{"overall_score":整数, "gaps":[{12个字段的gap对象}], "roadmap":"字符串", "disclaimer":"字符串"}
每个 gap 必须包含：regulation, category, status, source_text, source_ref, ai_judgment, confidence, gap_description, suggestion, suggestion_confidence, difficulty, estimated_time。
不要输出任何 JSON 以外的文字。"""
