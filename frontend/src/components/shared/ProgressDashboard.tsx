/** 进度看板 — 出海准备度总览：聚合三步完成状态 */

import { useTranslation } from "react-i18next"
import type { LucideIcon } from "lucide-react"
import { Building2, Landmark, Leaf, CheckCircle } from "lucide-react"
import type { CompanyProfile, ProductRecommendation, ESGAnalysis } from "@/lib/types"

// ── Props ───────────────────────────────────────────────────
interface ProgressDashboardProps {
  profileCompleted: boolean
  profile: CompanyProfile | null
  matchingCompleted: boolean
  recommendations: ProductRecommendation[] | null
  esgCompleted: boolean
  esgResult: ESGAnalysis | null
}

// ── 进度计算 ────────────────────────────────────────────────
function calcProgress(props: ProgressDashboardProps): number {
  let p = 0
  if (props.profileCompleted) p += 33
  if (props.matchingCompleted) p += 34
  if (props.esgCompleted) p += 33
  return p
}

// ── 主组件 ──────────────────────────────────────────────────
export default function ProgressDashboard(props: ProgressDashboardProps) {
  const { t } = useTranslation()
  const progress = calcProgress(props)

  // 无任何进度时不显示
  if (progress === 0) return null

  return (
    <div className="mb-6">
      {/* 总进度条 */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-semibold text-bochk-dark shrink-0">{t("dashboard.readiness")}</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-bochk-red rounded-full h-2 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-medium text-bochk-red shrink-0">{progress}%</span>
      </div>

      {/* 三步卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 企业画像 */}
        <StepCard
          icon={Building2}
          step="Step 1"
          label={t("dashboard.steps.s1")}
          completed={props.profileCompleted}
        >
          {props.profileCompleted && props.profile ? (
            <div className="space-y-1">
              <div className="text-xs text-bochk-dark font-medium">
                {props.profile.industry_tags[0] ?? "—"} · {props.profile.size_level}
              </div>
              <div className="flex flex-wrap gap-1">
                {props.profile.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 bg-bochk-red/10 text-bochk-red text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="text-xs text-bochk-gray">
                {t("dashboard.readinessScore")}<span className="font-medium text-bochk-dark">{props.profile.readiness_score}</span>/100
              </div>
            </div>
          ) : (
            <div className="text-xs text-bochk-gray">{t("dashboard.fillInfo")}</div>
          )}
        </StepCard>

        {/* 服务匹配 */}
        <StepCard
          icon={Landmark}
          step="Step 2"
          label={t("dashboard.steps.s2")}
          completed={props.matchingCompleted}
        >
          {props.matchingCompleted && props.recommendations && props.recommendations.length > 0 ? (
            <div className="space-y-1">
              <div className="text-xs text-bochk-dark font-medium">
                {t("dashboard.matched", { count: props.recommendations.length })}
              </div>
              <div className="flex flex-wrap gap-1">
                {props.recommendations.slice(0, 2).map((r) => (
                  <span key={r.product_id} className="px-1.5 py-0.5 bg-bochk-blue/10 text-bochk-blue text-xs rounded">
                    {r.product_name}
                  </span>
                ))}
                {props.recommendations.length > 2 && (
                  <span className="px-1.5 py-0.5 bg-gray-100 text-bochk-gray text-xs rounded">
                    +{props.recommendations.length - 2}
                  </span>
                )}
              </div>
              <div className="text-xs text-bochk-gray">
                {t("dashboard.maxMatch")}<span className="font-medium text-esg-green">{Math.max(...props.recommendations.map((r) => r.match_score))}%</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-bochk-gray">{t("dashboard.matchHint")}</div>
          )}
        </StepCard>

        {/* ESG 合规 */}
        <StepCard
          icon={Leaf}
          step="Step 3"
          label={t("dashboard.steps.s3")}
          completed={props.esgCompleted}
        >
          {props.esgCompleted && props.esgResult ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color: scoreColor(props.esgResult.overall_score) }}>
                  {props.esgResult.overall_score}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${gradeStyle(props.esgResult.grade)}`}>
                  {props.esgResult.grade ?? "—"}{t("dashboard.gradeLabel")}
                </span>
              </div>
              <div className="flex gap-2 text-xs">
                {(["E", "S", "G"] as const)
                  .filter((cat) => props.esgResult!.category_scores[cat] !== undefined)
                  .map((cat) => (
                    <span key={cat}>
                      {cat}: <span className="font-medium">{props.esgResult!.category_scores[cat]}</span>
                    </span>
                  ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-bochk-gray">{t("dashboard.esgHint")}</div>
          )}
        </StepCard>
      </div>
    </div>
  )
}

// ── 子组件：步骤卡片 ────────────────────────────────────────
function StepCard({
  icon: Icon,
  step,
  label,
  completed,
  children,
}: {
  icon: LucideIcon
  step: string
  label: string
  completed: boolean
  children: React.ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className={`card ${completed ? "border-l-3 border-l-esg-green" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-bochk-red" />
        <span className="text-xs text-bochk-gray">{step}</span>
        <span className="text-sm font-medium">{label}</span>
        {completed ? (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-esg-green font-medium">
            <CheckCircle className="w-4 h-4" /> {t("dashboard.completed")}
          </span>
        ) : (
          <span className="ml-auto text-xs text-bochk-gray">{t("dashboard.pending")}</span>
        )}
      </div>
      {children}
    </div>
  )
}

// ── 工具函数 ────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 70) return "#22C55E"
  if (score >= 40) return "#EAB308"
  return "#EF4444"
}

function gradeStyle(grade?: string): string {
  if (grade === "A") return "bg-esg-green text-white"
  if (grade === "B") return "bg-esg-yellow text-white"
  return "bg-esg-red text-white"
}
