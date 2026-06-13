/** 落地页 — BOCHK 品牌风格产品介绍 + 开始体验 */

import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Building2, Landmark, Leaf, CheckCircle, ArrowRight } from "lucide-react"

// ── 图标映射 ──────────────────────────────────────────────
const STEP_ICONS = [Building2, Landmark, Leaf] as const

export default function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  // 功能特性（从翻译文件读取）
  const featureKeys = ["s1", "s2", "s3"] as const

  // 统计数据
  const statKeys = ["regions", "regulations", "products", "dimensions"] as const

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ═══ Hero 区域 ══════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* 背景：品牌红渐变 */}
        <div className="absolute inset-0 bg-gradient-to-br from-bochk-red via-bochk-red to-[#8B0A1E]" />
        {/* 装饰圆 */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-64 h-64 rounded-full bg-white/5" />

        <div className="relative max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
          {/* 品牌标识 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full mb-6">
            <span className="text-xs text-white/80">{t("home.poweredBy")}</span>
            <span className="text-sm font-semibold text-white">{t("home.bochk")}</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            {t("home.heroTitle")}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-2 font-medium">
            {t("home.heroSubtitle")}
          </p>
          <p className="text-sm md:text-base text-white/70 mb-10 max-w-xl mx-auto leading-relaxed">
            {t("home.heroDesc")}<br />
            {t("home.heroDescSub")}
          </p>

          {/* CTA 按钮 */}
          <button
            onClick={() => navigate("/wizard")}
            className="inline-flex items-center gap-2 bg-white text-bochk-red px-8 md:px-10 py-3 md:py-4 rounded font-semibold text-base md:text-lg hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl cursor-pointer"
          >
            {t("home.cta")}
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-xs text-white/50 mt-4">
            {t("home.innovationNote")}
          </p>
        </div>
      </section>

      {/* ═══ 功能特性 ══════════════════════════════════════ */}
      <section className="py-16 md:py-20 px-4 md:px-6 bg-gray-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-bochk-dark mb-3">{t("home.featuresTitle")}</h2>
            <p className="text-sm text-bochk-gray max-w-lg mx-auto">
              {t("home.featuresDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {featureKeys.map((key, i) => {
              const Icon = STEP_ICONS[i]
              return (
                <div
                  key={key}
                  className="bg-white rounded-lg p-6 border border-bochk-border hover:shadow-md hover:border-bochk-red/20 transition-all group animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
                >
                  {/* 图标 + 步骤 */}
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="w-8 h-8 text-bochk-red" />
                    <div>
                      <div className="text-xs text-bochk-gray">{t(`home.features.${key}.step`)}</div>
                      <div className="text-base font-semibold text-bochk-dark group-hover:text-bochk-red transition-colors">
                        {t(`home.features.${key}.title`)}
                      </div>
                    </div>
                  </div>

                  {/* 描述 */}
                  <p className="text-sm text-bochk-gray leading-relaxed mb-4">
                    {t(`home.features.${key}.desc`)}
                  </p>

                  {/* 亮点标签 */}
                  <div className="flex flex-wrap gap-1.5">
                    {(t(`home.features.${key}.highlights`, { returnObjects: true }) as string[]).map((h) => (
                      <span key={h} className="px-2 py-0.5 bg-bochk-red/5 text-bochk-red text-xs rounded">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 流程指示 */}
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mt-8 text-sm text-bochk-gray">
            <span className="font-medium">{t("home.flow.profile")}</span>
            <ArrowRight className="w-4 h-4 text-bochk-red" />
            <span className="font-medium">{t("home.flow.match")}</span>
            <ArrowRight className="w-4 h-4 text-bochk-red" />
            <span className="font-medium">{t("home.flow.esg")}</span>
            <ArrowRight className="w-4 h-4 text-bochk-red" />
            <span className="font-medium text-bochk-red inline-flex items-center gap-1">
              {t("home.flow.ready")} <CheckCircle className="w-4 h-4 text-esg-green" />
            </span>
          </div>
        </div>
      </section>

      {/* ═══ 数据能力 ══════════════════════════════════════ */}
      <section className="py-12 px-4 md:px-6 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
          {statKeys.map((key, i) => (
            <div
              key={key}
              className="animate-fade-in"
              style={{ animationDelay: `${300 + i * 80}ms`, animationFillMode: "both" }}
            >
              <div className="text-3xl font-bold text-bochk-red">{t(`home.stats.${key}.value`)}</div>
              <div className="text-sm font-medium text-bochk-dark mt-1">{t(`home.stats.${key}.label`)}</div>
              <div className="text-xs text-bochk-gray mt-0.5">{t(`home.stats.${key}.sub`)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 底部 ══════════════════════════════════════════ */}
      <footer className="mt-auto py-8 px-4 md:px-6 border-t border-bochk-border bg-gray-50/30">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-0 sm:justify-between">
          <div className="text-center sm:text-left">
            <div className="text-sm font-semibold text-bochk-dark">{t("home.footer.title")}</div>
            <div className="text-xs text-bochk-gray mt-0.5">
              {t("home.footer.copyright")}
            </div>
          </div>
          <button
            onClick={() => navigate("/wizard")}
            className="inline-flex items-center gap-1 px-6 py-2 bg-bochk-red text-white rounded text-sm font-medium hover:bg-[#B01020] transition-colors cursor-pointer"
          >
            {t("home.footer.cta")} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  )
}
