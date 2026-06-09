/** 侧边栏 — 三步向导导航 */

import type { WizardStep } from "@/lib/types"

interface SidebarProps {
  currentStep: WizardStep
  onStepChange: (step: WizardStep) => void
  profileCompleted: boolean
  matchingCompleted: boolean
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
}: SidebarProps) {
  // 判断步骤是否可点击（前置步骤已完成）
  const canClick = (step: WizardStep): boolean => {
    if (step === 1) return true
    if (step === 4) return profileCompleted
    if (step === 5) return matchingCompleted
    return false
  }

  return (
    <aside className="w-56 bg-white border-r border-bochk-border flex flex-col py-6">
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
            style={{
              width: `${
                profileCompleted && matchingCompleted
                  ? 100
                  : profileCompleted
                    ? 50
                    : 10
              }%`,
            }}
          />
        </div>
      </div>
    </aside>
  )
}
