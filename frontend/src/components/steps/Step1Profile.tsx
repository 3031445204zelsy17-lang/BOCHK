/** Step 1: 企业画像 — 预设模板 + 表单输入 + 画像卡片（含雷达图） */

import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts"
import { ArrowRight } from "lucide-react"
import type { CompanyInput, CompanyProfile, EnterpriseTemplate } from "@/lib/types"
import { generateProfile } from "@/lib/api"
import { cn } from "@/lib/utils"
import { BrandedLoading } from "@/components/shared/Loading"
import { toTraditional, isTraditionalChinese } from "@/lib/convertChinese"

// ── 预设企业模板（源自 mock_enterprises.json）─────────
const TEMPLATES: EnterpriseTemplate[] = [
  {
    id: "enterprise_001",
    name: "深圳XX电子科技有限公司",
    template_name: "深圳电子厂",
    industry: "电子制造",
    size: "中型",
    size_detail: "50-200人",
    export_experience: "3年以上",
    description:
      "专注于消费电子元器件制造，产品包括蓝牙耳机、充电器、智能手环配件。主要客户为国内品牌商，近三年开始向东南亚市场供货，年出口额约800万港币。",
    main_products: "蓝牙耳机、充电器、智能手环配件",
    target_markets: ["东南亚", "欧洲"],
    annual_revenue: "HK$1000万-3000万",
    preset_profile: {
      industry_tags: ["电子制造", "消费电子", "电子元器件"],
      size_level: "中型",
      trade_capability: "高",
      export_markets: ["东南亚", "欧洲"],
      readiness_score: 78,
      tags: ["制造业", "有出海经验", "电子", "中型企业"],
    },
  },
  {
    id: "enterprise_002",
    name: "东莞XX纺织制品有限公司",
    template_name: "东莞纺织厂",
    industry: "纺织制造",
    size: "小型",
    size_detail: "10-50人",
    export_experience: "无",
    description:
      "主营针织面料和成衣加工，客户以国内服装品牌为主。工厂具备完整的裁剪、缝制、印花生产线，产品质量稳定，但从未做过出口业务。",
    main_products: "针织面料、成衣加工",
    target_markets: ["东南亚"],
    annual_revenue: "HK$500万-1000万",
    preset_profile: {
      industry_tags: ["纺织制造", "针织面料", "成衣加工"],
      size_level: "小型",
      trade_capability: "低",
      export_markets: [],
      readiness_score: 35,
      tags: ["制造业", "无出海经验", "纺织", "小型企业"],
    },
  },
  {
    id: "enterprise_003",
    name: "佛山XX家居用品有限公司",
    template_name: "佛山家居厂",
    industry: "家居制造",
    size: "中小型",
    size_detail: "50-100人",
    export_experience: "计划中",
    description:
      "生产现代简约风格家具和家居装饰品，产品涵盖沙发、茶几、灯具。已通过电商平台接到海外客户询盘，正在评估泰国和新加坡市场的可行性。",
    main_products: "沙发、茶几、灯具、家居装饰品",
    target_markets: ["东南亚"],
    annual_revenue: "HK$1000万-3000万",
    preset_profile: {
      industry_tags: ["家居制造", "家具", "家居装饰"],
      size_level: "中小型",
      trade_capability: "中",
      export_markets: ["东南亚"],
      readiness_score: 52,
      tags: ["制造业", "计划出海", "家居", "中小型企业"],
    },
  },
]

/** 默认空表单 */
const EMPTY_FORM: CompanyInput = {
  company_name: "",
  industry: "",
  size: "",
  description: "",
  export_experience: "",
  target_markets: [],
  annual_revenue: "",
}

// ── Mock fallback（后端未启动时使用）──────────────────
const MOCK_PROFILE: CompanyProfile = {
  industry_tags: ["电子制造", "消费电子"],
  size_level: "中型",
  trade_capability: "高",
  export_markets: ["东南亚", "欧洲"],
  readiness_score: 78,
  tags: ["制造业", "有出海经验", "电子"],
}

// ── 主组件 ──────────────────────────────────────────────
export default function Step1Profile({ onComplete }: { onComplete: (profile: CompanyProfile) => void }) {
  const { t } = useTranslation()
  const [form, setForm] = useState<CompanyInput>({ ...EMPTY_FORM })
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 表单选项（i18n 驱动）
  const marketOptions = [
    { value: "东南亚", label: t("step1.markets.southeastAsia") },
    { value: "欧洲", label: t("step1.markets.europe") },
    { value: "北美", label: t("step1.markets.northAmerica") },
    { value: "中东", label: t("step1.markets.middleEast") },
    { value: "日韩", label: t("step1.markets.japanKorea") },
  ]

  const revenueOptions = [
    "HK$500万以下",
    "HK$500万-1000万",
    "HK$1000万-3000万",
    "HK$3000万-5000万",
    "HK$5000万以上",
  ]
  const revenueLabels = [
    t("step1.revenue.r1"),
    t("step1.revenue.r2"),
    t("step1.revenue.r3"),
    t("step1.revenue.r4"),
    t("step1.revenue.r5"),
  ]

  // 模板文案（繁中时转换）
  const convertText = (text: string) => isTraditionalChinese() ? toTraditional(text) : text

  // ── 选择模板 ──────────────────────────────────
  const handleTemplateSelect = (tpl: EnterpriseTemplate) => {
    setSelectedTemplate(tpl.id)
    setForm({
      company_name: tpl.name,
      industry: tpl.industry,
      size: tpl.size,
      description: tpl.description,
      export_experience: tpl.export_experience,
      target_markets: tpl.target_markets,
      annual_revenue: tpl.annual_revenue,
    })
    setProfile(tpl.preset_profile)
    setError(null)
  }

  // ── 字段更新 ──────────────────────────────────
  const handleChange = (field: keyof CompanyInput, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ── 目标市场多选切换 ──────────────────────────
  const toggleMarket = (market: string) => {
    setForm((prev) => ({
      ...prev,
      target_markets: prev.target_markets.includes(market)
        ? prev.target_markets.filter((m) => m !== market)
        : [...prev.target_markets, market],
    }))
  }

  // ── 提交 ──────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await generateProfile(form)
      setProfile(result.profile)
    } catch {
      console.warn("后端未连接，使用 mock 数据")
      setProfile(MOCK_PROFILE)
    } finally {
      setLoading(false)
    }
  }

  // 雷达图维度（i18n 驱动）
  function computeRadarData(p: CompanyProfile) {
    const sizeScore: Record<string, number> = { 小型: 30, 中小型: 55, 中型: 80 }
    const hasExp = p.tags.some((tag) => tag.includes("有出海经验"))
    const planExp = p.tags.some((tag) => tag.includes("计划出海"))
    const tradeScore: Record<string, number> = { 低: 20, 中: 60, 高: 90 }

    return [
      { dimension: t("step1.radar.sizeStrength"), value: sizeScore[p.size_level] ?? 50 },
      { dimension: t("step1.radar.exportExperience"), value: hasExp ? 85 : planExp ? 55 : 20 },
      { dimension: t("step1.radar.tradeCapability"), value: tradeScore[p.trade_capability] ?? 50 },
      { dimension: t("step1.radar.marketCoverage"), value: p.export_markets.length === 0 ? 10 : p.export_markets.length === 1 ? 50 : 80 },
      { dimension: t("step1.radar.industryDepth"), value: p.industry_tags.length <= 1 ? 40 : p.industry_tags.length === 2 ? 65 : 85 },
    ]
  }

  // 准备度等级
  function readinessLevel(score: number) {
    if (score >= 70) return { label: t("step1.result.readinessHigh"), color: "text-esg-green" }
    if (score >= 45) return { label: t("step1.result.readinessMedium"), color: "text-esg-yellow" }
    return { label: t("step1.result.readinessLow"), color: "text-esg-red" }
  }

  const level = profile ? readinessLevel(profile.readiness_score) : null

  return (
    <div className="max-w-3xl mx-auto relative">
      {/* AI 生成中覆盖层 */}
      {loading && (
        <BrandedLoading
          messages={[
            t("step1.loading.msg1"),
            t("step1.loading.msg2"),
            t("step1.loading.msg3"),
            t("step1.loading.msg4"),
          ]}
        />
      )}
      <h2 className="text-xl font-semibold mb-1">{t("step1.title")}</h2>
      <p className="text-sm text-bochk-gray mb-6">
        {t("step1.subtitle")}
      </p>

      {/* ═══ 预设模板选择区 ══════════════════════════ */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-bochk-gray mb-3">
          {t("step1.templateTitle")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleTemplateSelect(tpl)}
              className={cn(
                "text-left p-4 rounded border transition-colors cursor-pointer",
                selectedTemplate === tpl.id
                  ? "border-bochk-red bg-bochk-red/5"
                  : "border-bochk-border bg-white hover:border-bochk-red/40"
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base font-semibold text-bochk-dark">
                  {convertText(tpl.template_name)}
                </span>
                <span className="text-xs px-1.5 py-0.5 bg-bochk-light rounded text-bochk-gray">
                  {tpl.size}
                </span>
              </div>
              <div className="text-xs text-bochk-gray line-clamp-2">
                {convertText(tpl.description)}
              </div>
              <div className="mt-2 flex gap-1 flex-wrap">
                {tpl.target_markets.map((m) => {
                  const opt = marketOptions.find((o) => o.value === m)
                  return (
                    <span
                      key={m}
                      className="text-xs px-1.5 py-0.5 bg-bochk-blue/10 text-bochk-blue rounded"
                    >
                      {opt?.label ?? m}
                    </span>
                  )
                })}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 表单区 ════════════════════════════════ */}
      <form onSubmit={handleSubmit} className="card space-y-4 mb-8">
        {/* 企业名称 */}
        <div>
          <label className="block text-sm font-medium text-bochk-dark mb-1">
            {t("step1.form.companyName")}
          </label>
          <input
            type="text"
            value={form.company_name}
            onChange={(e) => handleChange("company_name", e.target.value)}
            placeholder={t("step1.form.companyNamePh")}
            className="w-full border border-bochk-border rounded px-3 py-2 text-sm
                       focus:outline-none focus:border-bochk-red"
            required
          />
        </div>

        {/* 行业 + 规模 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-bochk-dark mb-1">
              {t("step1.form.industry")}
            </label>
            <select
              value={form.industry}
              onChange={(e) => handleChange("industry", e.target.value)}
              className="w-full border border-bochk-border rounded px-3 py-2 text-sm
                         focus:outline-none focus:border-bochk-red bg-white"
              required
            >
              <option value="">{t("step1.form.selectPlaceholder")}</option>
              <option value="电子制造">{t("step1.industries.electronics")}</option>
              <option value="纺织制造">{t("step1.industries.textile")}</option>
              <option value="家居制造">{t("step1.industries.home")}</option>
              <option value="贸易">{t("step1.industries.trade")}</option>
              <option value="其他">{t("step1.industries.other")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-bochk-dark mb-1">
              {t("step1.form.size")}
            </label>
            <select
              value={form.size}
              onChange={(e) => handleChange("size", e.target.value)}
              className="w-full border border-bochk-border rounded px-3 py-2 text-sm
                         focus:outline-none focus:border-bochk-red bg-white"
              required
            >
              <option value="">{t("step1.form.selectPlaceholder")}</option>
              <option value="小型">{t("step1.sizes.small")}</option>
              <option value="中小型">{t("step1.sizes.mediumSmall")}</option>
              <option value="中型">{t("step1.sizes.medium")}</option>
            </select>
          </div>
        </div>

        {/* 企业描述 */}
        <div>
          <label className="block text-sm font-medium text-bochk-dark mb-1">
            {t("step1.form.description")}
          </label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder={t("step1.form.descriptionPh")}
            rows={3}
            className="w-full border border-bochk-border rounded px-3 py-2 text-sm
                       focus:outline-none focus:border-bochk-red resize-none"
            required
          />
        </div>

        {/* 出海经验 + 年营收 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-bochk-dark mb-1">
              {t("step1.form.exportExperience")}
            </label>
            <select
              value={form.export_experience}
              onChange={(e) => handleChange("export_experience", e.target.value)}
              className="w-full border border-bochk-border rounded px-3 py-2 text-sm
                         focus:outline-none focus:border-bochk-red bg-white"
              required
            >
              <option value="">{t("step1.form.selectPlaceholder")}</option>
              <option value="无">{t("step1.experience.none")}</option>
              <option value="计划中">{t("step1.experience.planned")}</option>
              <option value="1-3年">{t("step1.experience.short")}</option>
              <option value="3年以上">{t("step1.experience.long")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-bochk-dark mb-1">
              {t("step1.form.annualRevenue")}
            </label>
            <select
              value={form.annual_revenue}
              onChange={(e) => handleChange("annual_revenue", e.target.value)}
              className="w-full border border-bochk-border rounded px-3 py-2 text-sm
                         focus:outline-none focus:border-bochk-red bg-white"
              required
            >
              <option value="">{t("step1.form.selectPlaceholder")}</option>
              {revenueOptions.map((r, i) => (
                <option key={r} value={r}>
                  {revenueLabels[i]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 目标市场（多选） */}
        <div>
          <label className="block text-sm font-medium text-bochk-dark mb-2">
            {t("step1.form.targetMarkets")}
          </label>
          <div className="flex flex-wrap gap-2">
            {marketOptions.map(({ value, label }) => {
              const checked = form.target_markets.includes(value)
              return (
                <label
                  key={value}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm cursor-pointer transition-colors",
                    checked
                      ? "border-bochk-red bg-bochk-red/5 text-bochk-red"
                      : "border-bochk-border bg-white text-bochk-dark hover:border-bochk-red/40"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMarket(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              )
            })}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="text-sm text-esg-red bg-esg-red/10 rounded px-3 py-2">
            {error}
          </div>
        )}

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t("step1.form.generating")}
            </span>
          ) : (
            t("step1.form.generate")
          )}
        </button>
      </form>

      {/* ═══ 画像结果卡片 ═══════════════════════════ */}
      {profile && (
        <div className="card animate-fade-in">
          {/* 顶部：标题 + 总分 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-bochk-dark">{t("step1.result.title")}</h3>
              {form.company_name && (
                <p className="text-sm text-bochk-gray">{form.company_name}</p>
              )}
            </div>
            <div className="text-left sm:text-right">
              <div className="text-3xl font-bold text-bochk-red">
                {profile.readiness_score}
                <span className="text-sm font-normal text-bochk-gray">/100</span>
              </div>
              {level && (
                <span className={cn("text-xs font-medium", level.color)}>
                  {t("step1.result.readiness")}{level.label}
                </span>
              )}
            </div>
          </div>

          {/* 标签 */}
          <div className="flex flex-wrap gap-2 mb-5">
            {profile.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-bochk-red/10 text-bochk-red text-xs rounded-full font-medium"
              >
                {convertText(tag)}
              </span>
            ))}
          </div>

          {/* 中部：基本信息（左）+ 雷达图（右） */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 mb-5">
            {/* 左：指标 */}
            <div className="md:col-span-2 space-y-3">
              <InfoRow label={t("step1.result.industry")} value={convertText(profile.industry_tags.join("、"))} />
              <InfoRow label={t("step1.result.size")} value={convertText(profile.size_level)} />
              <InfoRow label={t("step1.result.tradeCapability")} value={convertText(profile.trade_capability)} />
              <InfoRow
                label={t("step1.result.targetMarkets")}
                value={profile.export_markets.length > 0
                  ? profile.export_markets.map((m) => {
                      const opt = marketOptions.find((o) => o.value === m)
                      return convertText(opt?.label ?? m)
                    }).join("、")
                  : t("step1.result.undetermined")}
              />

              {/* 准备度进度条 */}
              <div className="pt-2 border-t border-bochk-border">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-bochk-gray">{t("step1.result.readiness")}</span>
                  <span className="font-semibold">{profile.readiness_score}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={cn(
                      "rounded-full h-2.5 transition-all duration-500",
                      profile.readiness_score >= 70
                        ? "bg-esg-green"
                        : profile.readiness_score >= 45
                          ? "bg-esg-yellow"
                          : "bg-esg-red"
                    )}
                    style={{ width: `${profile.readiness_score}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 右：雷达图 */}
            <div className="md:col-span-3 w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={computeRadarData(profile)}>
                  <PolarGrid stroke="#E0E0E0" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fontSize: 11, fill: "#666666" }}
                  />
                  <Radar
                    dataKey="value"
                    fill="#C8102E"
                    fillOpacity={0.15}
                    stroke="#C8102E"
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 确认按钮 */}
          <div className="pt-4 border-t border-bochk-border">
            <button
              onClick={() => onComplete(profile)}
              className="btn-primary w-full py-2.5 inline-flex items-center justify-center gap-1"
            >
              {t("step1.result.confirm")} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 辅助组件 ────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-bochk-gray">{label}：</span>
      <span className="font-medium text-bochk-dark">{value}</span>
    </div>
  )
}
