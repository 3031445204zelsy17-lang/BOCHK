/** 落地页 — 产品介绍 + 开始体验 */

import { useNavigate } from "react-router-dom"

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero 区域 */}
      <div className="bg-bochk-red text-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">
            智企通 GoGlobal Navigator
          </h1>
          <p className="text-lg text-white/80 mb-8">
            AI 驱动的中小企业出海导航平台
          </p>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            从企业画像、BOCHK 产品匹配到 ESG 合规分析，
            三步完成出海准备度评估，助力企业走向全球。
          </p>
          <button
            onClick={() => navigate("/wizard")}
            className="bg-white text-bochk-red px-8 py-3 rounded font-semibold text-lg hover:bg-gray-50 transition-colors"
          >
            开始体验 →
          </button>
        </div>
      </div>

      {/* 功能介绍 */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="text-3xl mb-3">🏢</div>
            <h3 className="font-semibold mb-2">Step 1 企业画像</h3>
            <p className="text-sm text-bochk-gray">
              AI 分析企业信息，生成结构化出海画像
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">🏦</div>
            <h3 className="font-semibold mb-2">Step 4 服务匹配</h3>
            <p className="text-sm text-bochk-gray">
              智能匹配 BOCHK 金融产品，提供个性化推荐
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">🌿</div>
            <h3 className="font-semibold mb-2">Step 5 ESG 合规</h3>
            <p className="text-sm text-bochk-gray">
              识别目标市场合规缺口，生成改善路线图
            </p>
          </div>
        </div>
      </div>

      {/* 底部 */}
      <footer className="mt-auto py-6 text-center text-xs text-bochk-gray border-t border-bochk-border">
        智企通 GoGlobal Navigator © 2026 | BOCHK 中银香港 Innovation Challenge
      </footer>
    </div>
  )
}
