/** Step 5: ESG 合规分析 — 双标准独立分析（目的地法规 + BOCHK 准入） */

import { useState, useMemo } from "react"
import type { CompanyProfile, ESGAnalysis, Question } from "@/lib/types"
import { analyzeESG } from "@/lib/api"
import destinationQuestions from "@/data/questionnaire_destination.json"
import bochkQuestions from "@/data/questionnaire_bochk.json"

// ── 类型断言 ────────────────────────────────────────────────
const DEST_QUESTIONS = destinationQuestions as Question[]
const BOCHK_QUESTIONS = bochkQuestions as Question[]

// ── Tab 键类型 & 按 Tab 隔离的数据结构 ──────────────────────
type TabKey = "destination" | "bochk"

interface TabData {
  answers: Record<string, string>   // question_id → "met"|"partial"|"not_met"
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

/** 从企业画像的 export_markets 提取所有适用地区代码 */
function getApplicableRegions(markets: string[]): string[] {
  const regions = new Set<string>()
  for (const m of markets) {
    for (const r of MARKET_TO_REGIONS[m] ?? []) {
      regions.add(r)
    }
  }
  return Array.from(regions)
}

/** 地区代码 → 中文名 */
const REGION_NAMES: Record<string, string> = {
  HK: "香港",
  SG: "新加坡",
  TH: "泰国",
  EU: "欧盟",
  BOCHK: "BOCHK 标准",
}

/** 目标市场 → 主要 target_country（取第一个匹配，返回后端期望的格式） */
const REGION_TO_COUNTRY: Record<string, string> = {
  SG: "singapore",
  TH: "thailand",
  HK: "hong_kong",
  EU: "eu",
}

function getTargetCountry(markets: string[]): string {
  for (const m of markets) {
    const regions = MARKET_TO_REGIONS[m] ?? []
    if (regions.length > 0) return REGION_TO_COUNTRY[regions[0]] ?? regions[0].toLowerCase()
  }
  return "thailand" // 默认泰国
}

// ── Props ───────────────────────────────────────────────────
interface Step5Props {
  profile: CompanyProfile
  onComplete: (result: ESGAnalysis | null) => void
}

// ── 选项配置 ────────────────────────────────────────────────
const OPTION_CONFIG = {
  met:     { label: "满足",     activeClass: "bg-esg-green text-white border-esg-green",     inactiveClass: "border-esg-green text-esg-green hover:bg-esg-green/10" },
  partial: { label: "部分满足", activeClass: "bg-esg-yellow text-white border-esg-yellow",    inactiveClass: "border-esg-yellow text-esg-yellow hover:bg-esg-yellow/10" },
  not_met: { label: "不满足",   activeClass: "bg-esg-red text-white border-esg-red",          inactiveClass: "border-esg-red text-esg-red hover:bg-esg-red/10" },
} as const

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  E: { label: "环境", color: "bg-esg-green" },
  S: { label: "社会", color: "bg-bochk-blue" },
  G: { label: "治理", color: "bg-bochk-gold" },
}

// ── 主组件 ──────────────────────────────────────────────────
export default function Step5ESG({ profile, onComplete }: Step5Props) {
  // Tab: destination（目的地法规） / bochk（BOCHK 准入）
  const [activeTab, setActiveTab] = useState<TabKey>("destination")
  // 按 tab 隔离的状态：每个 tab 有独立的 answers / result / hints
  const [tabState, setTabState] = useState<Record<TabKey, TabData>>({
    destination: { answers: {}, result: null, expandedHints: new Set() },
    bochk:       { answers: {}, result: null, expandedHints: new Set() },
  })
  // 瞬态 UI 状态（不属于特定 tab）
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 当前 tab 的数据引用
  const current = tabState[activeTab]

  // 根据目标市场过滤适用问题
  const applicableRegions = useMemo(
    () => getApplicableRegions(profile.export_markets),
    [profile.export_markets]
  )

  const filteredQuestions = useMemo(() => {
    const source = activeTab === "destination" ? DEST_QUESTIONS : BOCHK_QUESTIONS
    if (activeTab === "bochk") return source // BOCHK 问卷全部适用
    return source.filter((q) =>
      (q.applicable_regions ?? []).some((r) => applicableRegions.includes(r))
    )
  }, [activeTab, applicableRegions])

  // 按 E/S/G 分组
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, Question[]> = { E: [], S: [], G: [] }
    for (const q of filteredQuestions) {
      if (groups[q.category]) groups[q.category].push(q)
    }
    return groups
  }, [filteredQuestions])

  // 进度统计（只统计当前 tab 的问题）
  const totalQuestions = filteredQuestions.length
  const answeredCount = filteredQuestions.filter((q) => current.answers[q.id]).length

  // 选择答案 — 只更新当前 tab
  const handleAnswer = (questionId: string, value: string) => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        answers: { ...prev[activeTab].answers, [questionId]: value },
      },
    }))
  }

  // 切换 hint — 只更新当前 tab
  const toggleHint = (questionId: string) => {
    setTabState((prev) => {
      const hints = new Set(prev[activeTab].expandedHints)
      if (hints.has(questionId)) hints.delete(questionId)
      else hints.add(questionId)
      return {
        ...prev,
        [activeTab]: { ...prev[activeTab], expandedHints: hints },
      }
    })
  }

  // 提交分析
  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const answerList = Object.entries(current.answers)
        .filter(([qid]) => filteredQuestions.some((q) => q.id === qid))
        .map(([question_id, answer]) => ({ question_id, answer }))

      const res = await analyzeESG({
        profile,
        target_country: getTargetCountry(profile.export_markets),
        standard: activeTab,
        answers: answerList,
      })
      // 结果存入当前 tab
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

  // 重新填写 — 只重置当前 tab
  const handleReset = () => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: {
        answers: {},
        result: null,
        expandedHints: new Set(),
      },
    }))
    setError(null)
  }

  // 另一个 tab 的引用（用于交叉提示）
  const otherTab: TabKey = activeTab === "destination" ? "bochk" : "destination"
  const otherResult = tabState[otherTab].result

  // ── 渲染：结果展示 ──────────────────────────────────────
  if (current.result) {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold mb-2">ESG 合规分析结果</h2>
        <p className="text-sm text-bochk-gray mb-6">
          {REGION_NAMES[current.result.country] ?? current.result.country} · {activeTab === "destination" ? "目的地法规" : "BOCHK 准入"}标准
        </p>

        {/* 总分 + 等级 + 分项评分 */}
        <ScoreBoard result={current.result} />

        {/* 缺口卡片 */}
        <div className="space-y-3 mb-6">
          {current.result.gaps.map((gap, i) => (
            <GapCard key={i} gap={gap} />
          ))}
        </div>

        {/* 改善路线图时间线 */}
        <RoadmapTimeline gaps={current.result.gaps} roadmap={current.result.roadmap} />

        {/* 免责声明 */}
        {current.result.disclaimer && (
          <p className="text-xs text-bochk-gray mb-6 italic">{current.result.disclaimer}</p>
        )}

        {/* 另一个 tab 完成提示 */}
        {otherResult && (
          <div className="p-3 bg-bochk-light rounded border border-bochk-border text-sm text-bochk-gray mb-4">
            <span>
              {otherTab === "destination" ? "目的地法规分析" : "BOCHK 准入评估"}已完成（评分 {otherResult.overall_score}，等级 {otherResult.grade ?? "—"}）
            </span>
            <button
              onClick={() => setActiveTab(otherTab)}
              className="ml-2 text-bochk-blue hover:underline cursor-pointer"
            >
              查看结果 →
            </button>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button onClick={handleReset} className="px-4 py-2 rounded border border-bochk-border text-sm hover:bg-gray-50 cursor-pointer">
            重新分析
          </button>
          <button onClick={() => onComplete(current.result)} className="btn-primary text-sm">
            完成
          </button>
        </div>
      </div>
    )
  }

  // ── 渲染：问卷填写 ──────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">ESG 合规分析</h2>
      <p className="text-sm text-bochk-gray mb-4">
        基于「{profile.industry_tags[0]}」行业 · 目标市场: {profile.export_markets.join("、") || "未选择"}
      </p>

      {/* Tab 切换（含完成状态） */}
      <div className="flex border-b border-bochk-border mb-6">
        {(["destination", "bochk"] as const).map((tab) => {
          const tabData = tabState[tab]
          // 计算该 tab 的进度
          const source = tab === "destination" ? DEST_QUESTIONS : BOCHK_QUESTIONS
          const questions = tab === "bochk"
            ? source
            : source.filter((q) => (q.applicable_regions ?? []).some((r) => applicableRegions.includes(r)))
          const answered = questions.filter((q) => tabData.answers[q.id]).length
          const total = questions.length

          // 状态文字
          let statusText = ""
          if (tabData.result) {
            statusText = " (已完成)"
          } else if (answered > 0) {
            statusText = ` (${answered}/${total})`
          }

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                activeTab === tab
                  ? "border-bochk-red text-bochk-red"
                  : "border-transparent text-bochk-gray hover:text-bochk-dark"
              }`}
            >
              {tab === "destination" ? "目的地法规分析" : "BOCHK 准入评估"}
              {statusText && (
                <span className={tabData.result ? "text-esg-green" : "text-bochk-gray"}>
                  {statusText}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 适用地区提示 */}
      <div className="text-xs text-bochk-gray mb-4">
        适用地区: {applicableRegions.map((r) => REGION_NAMES[r]).join("、") || "无匹配地区"}
        {applicableRegions.length === 0 && activeTab === "destination" && (
          <span className="text-esg-yellow"> — 目标市场暂无对应法规，可切换到 BOCHK 准入评估</span>
        )}
      </div>

      {/* 问题列表 */}
      {filteredQuestions.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-sm text-bochk-gray">当前目标市场暂无对应 ESG 法规问卷</p>
          <p className="text-xs text-bochk-gray mt-1">请切换到 BOCHK 准入评估，或返回 Step 1 选择其他目标市场</p>
        </div>
      ) : (
        <>
          {(["E", "S", "G"] as const).map((cat) => {
            const group = groupedQuestions[cat]
            if (!group || group.length === 0) return null
            const cfg = CATEGORY_CONFIG[cat]
            return (
              <div key={cat} className="mb-6">
                {/* 分组标题 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-5 h-5 rounded text-white text-xs flex items-center justify-center ${cfg.color}`}>
                    {cat}
                  </span>
                  <span className="text-sm font-medium">{cfg.label}</span>
                  <span className="text-xs text-bochk-gray">({group.length}题)</span>
                </div>

                {/* 问题卡片 */}
                <div className="space-y-3">
                  {group.map((q) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      answer={current.answers[q.id] ?? null}
                      hintExpanded={current.expandedHints.has(q.id)}
                      onAnswer={(v) => handleAnswer(q.id, v)}
                      onToggleHint={() => toggleHint(q.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* 进度 + 提交 */}
          <div className="card mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-bochk-gray">
                已完成 {answeredCount}/{totalQuestions} 题
              </span>
              <span className="text-xs text-bochk-gray">
                {answeredCount === totalQuestions ? "✅ 可以提交" : `还需 ${totalQuestions - answeredCount} 题`}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
              <div
                className="bg-bochk-red rounded-full h-1.5 transition-all duration-300"
                style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
              />
            </div>

            {error && (
              <div className="text-sm text-esg-red mb-3">❌ {error}</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={answeredCount < totalQuestions || loading}
              className="btn-primary w-full text-sm"
            >
              {loading ? "⏳ 正在分析合规缺口..." : "提交分析"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── 子组件：问题卡片 ────────────────────────────────────────

function QuestionCard({
  question,
  answer,
  hintExpanded,
  onAnswer,
  onToggleHint,
}: {
  question: Question
  answer: string | null
  hintExpanded: boolean
  onAnswer: (value: string) => void
  onToggleHint: () => void
}) {
  return (
    <div className="card">
      {/* 题号 + 题目 */}
      <div className="flex items-start gap-2 mb-3">
        <span className={`shrink-0 w-7 h-5 rounded text-white text-xs flex items-center justify-center ${
          CATEGORY_CONFIG[question.category]?.color ?? "bg-gray-400"
        }`}>
          {question.id}
        </span>
        <p className="text-sm leading-relaxed">{question.question}</p>
      </div>

      {/* Hint 折叠 */}
      {question.hint && (
        <button onClick={onToggleHint} className="text-xs text-bochk-blue mb-2 cursor-pointer hover:underline">
          {hintExpanded ? "收起提示 ▲" : "查看提示 ▼"}
        </button>
      )}
      {hintExpanded && question.hint && (
        <p className="text-xs text-bochk-gray bg-bochk-light rounded p-2 mb-3">{question.hint}</p>
      )}

      {/* 选项按钮 */}
      <div className="flex gap-2">
        {(["met", "partial", "not_met"] as const).map((value) => {
          const cfg = OPTION_CONFIG[value]
          const isActive = answer === value
          return (
            <button
              key={value}
              onClick={() => onAnswer(value)}
              className={`flex-1 px-3 py-2 rounded border text-xs font-medium transition-colors cursor-pointer ${
                isActive ? cfg.activeClass : cfg.inactiveClass
              }`}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── 子组件：评分看板（总分 + 等级 + E/S/G 分项） ─────────────

/** 分数 → 交通灯颜色 */
function scoreColor(score: number): string {
  if (score >= 70) return "#22C55E"
  if (score >= 40) return "#EAB308"
  return "#EF4444"
}

/** 等级 → 样式 */
const GRADE_STYLE: Record<string, string> = {
  A: "bg-esg-green text-white",
  B: "bg-esg-yellow text-white",
  C: "bg-esg-red text-white",
}

/** 权重配置 */
const WEIGHTS: Record<string, number> = { E: 30, S: 35, G: 35 }

function ScoreBoard({ result }: { result: ESGAnalysis }) {
  const grade = result.grade ?? (result.overall_score >= 80 ? "A" : result.overall_score >= 60 ? "B" : "C")
  const catScores = result.category_scores ?? {}

  return (
    <>
      {/* 总分 + 等级 */}
      <div className="card mb-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center"
            style={{ borderColor: scoreColor(result.overall_score) }}>
            <span className="text-2xl font-bold">{result.overall_score}</span>
            <span className="text-xs text-bochk-gray">分</span>
          </div>
          <div>
            <div className="text-lg font-semibold">综合合规评分</div>
            <div className="text-sm text-bochk-gray">
              {result.overall_score >= 70 ? "合规状况良好" : result.overall_score >= 40 ? "部分合规，需改善" : "合规缺口较大，需重点关注"}
            </div>
          </div>
        </div>
        {/* 等级徽章 */}
        <div className={`px-4 py-2 rounded text-center ${GRADE_STYLE[grade] ?? GRADE_STYLE.C}`}>
          <div className="text-xs opacity-80">等级</div>
          <div className="text-2xl font-bold">{grade}</div>
        </div>
      </div>

      {/* E/S/G 分项评分 */}
      <div className="card mb-6">
        <div className="text-sm font-semibold mb-3">分项评分</div>
        <div className="space-y-3">
          {(["E", "S", "G"] as const).map((cat) => {
            const cfg = CATEGORY_CONFIG[cat]
            const s = catScores[cat] ?? 0
            const w = WEIGHTS[cat]
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded text-white text-xs flex items-center justify-center font-medium ${cfg.color}`}>
                  {cat}
                </span>
                <span className="text-sm w-10">{cfg.label}</span>
                <span className="text-xs text-bochk-gray w-10">({w}%)</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="rounded-full h-2 transition-all duration-500"
                    style={{ width: `${Math.max(s, 0)}%`, backgroundColor: scoreColor(s) }} />
                </div>
                <span className="text-sm font-medium w-8 text-right" style={{ color: scoreColor(s) }}>
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

function GapCard({ gap }: { gap: ESGAnalysis["gaps"][number] }) {
  const [expanded, setExpanded] = useState(false)

  const statusConfig = {
    green:  { label: "满足",     icon: "🟢", borderColor: "border-l-esg-green",  bg: "bg-esg-green/5" },
    yellow: { label: "部分满足", icon: "🟡", borderColor: "border-l-esg-yellow", bg: "bg-esg-yellow/5" },
    red:    { label: "不满足",   icon: "🔴", borderColor: "border-l-esg-red",    bg: "bg-esg-red/5" },
  }
  const sc = statusConfig[gap.status as keyof typeof statusConfig] ?? statusConfig.yellow

  // 置信度标签样式
  const confidenceStyle: Record<string, string> = {
    high:   "bg-esg-green/10 text-esg-green",
    medium: "bg-esg-yellow/10 text-esg-yellow",
    low:    "bg-esg-red/10 text-esg-red",
  }
  const confidenceLabel: Record<string, string> = { high: "高", medium: "中", low: "低" }

  return (
    <div className={`card border-l-4 ${sc.borderColor} ${sc.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{sc.icon}</span>
          <span className="text-sm font-medium">{gap.regulation}</span>
          <span className="text-xs text-bochk-gray">({gap.category})</span>
        </div>
        <span className="text-xs font-medium">{sc.label}</span>
      </div>

      {/* AI 判断（蓝色层） */}
      <div className="mt-2 p-2 bg-bochk-blue/5 rounded border border-bochk-blue/10">
        <p className="text-sm text-bochk-dark">{gap.ai_judgment} — {gap.gap_description}</p>
      </div>

      {/* 收起状态：来源摘要行 */}
      {!expanded && (
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-bochk-gray truncate max-w-[80%]">
            📄 {gap.source_ref}
          </div>
          <button onClick={() => setExpanded(true)} className="text-xs text-bochk-blue cursor-pointer hover:underline shrink-0 ml-2">
            查看详情 ▼
          </button>
        </div>
      )}

      {/* 展开详情 */}
      {expanded && (
        <>
          {/* 法规原文（白色层） */}
          <div className="mt-3 p-3 bg-white rounded border border-bochk-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-bochk-dark">📄 法规原文</span>
              {gap.confidence && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${confidenceStyle[gap.confidence] ?? ""}`}>
                  置信度: {confidenceLabel[gap.confidence] ?? gap.confidence}
                </span>
              )}
            </div>
            <p className="text-sm text-bochk-dark leading-relaxed">{gap.source_text}</p>
            <div className="mt-2 pt-2 border-t border-bochk-border flex items-center gap-1">
              <span className="text-xs text-bochk-gray">📎 来源:</span>
              <span className="text-xs text-bochk-blue">{gap.source_ref}</span>
            </div>
          </div>

          {/* AI 建议（绿色层） */}
          <div className="mt-2 p-3 bg-esg-green/5 rounded border border-esg-green/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-esg-green">💡 AI 建议</span>
              {gap.suggestion_confidence && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${confidenceStyle[gap.suggestion_confidence] ?? ""}`}>
                  建议置信度: {confidenceLabel[gap.suggestion_confidence] ?? gap.suggestion_confidence}
                </span>
              )}
            </div>
            <p className="text-sm text-bochk-dark leading-relaxed">{gap.suggestion}</p>
            <div className="flex gap-4 mt-2 text-xs text-bochk-gray">
              <span>⚡ 难度: {gap.difficulty}</span>
              <span>⏱ 预计: {gap.estimated_time}</span>
            </div>
          </div>

          <button onClick={() => setExpanded(false)} className="text-xs text-bochk-blue mt-2 cursor-pointer hover:underline">
            收起 ▲
          </button>
        </>
      )}
    </div>
  )
}

// ── 子组件：改善路线图时间线 ──────────────────────────────────

/** 难度 → 数值（用于排序） */
const DIFFICULTY_ORDER: Record<string, number> = {
  "高": 3, "困难": 3, "较高": 3, "high": 3,
  "中": 2, "中等": 2, "medium": 2,
  "低": 1, "容易": 1, "较低": 1, "low": 1,
}

/** 状态 → 紧急度 */
const STATUS_URGENCY: Record<string, number> = { red: 3, yellow: 2, green: 1 }

/** 紧急度 → 颜色和标签 */
const URGENCY_CONFIG = [
  { key: "urgent", label: "🔴 立即行动", color: "bg-esg-red", dotColor: "bg-esg-red", borderColor: "border-esg-red" },
  { key: "short",   label: "🟡 短期改善", color: "bg-esg-yellow", dotColor: "bg-esg-yellow", borderColor: "border-esg-yellow" },
  { key: "medium",  label: "🟢 长期规划",  color: "bg-esg-green", dotColor: "bg-esg-green", borderColor: "border-esg-green" },
] as const

function RoadmapTimeline({ gaps, roadmap }: { gaps: ESGAnalysis["gaps"]; roadmap?: string }) {
  // 筛选非绿色缺口，按紧急度×难度排序
  const actionGaps = gaps
    .filter((g) => g.status !== "green")
    .map((g) => ({
      ...g,
      urgency: STATUS_URGENCY[g.status] ?? 1,
      difficultyScore: DIFFICULTY_ORDER[g.difficulty] ?? 2,
    }))
    .sort((a, b) => {
      // 先按紧急度降序，再按难度降序
      if (a.urgency !== b.urgency) return b.urgency - a.urgency
      return b.difficultyScore - a.difficultyScore
    })

  if (actionGaps.length === 0 && !roadmap) return null

  return (
    <div className="card mb-6">
      <h3 className="text-sm font-semibold mb-4">📋 改善路线图</h3>

      {actionGaps.length > 0 ? (
        <div className="relative pl-6">
          {/* 竖向时间轴线 */}
          <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {actionGaps.map((gap, i) => {
              const urgency = gap.status === "red" ? 0 : gap.status === "yellow" ? 1 : 2
              const cfg = URGENCY_CONFIG[urgency]
              return (
                <div key={i} className="relative">
                  {/* 时间轴圆点 */}
                  <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full ${cfg.dotColor} border-2 border-white shadow-sm`} />

                  {/* 内容卡片 */}
                  <div className={`p-3 rounded border ${cfg.borderColor}/30 bg-white`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs text-white ${cfg.color}`}>
                          {gap.status === "red" ? "紧急" : "建议"}
                        </span>
                        <span className="text-sm font-medium text-bochk-dark">{gap.regulation}</span>
                        <span className="text-xs text-bochk-gray">({gap.category})</span>
                      </div>
                    </div>
                    <p className="text-xs text-bochk-dark mt-1">{gap.suggestion}</p>
                    <div className="flex gap-3 mt-2 text-xs text-bochk-gray">
                      <span>⚡ {gap.difficulty}</span>
                      <span>⏱ {gap.estimated_time}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-sm text-esg-green text-center py-3">
          ✅ 所有合规项已满足，暂无改善建议
        </div>
      )}

      {/* LLM 综合说明 */}
      {roadmap && (
        <div className="mt-4 pt-3 border-t border-bochk-border">
          <div className="text-xs font-medium text-bochk-gray mb-2">📋 综合建议</div>
          <p className="text-sm text-bochk-dark whitespace-pre-line">{roadmap}</p>
        </div>
      )}
    </div>
  )
}
