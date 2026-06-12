"""ESG 共享 Mock / Fallback 数据源

按地区构造示例 gaps，供 mock 模式和 LLM 失败降级时复用。
数据与 backend/app/data/esg/index/*.json 中的真实法规保持名称一致，
避免 mock 结果与真实数据集脱节。
"""

# 国家代码映射（与 esg_service.py 保持一致）
COUNTRY_MAP = {
    "thailand": "TH", "th": "TH",
    "singapore": "SG", "sg": "SG",
    "hong_kong": "HK", "hk": "HK",
    "eu": "EU",
}

COUNTRY_DISPLAY = {
    "TH": "泰国",
    "SG": "新加坡",
    "HK": "香港",
    "EU": "欧盟",
}

# 按地区构造的示例 gaps
# 注：EU 数据集当前只有 CBAM（E 类）法规，因此 EU 示例不编造 S/G 类法规。
REGION_MOCK_GAPS = {
    "TH": [
        {
            "regulation": "碳排放报告",
            "category": "E",
            "status": "red",
            "source_text": "根据泰国 SEC ESG Disclosure Framework 第4.2条，上市企业须每年披露 Scope 1（直接温室气体排放）和 Scope 2（外购电力产生的间接排放）数据。",
            "source_ref": "泰国 SEC ESG Disclosure Framework 第4.2条",
            "ai_judgment": "不满足：企业尚未建立碳排放核算体系，无法提供符合要求的排放数据。",
            "confidence": "high",
            "gap_description": "企业未建立碳排放核算体系，未区分 Scope 1 和 Scope 2 排放，无年度披露流程。",
            "suggestion": "建议从电费单和能耗数据入手，先建立 Scope 2 排放记录，再逐步扩展到 Scope 1 直接排放监测，并形成年度汇总流程。",
            "suggestion_confidence": "high",
            "difficulty": "中等",
            "estimated_time": "3-6个月",
        },
        {
            "regulation": "劳工权益保护",
            "category": "S",
            "status": "yellow",
            "source_text": "泰国劳动保护法 B.E.2541 要求雇主为员工提供社会保险，并保障工作场所安全。",
            "source_ref": "泰国劳动保护法 B.E.2541 第22条",
            "ai_judgment": "部分满足：企业有基本社保，但缺乏系统的安全培训记录。",
            "confidence": "medium",
            "gap_description": "企业有基本社保但缺乏系统的安全培训记录和职业健康档案。",
            "suggestion": "建立员工安全培训档案，定期开展职业健康培训，并保留培训记录备查。",
            "suggestion_confidence": "high",
            "difficulty": "容易",
            "estimated_time": "1-2个月",
        },
        {
            "regulation": "公司治理结构",
            "category": "G",
            "status": "green",
            "source_text": "泰国 SEC 公司治理指引要求企业建立基本的公司治理框架，包括董事会组成和信息披露机制。",
            "source_ref": "泰国 SEC 公司治理指引 第2.1条",
            "ai_judgment": "基本满足：企业已建立基本治理结构，但独立董事比例可进一步优化。",
            "confidence": "high",
            "gap_description": "企业已建立基本治理结构，但独立董事比例和董事会多元化可优化。",
            "suggestion": "考虑引入1-2名独立董事，完善董事会 diversity，并定期披露公司治理实践。",
            "suggestion_confidence": "medium",
            "difficulty": "容易",
            "estimated_time": "1-3个月",
        },
    ],
    "SG": [
        {
            "regulation": "可持续报告 — 实质性 ESG 因子识别",
            "category": "E",
            "status": "yellow",
            "source_text": "根据 SGX Practice Note 7.6 para 4.1，可持续报告应识别实质性 ESG 因子，并说明选择和优先级排序的理由，同时考虑价值链范围。",
            "source_ref": "SGX Practice Note 7.6, para 4.1",
            "ai_judgment": "部分满足：企业已识别部分 ESG 因子，但缺乏系统化的评估流程和价值链视角。",
            "confidence": "medium",
            "gap_description": "尚未建立结构化的实质性 ESG 因子识别流程，未充分考虑价值链上下游影响。",
            "suggestion": "建议采用“识别—评级—优先级排序—验证”四步流程，覆盖外包、供应链及产品使用阶段，形成书面方法论。",
            "suggestion_confidence": "high",
            "difficulty": "中等",
            "estimated_time": "2-4个月",
        },
        {
            "regulation": "供应链 ESG 风险管理",
            "category": "S",
            "status": "red",
            "source_text": "SGX Practice Note 7.6 要求发行人披露与管理供应链环境与社会风险相关的政策，包括劳工标准和环保采购要求。",
            "source_ref": "SGX Practice Note 7.6, Section 6",
            "ai_judgment": "不满足：企业尚未建立供应商 ESG 行为准则或环保采购标准。",
            "confidence": "high",
            "gap_description": "缺乏供应商行为准则、环保采购标准及供应链 ESG 风险审核机制。",
            "suggestion": "建议制定供应商行为准则，将环境合规与劳工标准纳入供应商筛选和年度评估流程。",
            "suggestion_confidence": "high",
            "difficulty": "中等",
            "estimated_time": "3-6个月",
        },
        {
            "regulation": "可持续报告董事会责任",
            "category": "G",
            "status": "green",
            "source_text": "SGX Practice Note 7.6 para 3.1 明确董事会集体对可持续报告负最终责任，并应在报告中包含董事会声明。",
            "source_ref": "SGX Practice Note 7.6, para 3.1",
            "ai_judgment": "基本满足：企业已有董事会参与 ESG 事务，但声明可进一步具体化。",
            "confidence": "medium",
            "gap_description": "董事会已参与 ESG 监督，但可持续报告中的董事会声明不够具体。",
            "suggestion": "在年度可持续报告中增加董事会声明，明确董事会在 ESG 战略、风险监督及目标设定中的具体角色。",
            "suggestion_confidence": "high",
            "difficulty": "容易",
            "estimated_time": "1-2个月",
        },
    ],
    "HK": [
        {
            "regulation": "Scope 1 & 2 温室气体强制披露",
            "category": "E",
            "status": "red",
            "source_text": "HKEX Appendix C2 ESG Reporting Code, Part D 要求上市发行人披露 Scope 1 和 Scope 2 温室气体排放，并说明计算方法和排放源。",
            "source_ref": "HKEX Appendix C2, Part D",
            "ai_judgment": "不满足：企业尚未测量或披露 Scope 1 和 Scope 2 排放。",
            "confidence": "high",
            "gap_description": "未建立温室气体排放核算体系，无法按 HKEX 要求披露 Scope 1 和 Scope 2 数据。",
            "suggestion": "建议依据 GHG Protocol 建立排放清单，先核算 Scope 2 外购电力排放，再扩展到 Scope 1 固定/移动燃烧源。",
            "suggestion_confidence": "high",
            "difficulty": "中等",
            "estimated_time": "3-6个月",
        },
        {
            "regulation": "员工数据披露",
            "category": "S",
            "status": "yellow",
            "source_text": "HKEX Appendix C2 要求上市发行人按性别、年龄组、地区等维度披露员工总数、流失率及培训数据。",
            "source_ref": "HKEX Appendix C2, Subject Area B (Social)",
            "ai_judgment": "部分满足：企业有基本员工统计，但披露维度不完整。",
            "confidence": "medium",
            "gap_description": "员工数据统计维度不完整，缺少按性别、年龄组、地区分类的披露。",
            "suggestion": "建议完善 HR 数据收集模板，按 HKEX 要求分类统计员工总数、流失率和人均培训时数，并纳入 ESG 报告。",
            "suggestion_confidence": "high",
            "difficulty": "容易",
            "estimated_time": "1-3个月",
        },
        {
            "regulation": "气候相关治理披露",
            "category": "G",
            "status": "green",
            "source_text": "HKEX Appendix C2, Part D, para 18 要求披露负责监督气候相关风险与机会的治理机构或个人，以及管理层在相关治理流程中的角色。",
            "source_ref": "HKEX Appendix C2, Part D, para 18",
            "ai_judgment": "基本满足：企业已识别 ESG 监督职责，但气候议题的监督机制可进一步细化。",
            "confidence": "medium",
            "gap_description": "已有董事会层面的 ESG 监督，但气候相关风险的专项监督机制不够明确。",
            "suggestion": "建议在董事会或下设委员会职责中明确气候相关风险监督条款，定期向董事会汇报气候风险与机会。",
            "suggestion_confidence": "high",
            "difficulty": "容易",
            "estimated_time": "1-2个月",
        },
    ],
    "EU": [
        {
            "regulation": "CBAM 过渡期季度报告义务",
            "category": "E",
            "status": "red",
            "source_text": "Regulation (EU) 2023/956, Art. 35(1) 规定，每季度结束后一个月内，CBAM 货物进口商须向欧盟委员会提交 CBAM 报告，列明货物数量、嵌入排放、间接排放及原产国碳价。",
            "source_ref": "Regulation (EU) 2023/956, Art. 35",
            "ai_judgment": "不满足：企业尚未建立 CBAM 季度报告机制。",
            "confidence": "high",
            "gap_description": "未建立 CBAM 报告流程，未在欧盟 CBAM 过渡登记系统中注册或提交季度报告。",
            "suggestion": "建议尽快在欧盟 CBAM 过渡登记系统中注册，收集供应商层面的嵌入排放数据，并按季度提交报告。",
            "suggestion_confidence": "high",
            "difficulty": "困难",
            "estimated_time": "6-12个月",
        },
        {
            "regulation": "CBAM 嵌入排放计算",
            "category": "E",
            "status": "yellow",
            "source_text": "Regulation (EU) 2023/956, Annex IV 规定了 CBAM 覆盖货物嵌入排放的计算方法，包括系统边界、排放因子和监测方法。",
            "source_ref": "Regulation (EU) 2023/956, Annex IV",
            "ai_judgment": "部分满足：企业了解 CBAM 概念，但尚未按 Annex IV 方法建立嵌入排放计算能力。",
            "confidence": "medium",
            "gap_description": "尚未按 Annex IV 建立嵌入排放计算方法，缺少供应商排放数据和第三方核查。",
            "suggestion": "建议依据 Annex IV 建立嵌入排放计算模板，优先收集钢铁/铝/水泥等 CBAM 覆盖产品的排放数据，并考虑第三方核查。",
            "suggestion_confidence": "high",
            "difficulty": "困难",
            "estimated_time": "6-12个月",
        },
    ],
}

# 按地区的示例分类得分与总分
REGION_SCORES = {
    "TH": {"overall_score": 45, "category_scores": {"E": 30, "S": 55, "G": 60}},
    "SG": {"overall_score": 52, "category_scores": {"E": 55, "S": 45, "G": 65}},
    "HK": {"overall_score": 55, "category_scores": {"E": 50, "S": 60, "G": 65}},
    "EU": {"overall_score": 35, "category_scores": {"E": 35}},  # EU 当前只有 E 类数据
}

# 按地区的示例路线图
REGION_ROADMAPS = {
    "TH": "第一阶段(1-2月)：完善劳工权益记录和安全培训档案，优化董事会声明；第二阶段(3-4月)：建立 Scope 2 用电排放记录和年度汇总流程；第三阶段(5-6月)：扩展至 Scope 1 直接排放监测，完成首份 ESG 报告。",
    "SG": "第一阶段(1-2月)：完善董事会可持续报告声明，补充员工数据披露维度；第二阶段(3-4月)：建立结构化实质性 ESG 因子识别流程；第三阶段(5-6月)：制定供应商行为准则并纳入采购评估。",
    "HK": "第一阶段(1-2月)：明确董事会气候监督职责，完善员工数据分类统计；第二阶段(3-4月)：建立 Scope 2 外购电力排放核算；第三阶段(5-6月)：扩展至 Scope 1 排放并披露于 ESG 报告。",
    "EU": "第一阶段(1-3月)：在欧盟 CBAM 过渡登记系统注册，识别 CBAM 覆盖产品；第二阶段(4-6月)：建立供应商排放数据收集模板，完成首份季度 CBAM 报告；第三阶段(7-12月)：按 Annex IV 完善嵌入排放计算并寻求第三方核查。",
}


def _score_to_grade(score: int) -> str:
    """将数值分数映射为等级 A/B/C"""
    if score >= 80:
        return "A"
    if score >= 60:
        return "B"
    return "C"


def get_mock_esg_response(target_country: str, standard: str, is_fallback: bool = False) -> dict:
    """按目标地区返回 Mock / Fallback ESG 分析结果

    Args:
        target_country: 前端传入的国家代码，如 singapore / hong_kong / eu / thailand
        standard: "destination" 或 "bochk"
        is_fallback: 是否为 LLM 失败降级场景，为 True 时 disclaimer 附加提示

    Returns:
        符合 ESGResponse 结构的字典
    """
    region = COUNTRY_MAP.get(target_country, target_country.upper())
    if region not in REGION_MOCK_GAPS:
        # 未知地区返回空结果，避免编造
        return {
            "overall_score": 0,
            "category_scores": {},
            "grade": "C",
            "country": COUNTRY_DISPLAY.get(region, target_country),
            "standard": standard,
            "gaps": [],
            "roadmap": f"暂不支持 {COUNTRY_DISPLAY.get(region, target_country)} 的 ESG 示例数据。",
            "disclaimer": "以上分析由AI生成，仅供参考，不构成法律或合规建议。",
        }

    import copy
    gaps = copy.deepcopy(REGION_MOCK_GAPS[region])
    scores = REGION_SCORES[region]

    disclaimer = "以上分析由AI生成，仅供参考，不构成法律或合规建议。"
    if is_fallback:
        disclaimer = "以上分析由AI生成，仅供参考，不构成法律或合规建议。（降级模式：LLM 服务不可用，显示示例数据。）"

    return {
        "overall_score": scores["overall_score"],
        "category_scores": copy.deepcopy(scores["category_scores"]),
        "grade": _score_to_grade(scores["overall_score"]),
        "country": COUNTRY_DISPLAY.get(region, target_country),
        "standard": standard,
        "gaps": gaps,
        "roadmap": REGION_ROADMAPS[region],
        "disclaimer": disclaimer,
    }
