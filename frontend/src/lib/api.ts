/** API 请求封装 — 连接后端 FastAPI */

import type {
  CompanyInput,
  CompanyProfile,
  ProductRecommendation,
  ESGAnalysis,
  QuestionAnswer,
} from "./types"

// 部署时设 VITE_API_BASE="" (同源) 或具体 URL；本地默认 localhost
const _BASE = import.meta.env.VITE_API_BASE !== undefined
  ? import.meta.env.VITE_API_BASE
  : "http://localhost:8001"

const API_BASE = _BASE + "/api"

// ── Step 1: 企业画像 ────────────────────────────────

export async function generateProfile(
  input: CompanyInput
): Promise<{ profile: CompanyProfile }> {
  const res = await fetch(`${API_BASE}/profile/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`画像生成失败: ${res.status}`)
  return res.json()
}

// ── Step 4: 服务匹配 ────────────────────────────────

export async function getRecommendations(
  profile: CompanyProfile
): Promise<{ recommendations: ProductRecommendation[] }> {
  const res = await fetch(`${API_BASE}/matching/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  })
  if (!res.ok) throw new Error(`产品推荐失败: ${res.status}`)
  return res.json()
}

// ── Step 5: ESG 分析 ────────────────────────────────

export async function analyzeESG(data: {
  profile: CompanyProfile
  target_country: string
  standard: string
  answers: QuestionAnswer[]
}): Promise<ESGAnalysis> {
  const res = await fetch(`${API_BASE}/esg/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`ESG 分析失败: ${res.status}`)
  return res.json()
}

// ── 健康检查 ────────────────────────────────────────

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${_BASE}/`)
    return res.ok
  } catch {
    return false
  }
}
