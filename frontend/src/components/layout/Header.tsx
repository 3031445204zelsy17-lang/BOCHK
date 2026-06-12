/** 顶部导航栏 — BOCHK 红色品牌风格 */

export default function Header() {
  return (
    <header className="bg-bochk-red text-white h-auto min-h-14 flex items-center px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-3 py-2">
        {/* BOCHK Logo 占位 */}
        <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center text-sm font-bold shrink-0">
          BOCHK
        </div>
        <h1 className="text-base md:text-lg font-semibold tracking-wide">
          智企通 GoGlobal Navigator
        </h1>
      </div>
      <div className="ml-auto hidden sm:block text-sm text-white/70">
        AI 驱动 SME 出海导航平台
      </div>
    </header>
  )
}
