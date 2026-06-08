# Step 5 ESG 分析 — Few-shot 示例

> 用于约束式 Prompt 中的手写完整示例
> 覆盖所有输出字段，LLM 模仿此格式输出

---

## 示例 1：环境（E）— 碳排放报告

### 输入

```json
{
  "questionnaire_answers": [
    {
      "question_id": "e1",
      "question": "贵公司有碳排放数据记录吗？",
      "answer": "部分有，有电费单和能耗统计，但没有做过碳审计"
    },
    {
      "question_id": "e2",
      "question": "是否使用可再生能源？",
      "answer": "没有"
    }
  ],
  "target_country": "thailand",
  "standard": "destination",
  "regulation_md_content": "## 合规检查项\n- [ ] 是否有碳排放数据收集体系\n- [ ] 是否能区分 Scope 1 和 Scope 2 排放\n- [ ] 是否每年按时披露\n\n## 评估标准\n- 满足：已有碳审计报告 + 年度披露流程\n- 部分满足：有能耗数据但未区分排放类型或未按年度披露\n- 不满足：无任何碳排放相关数据收集\n\n## SME 常见差距\n多数中小企业只有电费单，建议从用电量数据开始，逐步建立 Scope 1 和 Scope 2 的分开记录。\n\n## 法规原文摘要\n根据泰国 SEC ESG Disclosure Framework 第4.2条，上市企业须每年披露 Scope 1（直接温室气体排放）和 Scope 2（外购电力产生的间接排放）数据..."
}
```

### 期望输出

```json
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
```

---

## 示例 2：社会（S）— 劳工权益

### 输入

```json
{
  "questionnaire_answers": [
    {
      "question_id": "s1",
      "question": "员工劳动合同签订情况？",
      "answer": "核心员工有合同，部分临时工没有"
    },
    {
      "question_id": "s2",
      "question": "是否有员工职业健康安全管理措施？",
      "answer": "有基本的安全培训和消防设备"
    }
  ],
  "target_country": "thailand",
  "standard": "destination",
  "regulation_md_content": "## 合规检查项\n- [ ] 是否与所有员工（含临时工）签订书面劳动合同\n- [ ] 合同是否包含法定最低条款（工资、工时、休假）\n\n## 评估标准\n- 满足：所有员工均有合规书面合同，覆盖法定最低条款\n- 部分满足：核心员工有合同，但临时工/外包人员合同不完整\n- 不满足：大量员工无书面合同\n\n## SME 常见差距\n制造业中小企业常忽略临时工和季节性工人的合同签订，建议使用标准化合同模板覆盖所有用工形式。\n\n## 法规原文摘要\n根据泰国劳工保护法 Section 13，雇主须在雇员开始工作前签订书面雇佣合同，明确工资率、工作时间和休假安排..."
}
```

### 期望输出

```json
{
  "regulation": "劳工合同合规",
  "category": "S",
  "status": "yellow",
  "source_text": "根据泰国劳工保护法 Section 13，雇主须在雇员开始工作前签订书面雇佣合同，明确工资率、工作时间和休假安排",
  "source_ref": "泰国劳工保护法 Section 13",
  "ai_judgment": "根据评估标准，核心员工有合同但临时工缺少合同，判定为部分满足。部分员工（临时工）未签订书面合同，不符合法规对「所有员工」的要求。",
  "confidence": "high",
  "gap_description": "临时工和季节性工人缺少书面劳动合同，合同覆盖不完整",
  "suggestion": "建议使用标准化劳动合同模板，覆盖所有用工形式（含临时工和季节性工人）。确保合同包含法定最低条款：工资率、工时和休假安排。",
  "suggestion_confidence": "high",
  "difficulty": "容易",
  "estimated_time": "1-2周"
}
```

---

## 示例 3：治理（G）— 反腐败（置信度低的例子）

### 输入

```json
{
  "questionnaire_answers": [
    {
      "question_id": "g3",
      "question": "公司是否有反腐败和商业道德政策？",
      "answer": "没有正式文件，但老板要求做事合规"
    }
  ],
  "target_country": "singapore",
  "standard": "destination",
  "regulation_md_content": "## 合规检查项\n- [ ] 是否有书面的反腐败和商业道德政策\n- [ ] 是否对员工进行反腐败培训\n\n## 评估标准\n- 满足：有正式书面政策 + 定期培训\n- 部分满足：有基本政策但缺乏培训或执行记录\n- 不满足：无任何正式的反腐败政策文件\n\n## SME 常见差距\n多数中小企业依赖老板个人意志维持合规，缺少书面制度和培训体系。\n\n## 法规原文摘要\n新加坡 Prevention of Corruption Act (PCA) 要求企业建立反腐败内控机制..."
}
```

### 期望输出

```json
{
  "regulation": "反腐败与商业道德",
  "category": "G",
  "status": "red",
  "source_text": "新加坡 Prevention of Corruption Act (PCA) 要求企业建立反腐败内控机制",
  "source_ref": "新加坡 Prevention of Corruption Act (PCA)",
  "ai_judgment": "根据评估标准，企业无任何正式的反腐败书面政策文件，仅依赖管理层个人要求，判定为不满足。",
  "confidence": "high",
  "gap_description": "缺少书面反腐败政策和商业道德制度，无员工培训体系",
  "suggestion": "建议优先制定简版反腐败政策文件（2-3页即可），明确禁止商业贿赂、礼品申报等基本规则。同时安排全员培训并留存记录。",
  "suggestion_confidence": "medium",
  "difficulty": "容易",
  "estimated_time": "1-4周"
}
```

---

## 示例 4：BOCHK 准入视角（银行端）

### 输入

```json
{
  "questionnaire_answers": [
    {
      "question_id": "e1",
      "question": "贵公司有碳排放数据记录吗？",
      "answer": "部分有，有电费单和能耗统计，但没有做过碳审计"
    }
  ],
  "target_country": "thailand",
  "standard": "bochk",
  "regulation_md_content": "## 合规检查项\n- [ ] 企业碳排放强度是否低于行业平均水平20%以上\n- [ ] 是否提供经第三方认证的碳审计报告\n\n## 评估标准\n- 达标：碳排放强度低于行业均值20% + 有第三方碳审计报告\n- 部分达标：有减排措施但碳强度未达标或缺少审计报告\n- 未达标：无碳排放数据或碳强度高于行业均值\n\n## SME 常见差距\n多数中小企业未做过碳审计，无法提供碳排放强度数据。建议先完成基础碳盘查，再逐步优化。\n\n## 法规原文摘要\n根据BOCHK绿色金融产品手册，申请绿色融资的企业须提供碳排放强度低于行业平均水平的证明材料..."
}
```

### 期望输出

```json
{
  "regulation": "碳排放强度要求",
  "category": "E",
  "status": "red",
  "source_text": "根据BOCHK绿色金融产品手册，申请绿色融资的企业须提供碳排放强度低于行业平均水平的证明材料",
  "source_ref": "BOCHK绿色金融产品手册",
  "ai_judgment": "根据评估标准，企业仅有部分能耗数据，无碳审计报告，无法证明碳排放强度达标，判定为未达标。",
  "confidence": "high",
  "gap_description": "缺乏第三方碳审计报告，无法评估碳排放强度是否低于行业均值",
  "suggestion": "达标路径：1）先完成基础碳盘查（参考目的地法规合规建议）2）获取 ISO 14001 环境管理体系认证 3）达标后可申请绿色融资，享受利率优惠 0.5%-1.0%",
  "suggestion_confidence": "medium",
  "difficulty": "困难",
  "estimated_time": "6-12个月"
}
```

---

## 说明

| 示例 | 覆盖场景 | 要点 |
|------|---------|------|
| 示例 1 | E 类 / 部分满足 / 高置信度 | 最典型的使用场景，评估标准明确匹配 |
| 示例 2 | S 类 / 部分满足 / 高置信度 | 覆盖社会维度，问题具体（临时工） |
| 示例 3 | G 类 / 不满足 / 中置信度建议 | 覆盖治理维度 + 展示低置信度建议的情况 |
| 示例 4 | E 类 / BOCHK 准入视角 | 覆盖双标准中的银行端，展示与目的地法规的差异 |

**Prompt 中只放示例 1**（最典型、最完整的那个），其他示例用于开发者参考和测试。
