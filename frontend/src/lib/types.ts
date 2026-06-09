/** 智企通 GoGlobal Navigator — TypeScript 类型定义 */

// ── Step 1: 企业画像 ────────────────────────────────

/** 企业信息输入 */
export interface CompanyInput {
  company_name: string
  industry: string
  size: string
  description: string
  export_experience: string
}

/** 企业画像输出 */
export interface CompanyProfile {
  industry_tags: string[]
  size_level: string
  trade_capability: string
  export_markets: string[]
  readiness_score: number
  tags: string[]
}

// ── Step 4: 服务匹配 ────────────────────────────────

/** 产品推荐 */
export interface ProductRecommendation {
  product_id: string
  product_name: string
  match_score: number
  amount_range: string
  reason: string
  advice: string
}

// ── Step 5: ESG 分析 ────────────────────────────────

/** ESG 合规缺口 */
export interface ESGGap {
  regulation: string
  category: "E" | "S" | "G"
  status: "red" | "yellow" | "green"
  source_text: string
  source_ref: string
  ai_judgment: string
  confidence: "high" | "medium" | "low"
  gap_description: string
  suggestion: string
  suggestion_confidence: "high" | "medium" | "low"
  difficulty: string
  estimated_time: string
}

/** ESG 分析结果 */
export interface ESGAnalysis {
  overall_score: number
  country: string
  standard: "destination" | "bochk"
  gaps: ESGGap[]
  roadmap: string
  disclaimer: string
}

// ── 通用 ────────────────────────────────────────────

/** 向导步骤 */
export type WizardStep = 1 | 4 | 5

/** 问卷回答 */
export interface QuestionAnswer {
  question_id: string
  answer: string
}
