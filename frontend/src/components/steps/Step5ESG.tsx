/** Step 3: ESG 合规分析 — 双标准独立分析（目的地法规 + BOCHK 准入） */

import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  Inbox,
  CheckCircle,
  XCircle,
  FileText,
  Paperclip,
  Lightbulb,
  Zap,
  Clock,
  ClipboardList,
  AlertCircle,
  Calendar,
  ArrowRight,
} from "lucide-react"
import type { CompanyProfile, ESGAnalysis, Question } from "@/lib/types"
import { analyzeESG } from "@/lib/api"
import { BrandedLoading } from "@/components/shared/Loading"
import { toTraditional, isTraditionalChinese } from "@/lib/convertChinese"
import AIChineseNotice from "@/components/shared/AIChineseNotice"
import destZhCN from "@/data/questionnaire_destination.zh-CN.json"
import bochkZhCN from "@/data/questionnaire_bochk.zh-CN.json"

// ── 问卷动态导入（英文版懒加载）───────────────────────
let destEn: typeof destZhCN | null = null
let bochkEn: typeof bochkZhCN | null = null

// 尝试加载英文问卷（文件可能还未创建）
try {
  // @ts-ignore — 动态可选导入
  import("@/data/questionnaire_destination.en.json").then((m) => { destEn = m.default })
  // @ts-ignore
  import("@/data/questionnaire_bochk.en.json").then((m) => { bochkEn = m.default })
} catch { /* 英文问卷不可用时回退中文 */ }

// ── 类型断言 ────────────────────────────────────────────────
const DEST_ZH_CN = destZhCN as Question[]
const BOCHK_ZH_CN = bochkZhCN as Question[]

// ── Tab 键类型 & 按 Tab 隔离的数据结构 ──────────────────────
type TabKey = "destination" | "bochk"

interface TabData {
  answers: Record<string, string>
  result: ESGAnalysis | null
  expandedHints: Set<string>
}

// ── 市场名 → 地区代码映射 ───────────────────────────────────
const MARKET_TO_REGIONS: Record<string, string[]> = {
  "东南亚": ["SG", "TH"],
  "欧洲": ["EU"],
  "北美": [],
  "中东": [],
  "日韩": [],
}

const MARKET_ALIASES: Record<string, string> = {
  "新加坡": "东南亚", "泰国": "东南亚", "马来西亚": "东南亚", "越南": "东南亚",
  "印尼": "东南亚", "菲律宾": "东南亚", "缅甸": "东南亚", "柬埔寨": "东南亚",
  "港澳": "东南亚", "香港": "东南亚",
  "欧盟": "欧洲", "英国": "欧洲", "德国": "欧洲", "法国": "欧洲",
  "美国": "北美", "加拿大": "北美",
  "日本": "日韩", "韩国": "日韩",
}

function normalizeMarkets(markets: string[]): string[] {
  const result = new Set<string>()
  for (const m of markets) {
    if (MARKET_TO_REGIONS[m]) result.add(m)
    else if (MARKET_ALIASES[m]) result.add(MARKET_ALIASES[m])
  }
  return Array.from(result)
}

function getApplicableRegions(markets: string[]): string[] {
  const normalized = normalizeMarkets(markets)
  const regions = new Set<string>()
  for (const m of normalized) {
    for (const r of MARKET_TO_REGIONS[m] ?? []) regions.add(r)
  }
  return Array.from(regions)
}

const REGION_TO_COUNTRY: Record<string, string> = {
  SG: "singapore", TH: "thailand", HK: "hong_kong", EU: "eu",
}

const COUNTRY_TO_REGION: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_TO_COUNTRY).map(([region, country]) => [country, region])
)

function getTargetCountry(markets: string[]): string {
  const normalized = normalizeMarkets(markets)
  for (const m of normalized) {
    const regions = MARKET_TO_REGIONS[m] ?? []
    if (regions.length > 0) return REGION_TO_COUNTRY[regions[0]] ?? regions[0].toLowerCase()
  }
  return "singapore"
}

// ── 选项配置 ────────────────────────────────────────────────
const OPTION_KEYS = ["met", "partial", "not_met"] as const

const CATEGORY_KEYS = ["E", "S", "G"] as const

const STATUS_CONFIG = {
  green:  { key: "green", dotColor: "bg-esg-green",  borderColor: "border-l-esg-green",  bg: "bg-esg-green/5" },
  yellow: { key: "yellow", dotColor: "bg-esg-yellow", borderColor: "border-l-esg-yellow", bg: "bg-esg-yellow/5" },
  red:    { key: "red", dotColor: "bg-esg-red",    borderColor: "border-l-esg-red",    bg: "bg-esg-red/5" },
}

const URGENCY_ICONS = [AlertCircle, Clock, Calendar] as const

// ── 工具函数 ────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 70) return "#22C55E"
  if (score >= 40) return "#EAB308"
  return "#EF4444"
}

const GRADE_STYLE: Record<string, string> = {
  A: "bg-esg-green text-white",
  B: "bg-esg-yellow text-white",
  C: "bg-esg-red text-white",
}

const WEIGHTS: Record<string, number> = { E: 30, S: 35, G: 35 }

const DIFFICULTY_ORDER: Record<string, number> = {
  "高": 3, "困难": 3, "较高": 3, "high": 3,
  "中": 2, "中等": 2, "medium": 2,
  "低": 1, "容易": 1, "较低": 1, "low": 1,
}

const STATUS_URGENCY: Record<string, number> = { red: 3, yellow: 2, green: 1 }

// ── Props ───────────────────────────────────────────────────
interface Step5Props {
  profile: CompanyProfile
  onComplete: (result: ESGAnalysis | null) => void
}

// ── 主组件 ──────────────────────────────────────────────────
export default function Step5ESG({ profile, onComplete }: Step5Props) {
  const { t, i18n } = useTranslation()
  const convert = (text: string) => isTraditionalChinese() ? toTraditional(text) : text

  // 选择问卷源
  const isEn = i18n.language === "en"
  const DEST_QUESTIONS = (isEn && destEn ? destEn : DEST_ZH_CN) as Question[]
  const BOCHK_QUESTIONS = (isEn && bochkEn ? bochkEn : BOCHK_ZH_CN) as Question[]

  // Tab 状态
  const [activeTab, setActiveTab] = useState<TabKey>("destination")
  const [tabState, setTabState] = useState<Record<TabKey, TabData>>({
    destination: { answers: {}, result: null, expandedHints: new Set() },
    bochk:       { answers: {}, result: null, expandedHints: new Set() },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = tabState[activeTab]

  const applicableRegions = useMemo(
    () => getApplicableRegions(profile.export_markets),
    [profile.export_markets]
  )

  // 地区名称
  const regionName = (code: string) => t(`step3.regions.${code}`, code)
  const targetCountry = getTargetCountry(profile.export_markets)
  const targetRegionName = regionName(COUNTRY_TO_REGION[targetCountry] ?? "")

  const filteredQuestions = useMemo(() => {
    const source = activeTab === "destination" ? DEST_QUESTIONS : BOCHK_QUESTIONS
    if (activeTab === "bochk") return source
    return source.filter((q) =>
      (q.applicable_regions ?? []).some((r) => applicableRegions.includes(r))
    )
  }, [activeTab, applicableRegions, DEST_QUESTIONS, BOCHK_QUESTIONS])

  const groupedQuestions = useMemo(() => {
    const groups: Record<string, Question[]> = { E: [], S: [], G: [] }
    for (const q of filteredQuestions) {
      if (groups[q.category]) groups[q.category].push(q)
    }
    return groups
  }, [filteredQuestions])

  const totalQuestions = filteredQuestions.length
  const answeredCount = filteredQuestions.filter((q) => current.answers[q.id]).length

  const handleAnswer = (questionId: string, value: string) => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        answers: { ...prev[activeTab].answers, [questionId]: value },
      },
    }))
  }

  const toggleHint = (questionId: string) => {
    setTabState((prev) => {
      const hints = new Set(prev[activeTab].expandedHints)
      if (hints.has(questionId)) { hints.delete(questionId) } else { hints.add(questionId) }
      return { ...prev, [activeTab]: { ...prev[activeTab], expandedHints: hints } }
    })
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const answerList = Object.entries(current.answers)
        .filter(([qid]) => filteredQuestions.some((q) => q.id === qid))
        .map(([question_id, answer]) => ({ question_id, answer }))

      const res = await analyzeESG({
        profile,
        target_country: targetCountry,
        standard: activeTab,
        answers: answerList,
      })
      setTabState((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], result: res },
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "未知错误"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], result: null, expandedHints: new Set() },
    }))
    setError(null)
  }

  const otherTab: TabKey = activeTab === "destination" ? "bochk" : "destination"
  const otherResult = tabState[otherTab].result

  // ── 渲染：结果展示 ──────────────────────────────────────
  if (current.result) {
    const resultRegionText = activeTab === "bochk"
      ? t("step3.resultRegion.bochk")
      : t("step3.resultRegion.destination", { region: regionName(current.result.country) })

    const resultSubText = activeTab === "bochk"
      ? t("step3.resultSubText.bochk")
      : t("step3.resultSubText.destination", { region: regionName(current.result.country) })

    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <h2 className="text-xl font-semibold mb-2">{t("step3.resultTitle")}</h2>
        <p className="text-sm text-bochk-gray mb-2">{resultRegionText}</p>
        <p className="text-xs text-bochk-blue mb-6 inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {resultSubText}
        </p>

        <TabSwitcher
          activeTab={activeTab}
          tabState={tabState}
          applicableRegions={applicableRegions}
          onSwitch={setActiveTab}
          DEST_QUESTIONS={DEST_QUESTIONS}
          BOCHK_QUESTIONS={BOCHK_QUESTIONS}
          t={t}
        />

        <AIChineseNotice />

        <ScoreBoard result={current.result} t={t} />

        <div className="space-y-3 mb-6">
          {current.result.gaps.map((gap, i) => (
            <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
              <GapCard gap={gap} t={t} convert={convert} />
            </div>
          ))}
        </div>

        <RoadmapTimeline gaps={current.result.gaps} roadmap={current.result.roadmap} t={t} convert={convert} />

        {current.result.disclaimer && (
          <p className="text-xs text-bochk-gray mb-6 italic">{convert(current.result.disclaimer)}</p>
        )}

        {otherResult && (
          <div className="p-3 bg-bochk-light rounded border border-bochk-border text-sm text-bochk-gray mb-4">
            <span>
              {t("step3.otherTabCompleted", {
                tabName: otherTab === "destination" ? t("step3.otherTabDestination") : t("step3.otherTabBochk"),
                score: otherResult.overall_score,
                grade: otherResult.grade ?? "—",
              })}
            </span>
            <button
              onClick={() => setActiveTab(otherTab)}
              className="ml-2 text-bochk-blue hover:underline cursor-pointer inline-flex items-center gap-0.5"
            >
              {t("step3.viewResult")} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleReset} className="px-4 py-2 rounded border border-bochk-border text-sm hover:bg-gray-50 cursor-pointer">
            {t("step3.modifyResubmit")}
          </button>
          <button onClick={() => onComplete(current.result)} className="btn-primary text-sm">
            {t("step3.done")}
          </button>
        </div>
      </div>
    )
  }

  // ── 渲染：问卷填写 ──────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto relative">
      {loading && (
        <BrandedLoading
          messages={[
            t("step3.loading.msg1"),
            t("step3.loading.msg2"),
            t("step3.loading.msg3"),
            t("step3.loading.msg4"),
          ]}
        />
      )}

      <h2 className="text-xl font-semibold mb-2">{t("step3.title")}</h2>
      <p className="text-sm text-bochk-gray mb-2">
        {t("step3.subtitle", {
          industry: convert(profile.industry_tags[0]),
          markets: convert(profile.export_markets.join("、")) || "—",
        })}
      </p>
      <p className="text-xs text-bochk-blue mb-4 inline-flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {t("step3.analysisNote", { region: targetRegionName })}
        {applicableRegions.length > 1 && (
          <span className="text-bochk-gray ml-1">{t("step3.analysisNoteMulti")}</span>
        )}
      </p>

      <TabSwitcher
        activeTab={activeTab}
        tabState={tabState}
        applicableRegions={applicableRegions}
        onSwitch={setActiveTab}
        DEST_QUESTIONS={DEST_QUESTIONS}
        BOCHK_QUESTIONS={BOCHK_QUESTIONS}
        t={t}
      />

      <div className="text-xs text-bochk-gray mb-4">
        {t("step3.applicableRegions")}{applicableRegions.map((r) => regionName(r)).join("、") || t("step3.noMatchRegion")}
        {applicableRegions.length === 0 && activeTab === "destination" && (
          <span className="text-esg-yellow">{t("step3.noMatchHint")}</span>
        )}
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="card text-center py-12">
          <Inbox className="w-10 h-10 text-bochk-gray mx-auto mb-3" />
          <p className="text-sm text-bochk-gray">{t("step3.emptyTitle")}</p>
          <p className="text-xs text-bochk-gray mt-1">{t("step3.emptyHint")}</p>
        </div>
      ) : (
        <>
          {CATEGORY_KEYS.map((cat) => {
            const group = groupedQuestions[cat]
            if (!group || group.length === 0) return null
            const colorClass = cat === "E" ? "bg-esg-green" : cat === "S" ? "bg-bochk-blue" : "bg-bochk-gold"
            return (
              <div key={cat} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-5 h-5 rounded text-white text-xs flex items-center justify-center ${colorClass}`}>
                    {cat}
                  </span>
                  <span className="text-sm font-medium">{t(`step3.category.${cat}`)}</span>
                  <span className="text-xs text-bochk-gray">{t("step3.questionCount", { count: group.length })}</span>
                </div>

                <div className="space-y-3">
                  {group.map((q) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      answer={current.answers[q.id] ?? null}
                      hintExpanded={current.expandedHints.has(q.id)}
                      onAnswer={(v) => handleAnswer(q.id, v)}
                      onToggleHint={() => toggleHint(q.id)}
                      t={t}
                      convert={convert}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          <div className="card mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
              <span className="text-sm text-bochk-gray">
                {t("step3.progress", { answered: answeredCount, total: totalQuestions })}
              </span>
              <span className="text-xs text-bochk-gray inline-flex items-center gap-1">
                {answeredCount === totalQuestions ? (
                  <><CheckCircle className="w-4 h-4 text-esg-green" /> {t("step3.readyToSubmit")}</>
                ) : (
                  t("step3.needMore", { count: totalQuestions - answeredCount })
                )}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
              <div
                className="bg-bochk-red rounded-full h-1.5 transition-all duration-300"
                style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
              />
            </div>

            {error && (
              <div className="text-sm text-esg-red mb-3 inline-flex items-center gap-1">
                <XCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={answeredCount < totalQuestions || loading}
              className="btn-primary w-full text-sm"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("step3.analyzing")}
                </span>
              ) : (
                t("step3.submitAnalysis")
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── 子组件：问题卡片 ────────────────────────────────────────

function QuestionCard({
  question, answer, hintExpanded, onAnswer, onToggleHint, t, convert,
}: {
  question: Question
  answer: string | null
  hintExpanded: boolean
  onAnswer: (value: string) => void
  onToggleHint: () => void
  t: (key: string) => string
  convert: (text: string) => string
}) {
  const colorClass = question.category === "E" ? "bg-esg-green" : question.category === "S" ? "bg-bochk-blue" : "bg-bochk-gold"

  return (
    <div className="card">
      <div className="flex items-start gap-2 mb-3">
        <span className={`shrink-0 w-7 h-5 rounded text-white text-xs flex items-center justify-center ${colorClass}`}>
          {question.id}
        </span>
        <p className="text-sm leading-relaxed">{convert(question.question)}</p>
      </div>

      {question.hint && (
        <button onClick={onToggleHint} className="text-xs text-bochk-blue mb-2 cursor-pointer hover:underline">
          {hintExpanded ? t("step3.hideHint") : t("step3.showHint")}
        </button>
      )}
      {hintExpanded && question.hint && (
        <p className="text-xs text-bochk-gray bg-bochk-light rounded p-2 mb-3">{convert(question.hint)}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {OPTION_KEYS.map((value) => {
          const isActive = answer === value
          const activeClass = value === "met" ? "bg-esg-green text-white border-esg-green"
            : value === "partial" ? "bg-esg-yellow text-white border-esg-yellow"
            : "bg-esg-red text-white border-esg-red"
          const inactiveClass = value === "met" ? "border-esg-green text-esg-green hover:bg-esg-green/10"
            : value === "partial" ? "border-esg-yellow text-esg-yellow hover:bg-esg-yellow/10"
            : "border-esg-red text-esg-red hover:bg-esg-red/10"
          return (
            <button
              key={value}
              onClick={() => onAnswer(value)}
              className={`flex-1 px-3 py-2 rounded border text-xs font-medium transition-colors cursor-pointer ${
                isActive ? activeClass : inactiveClass
              }`}
            >
              {t(`step3.options.${value}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── 子组件：Tab 切换条 ──────────────────────────────────────

function TabSwitcher({
  activeTab, tabState, applicableRegions, onSwitch, DEST_QUESTIONS, BOCHK_QUESTIONS, t,
}: {
  activeTab: TabKey
  tabState: Record<TabKey, TabData>
  applicableRegions: string[]
  onSwitch: (tab: TabKey) => void
  DEST_QUESTIONS: Question[]
  BOCHK_QUESTIONS: Question[]
  t: (key: string) => string
}) {
  return (
    <div className="flex border-b border-bochk-border mb-6 overflow-x-auto">
      {(["destination", "bochk"] as const).map((tab) => {
        const tabData = tabState[tab]
        const source = tab === "destination" ? DEST_QUESTIONS : BOCHK_QUESTIONS
        const questions = tab === "bochk"
          ? source
          : source.filter((q) => (q.applicable_regions ?? []).some((r) => applicableRegions.includes(r)))
        const answered = questions.filter((q) => tabData.answers[q.id]).length
        const total = questions.length

        let statusText = ""
        if (tabData.result) statusText = t("step3.tabs.completed")
        else if (answered > 0) statusText = ` (${answered}/${total})`

        return (
          <button
            key={tab}
            onClick={() => onSwitch(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab
                ? "border-bochk-red text-bochk-red"
                : "border-transparent text-bochk-gray hover:text-bochk-dark"
            }`}
          >
            {tab === "destination" ? t("step3.tabs.destination") : t("step3.tabs.bochk")}
            {statusText && (
              <span className={tabData.result ? "text-esg-green" : "text-bochk-gray"}>
                {statusText}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── 子组件：评分看板 ────────────────────────────────────────

function ScoreBoard({ result, t }: { result: ESGAnalysis; t: (k: string) => string }) {
  const grade = result.grade ?? (result.overall_score >= 80 ? "A" : result.overall_score >= 60 ? "B" : "C")
  const catScores = result.category_scores ?? {}
  const categoriesToShow = CATEGORY_KEYS.filter((cat) => catScores[cat] !== undefined)

  const scoreDesc = result.overall_score >= 70 ? t("step3.score.good")
    : result.overall_score >= 40 ? t("step3.score.partial")
    : t("step3.score.poor")

  return (
    <>
      <div className="card mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 flex flex-col items-center justify-center shrink-0"
            style={{ borderColor: scoreColor(result.overall_score) }}>
            <span className="text-2xl font-bold">{result.overall_score}</span>
            <span className="text-xs text-bochk-gray">{t("step3.score.unit")}</span>
          </div>
          <div>
            <div className="text-lg font-semibold">{t("step3.score.title")}</div>
            <div className="text-sm text-bochk-gray">{scoreDesc}</div>
          </div>
        </div>
        <div className={`px-4 py-2 rounded text-center shrink-0 ${GRADE_STYLE[grade] ?? GRADE_STYLE.C}`}>
          <div className="text-xs opacity-80">{t("step3.score.grade")}</div>
          <div className="text-2xl font-bold">{grade}</div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="text-sm font-semibold mb-3">{t("step3.score.subScores")}</div>
        <div className="space-y-3">
          {categoriesToShow.map((cat) => {
            const colorClass = cat === "E" ? "bg-esg-green" : cat === "S" ? "bg-bochk-blue" : "bg-bochk-gold"
            const s = catScores[cat] ?? 0
            const w = WEIGHTS[cat]
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded text-white text-xs flex items-center justify-center font-medium shrink-0 ${colorClass}`}>
                  {cat}
                </span>
                <span className="text-sm w-10 shrink-0">{t(`step3.category.${cat}`)}</span>
                <span className="text-xs text-bochk-gray w-10 shrink-0">({w}%)</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-0">
                  <div className="rounded-full h-2 transition-all duration-500"
                    style={{ width: `${Math.max(s, 0)}%`, backgroundColor: scoreColor(s) }} />
                </div>
                <span className="text-sm font-medium w-8 text-right shrink-0" style={{ color: scoreColor(s) }}>
                  {s}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── 子组件：缺口卡片 ────────────────────────────────────────

function GapCard({ gap, t, convert }: { gap: ESGAnalysis["gaps"][number]; t: (k: string) => string; convert: (s: string) => string }) {
  const [expanded, setExpanded] = useState(false)
  const sc = STATUS_CONFIG[gap.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.yellow

  const confidenceStyle: Record<string, string> = {
    high: "bg-esg-green/10 text-esg-green",
    medium: "bg-esg-yellow/10 text-esg-yellow",
    low: "bg-esg-red/10 text-esg-red",
  }

  return (
    <div className={`card border-l-4 ${sc.borderColor} ${sc.bg}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-3 h-3 rounded-full shrink-0 ${sc.dotColor}`} />
          <span className="text-sm font-medium truncate">{convert(gap.regulation)}</span>
          <span className="text-xs text-bochk-gray shrink-0">({gap.category})</span>
        </div>
        <span className="text-xs font-medium shrink-0">{t(`step3.gapStatus.${sc.key}`)}</span>
      </div>

      <div className="mt-2 p-2 bg-bochk-blue/5 rounded border border-bochk-blue/10">
        <p className="text-sm text-bochk-dark">{convert(gap.ai_judgment)} — {convert(gap.gap_description)}</p>
      </div>

      {!expanded && (
        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="text-xs text-bochk-gray truncate inline-flex items-center gap-1">
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">{convert(gap.source_ref)}</span>
          </div>
          <button onClick={() => setExpanded(true)} className="text-xs text-bochk-blue cursor-pointer hover:underline shrink-0">
            {t("step3.gap.viewDetail")}
          </button>
        </div>
      )}

      {expanded && (
        <>
          <div className="mt-3 p-3 bg-white rounded border border-bochk-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-bochk-dark inline-flex items-center gap-1">
                <FileText className="w-4 h-4" /> {t("step3.gap.regulationOriginal")}
              </span>
              {gap.confidence && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${confidenceStyle[gap.confidence] ?? ""}`}>
                  {t("step3.gap.confidence")}{t(`step3.confidence.${gap.confidence}`)}
                </span>
              )}
            </div>
            <p className="text-sm text-bochk-dark leading-relaxed">{convert(gap.source_text)}</p>
            <div className="mt-2 pt-2 border-t border-bochk-border flex items-center gap-1">
              <span className="text-xs text-bochk-gray inline-flex items-center gap-1">
                <Paperclip className="w-4 h-4" /> {t("step3.gap.source")}
              </span>
              <span className="text-xs text-bochk-blue">{convert(gap.source_ref)}</span>
            </div>
          </div>

          <div className="mt-2 p-3 bg-esg-green/5 rounded border border-esg-green/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-esg-green inline-flex items-center gap-1">
                <Lightbulb className="w-4 h-4" /> {t("step3.gap.aiSuggestion")}
              </span>
              {gap.suggestion_confidence && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${confidenceStyle[gap.suggestion_confidence] ?? ""}`}>
                  {t("step3.gap.suggestionConfidence")}{t(`step3.confidence.${gap.suggestion_confidence}`)}
                </span>
              )}
            </div>
            <p className="text-sm text-bochk-dark leading-relaxed">{convert(gap.suggestion)}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-bochk-gray">
              <span className="inline-flex items-center gap-1">
                <Zap className="w-4 h-4" /> {t("step3.gap.difficulty")}{convert(gap.difficulty)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-4 h-4" /> {t("step3.gap.estimatedTime")}{convert(gap.estimated_time)}
              </span>
            </div>
          </div>

          <button onClick={() => setExpanded(false)} className="text-xs text-bochk-blue mt-2 cursor-pointer hover:underline">
            {t("step3.gap.collapse")}
          </button>
        </>
      )}
    </div>
  )
}

// ── 子组件：改善路线图 ──────────────────────────────────────

function RoadmapTimeline({
  gaps, roadmap, t, convert,
}: {
  gaps: ESGAnalysis["gaps"]
  roadmap?: string
  t: (k: string) => string
  convert: (s: string) => string
}) {
  const urgencyColors = [
    { color: "bg-esg-red", dotColor: "bg-esg-red", borderColor: "border-esg-red" },
    { color: "bg-esg-yellow", dotColor: "bg-esg-yellow", borderColor: "border-esg-yellow" },
    { color: "bg-esg-green", dotColor: "bg-esg-green", borderColor: "border-esg-green" },
  ]

  const actionGaps = gaps
    .filter((g) => g.status !== "green")
    .map((g) => ({
      ...g,
      urgency: STATUS_URGENCY[g.status] ?? 1,
      difficultyScore: DIFFICULTY_ORDER[g.difficulty] ?? 2,
    }))
    .sort((a, b) => {
      if (a.urgency !== b.urgency) return b.urgency - a.urgency
      return b.difficultyScore - a.difficultyScore
    })

  if (actionGaps.length === 0 && !roadmap) return null

  return (
    <div className="card mb-6">
      <h3 className="text-sm font-semibold mb-4 inline-flex items-center gap-1">
        <ClipboardList className="w-4 h-4" /> {t("step3.roadmap.title")}
      </h3>

      {actionGaps.length > 0 ? (
        <div className="relative pl-4 md:pl-6">
          <div className="absolute left-2 md:left-4 top-1 bottom-1 w-0.5 bg-gray-200" />
          <div className="space-y-4">
            {actionGaps.map((gap, i) => {
              const urgencyIdx = gap.status === "red" ? 0 : gap.status === "yellow" ? 1 : 2
              const cfg = urgencyColors[urgencyIdx]
              const Icon = URGENCY_ICONS[urgencyIdx]
              return (
                <div key={i} className="relative">
                  <div className={`absolute -left-6 md:-left-10 top-1 w-4 h-4 rounded-full ${cfg.dotColor} border-2 border-white shadow-sm`} />
                  <div className={`p-3 rounded border ${cfg.borderColor}/30 bg-white`}>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-xs text-white shrink-0 ${cfg.color}`}>
                          {gap.status === "red" ? t("step3.roadmap.urgent") : t("step3.roadmap.suggestion")}
                        </span>
                        <span className="text-sm font-medium text-bochk-dark truncate">{convert(gap.regulation)}</span>
                        <span className="text-xs text-bochk-gray shrink-0">({gap.category})</span>
                      </div>
                      <Icon className={`w-4 h-4 shrink-0 ${
                        urgencyIdx === 0 ? "text-esg-red" : urgencyIdx === 1 ? "text-esg-yellow" : "text-esg-green"
                      }`} />
                    </div>
                    <p className="text-xs text-bochk-dark mt-1">{convert(gap.suggestion)}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-bochk-gray">
                      <span className="inline-flex items-center gap-1">
                        <Zap className="w-4 h-4" /> {convert(gap.difficulty)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {convert(gap.estimated_time)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-sm text-esg-green text-center py-3 inline-flex items-center justify-center gap-1 w-full">
          <CheckCircle className="w-5 h-5" /> {t("step3.roadmap.allPassed")}
        </div>
      )}

      {roadmap && (
        <div className="mt-4 pt-3 border-t border-bochk-border">
          <div className="text-xs font-medium text-bochk-gray mb-2 inline-flex items-center gap-1">
            <ClipboardList className="w-4 h-4" /> {t("step3.roadmap.comprehensive")}
          </div>
          <p className="text-sm text-bochk-dark whitespace-pre-line">{convert(roadmap)}</p>
        </div>
      )}
    </div>
  )
}
