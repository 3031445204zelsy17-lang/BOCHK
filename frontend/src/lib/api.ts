/** API 请求封装 — 连接后端 FastAPI */

import i18n from "@/i18n"
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
  : "http://localhost:8000"

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
  if (!res.ok) throw new Error(i18n.t("api.errors.profile", { status: res.status }))
  return res.json()
}

// ── Step 2: 服务匹配 ────────────────────────────────

export async function getRecommendations(
  profile: CompanyProfile
): Promise<{ recommendations: ProductRecommendation[] }> {
  const res = await fetch(`${API_BASE}/matching/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  })
  if (!res.ok) throw new Error(i18n.t("api.errors.matching", { status: res.status }))
  return res.json()
}

// ── Step 3: ESG 分析 ────────────────────────────────

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
  if (!res.ok) throw new Error(i18n.t("api.errors.esg", { status: res.status }))
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
