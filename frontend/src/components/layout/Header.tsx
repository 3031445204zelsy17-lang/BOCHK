/** 顶部导航栏 — BOCHK 红色品牌风格 */

export default function Header() {
  return (
    <header className="bg-bochk-red text-white h-14 flex items-center px-6 shadow-sm">
      <div className="flex items-center gap-3">
        {/* BOCHK Logo 占位 */}
        <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center text-sm font-bold">
          BOCHK
        </div>
        <h1 className="text-lg font-semibold tracking-wide">
          智企通 GoGlobal Navigator
        </h1>
      </div>
      <div className="ml-auto text-sm text-white/70">
        AI 驱动 SME 出海导航平台
      </div>
    </header>
  )
}
