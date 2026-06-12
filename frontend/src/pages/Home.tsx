/** 落地页 — BOCHK 品牌风格产品介绍 + 开始体验 */

import { useNavigate } from "react-router-dom"
import { Building2, Landmark, Leaf, CheckCircle, ArrowRight } from "lucide-react"

// ── 功能特性配置 ─────────────────────────────────────────────
const FEATURES = [
  {
    icon: Building2,
    step: "Step 1",
    title: "AI 企业画像",
    desc: "智能分析企业信息，一键生成结构化出海画像。涵盖行业标签、贸易能力、市场评估等核心维度。",
    highlights: ["行业匹配", "出海准备度评分", "智能标签"],
  },
  {
    icon: Landmark,
    step: "Step 4",
    title: "BOCHK 产品匹配",
    desc: "基于企业画像智能匹配中银香港金融产品，提供个性化推荐和申请建议。",
    highlights: ["贸易融资", "外汇管理", "绿色金融"],
  },
  {
    icon: Leaf,
    step: "Step 5",
    title: "ESG 合规分析",
    desc: "识别目标市场 ESG 合规缺口，生成双标准评估报告（目的地法规 + BOCHK 准入），提供改善路线图。",
    highlights: ["合规缺口识别", "红黄绿报告", "改善路线图"],
  },
]

export default function Home() {
  const navigate = useNavigate()

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
            <span className="text-xs text-white/80">Powered by</span>
            <span className="text-sm font-semibold text-white">BOCHK 中银香港</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            智企通
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-2 font-medium">
            GoGlobal Navigator
          </p>
          <p className="text-sm md:text-base text-white/70 mb-10 max-w-xl mx-auto leading-relaxed">
            AI 驱动的中小企业出海导航平台<br />
            企业画像 · 产品匹配 · ESG 合规 — 三步完成出海准备度评估
          </p>

          {/* CTA 按钮 */}
          <button
            onClick={() => navigate("/wizard")}
            className="inline-flex items-center gap-2 bg-white text-bochk-red px-8 md:px-10 py-3 md:py-4 rounded font-semibold text-base md:text-lg hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl cursor-pointer"
          >
            开始体验
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-xs text-white/50 mt-4">
            Innovation Challenge 2026 · 无需注册，即刻体验
          </p>
        </div>
      </section>

      {/* ═══ 功能特性 ══════════════════════════════════════ */}
      <section className="py-16 md:py-20 px-4 md:px-6 bg-gray-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-bochk-dark mb-3">三步完成出海评估</h2>
            <p className="text-sm text-bochk-gray max-w-lg mx-auto">
              从企业画像到 ESG 合规，一站式 AI 导航助力企业走向全球
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.step}
                className="bg-white rounded-lg p-6 border border-bochk-border hover:shadow-md hover:border-bochk-red/20 transition-all group animate-fade-in"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
              >
                {/* 图标 + 步骤 */}
                <div className="flex items-center gap-3 mb-4">
                  <f.icon className="w-8 h-8 text-bochk-red" />
                  <div>
                    <div className="text-xs text-bochk-gray">{f.step}</div>
                    <div className="text-base font-semibold text-bochk-dark group-hover:text-bochk-red transition-colors">
                      {f.title}
                    </div>
                  </div>
                </div>

                {/* 描述 */}
                <p className="text-sm text-bochk-gray leading-relaxed mb-4">
                  {f.desc}
                </p>

                {/* 亮点标签 */}
                <div className="flex flex-wrap gap-1.5">
                  {f.highlights.map((h) => (
                    <span key={h} className="px-2 py-0.5 bg-bochk-red/5 text-bochk-red text-xs rounded">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 流程指示 */}
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mt-8 text-sm text-bochk-gray">
            <span className="font-medium">企业画像</span>
            <ArrowRight className="w-4 h-4 text-bochk-red" />
            <span className="font-medium">产品匹配</span>
            <ArrowRight className="w-4 h-4 text-bochk-red" />
            <span className="font-medium">ESG 合规</span>
            <ArrowRight className="w-4 h-4 text-bochk-red" />
            <span className="font-medium text-bochk-red inline-flex items-center gap-1">
              出海准备就绪 <CheckCircle className="w-4 h-4 text-esg-green" />
            </span>
          </div>
        </div>
      </section>

      {/* ═══ 数据能力 ══════════════════════════════════════ */}
      <section className="py-12 px-4 md:px-6 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
          {[
            { value: "5", label: "覆盖地区", sub: "HK / SG / TH / EU / BOCHK" },
            { value: "71", label: "ESG 法规", sub: "结构化合规检查项" },
            { value: "8", label: "金融产品", sub: "BOCHK 专属推荐" },
            { value: "3", label: "评估维度", sub: "环境 / 社会 / 治理" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="animate-fade-in"
              style={{ animationDelay: `${300 + i * 80}ms`, animationFillMode: "both" }}
            >
              <div className="text-3xl font-bold text-bochk-red">{stat.value}</div>
              <div className="text-sm font-medium text-bochk-dark mt-1">{stat.label}</div>
              <div className="text-xs text-bochk-gray mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 底部 ══════════════════════════════════════════ */}
      <footer className="mt-auto py-8 px-4 md:px-6 border-t border-bochk-border bg-gray-50/30">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-0 sm:justify-between">
          <div className="text-center sm:text-left">
            <div className="text-sm font-semibold text-bochk-dark">智企通 GoGlobal Navigator</div>
            <div className="text-xs text-bochk-gray mt-0.5">
              © 2026 BOCHK 中银香港 Innovation Challenge
            </div>
          </div>
          <button
            onClick={() => navigate("/wizard")}
            className="inline-flex items-center gap-1 px-6 py-2 bg-bochk-red text-white rounded text-sm font-medium hover:bg-[#B01020] transition-colors cursor-pointer"
          >
            立即体验 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  )
}
