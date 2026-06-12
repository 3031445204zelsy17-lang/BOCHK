/** 侧边栏 — 三步向导导航（桌面端垂直 sidebar + 移动端横向步骤条） */

import type { WizardStep } from "@/lib/types"

interface SidebarProps {
  currentStep: WizardStep
  onStepChange: (step: WizardStep) => void
  profileCompleted: boolean
  matchingCompleted: boolean
  esgCompleted: boolean
}

const STEPS: { step: WizardStep; label: string; desc: string }[] = [
  { step: 1, label: "Step 1", desc: "企业画像" },
  { step: 4, label: "Step 4", desc: "服务匹配" },
  { step: 5, label: "Step 5", desc: "ESG 合规" },
]

export default function Sidebar({
  currentStep,
  onStepChange,
  profileCompleted,
  matchingCompleted,
  esgCompleted,
}: SidebarProps) {
  // 判断步骤是否可点击（前置步骤已完成）
  const canClick = (step: WizardStep): boolean => {
    if (step === 1) return true
    if (step === 4) return profileCompleted
    if (step === 5) return matchingCompleted
    return false
  }

  // 整体进度
  const progress = esgCompleted
    ? 100
    : profileCompleted && matchingCompleted
      ? 70
      : profileCompleted
        ? 40
        : 10

  return (
    <>
      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex w-56 bg-white border-r border-bochk-border flex-col py-6">
        <div className="px-4 mb-6">
          <h2 className="text-sm font-semibold text-bochk-gray uppercase tracking-wider">
            出海向导
          </h2>
        </div>

        <nav className="flex-1 px-2">
          {STEPS.map(({ step, label, desc }) => {
            const isActive = currentStep === step
            const enabled = canClick(step)

            return (
              <button
                key={step}
                onClick={() => enabled && onStepChange(step)}
                disabled={!enabled}
                className={`
                  w-full text-left px-3 py-3 rounded mb-1 transition-colors
                  ${isActive ? "bg-bochk-red/10 text-bochk-red border-l-3 border-bochk-red" : ""}
                  ${!isActive && enabled ? "text-bochk-dark hover:bg-gray-50 cursor-pointer" : ""}
                  ${!enabled ? "text-gray-300 cursor-not-allowed" : ""}
                `}
              >
                <div className="text-xs font-semibold">{label}</div>
                <div className="text-sm">{desc}</div>
              </button>
            )
          })}
        </nav>

        {/* 进度指示 */}
        <div className="px-4 pt-4 border-t border-bochk-border">
          <div className="text-xs text-bochk-gray mb-2">整体进度</div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-bochk-red rounded-full h-1.5 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </aside>

      {/* 移动端横向步骤条 */}
      <div className="md:hidden bg-white border-b border-bochk-border">
        <div className="flex items-center justify-between px-4 py-3">
          {STEPS.map(({ step, desc }) => {
            const isActive = currentStep === step
            const enabled = canClick(step)

            return (
              <button
                key={step}
                onClick={() => enabled && onStepChange(step)}
                disabled={!enabled}
                className={`flex flex-col items-center gap-1 flex-1 min-w-0 transition-colors ${
                  isActive
                    ? "text-bochk-red"
                    : enabled
                      ? "text-bochk-dark"
                      : "text-gray-300"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isActive
                      ? "bg-bochk-red text-white"
                      : enabled
                        ? "bg-gray-100"
                        : "bg-gray-50"
                  }`}
                >
                  {step}
                </div>
                <span className="text-xs truncate w-full text-center">{desc}</span>
              </button>
            )
          })}
        </div>

        {/* 移动端进度条 */}
        <div className="px-4 pb-3">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-bochk-red rounded-full h-1.5 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
