/** 向导页面 — 三步出海导航主容器 */

import { useState } from "react"
import type { WizardStep, CompanyProfile } from "@/lib/types"
import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"
import Step1Profile from "@/components/steps/Step1Profile"
import Step4Matching from "@/components/steps/Step4Matching"
import Step5ESG from "@/components/steps/Step5ESG"

export default function Wizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [profileCompleted, setProfileCompleted] = useState(false)
  const [matchingCompleted, setMatchingCompleted] = useState(false)
  const [esgCompleted, setEsgCompleted] = useState(false)

  // Step 1 完成 → 保存画像，跳到 Step 4
  const handleProfileComplete = (p: CompanyProfile) => {
    setProfile(p)
    setProfileCompleted(true)
    setCurrentStep(4)
  }

  // Step 4 完成 → 跳到 Step 5
  const handleMatchingComplete = () => {
    setMatchingCompleted(true)
    setCurrentStep(5)
  }

  // Step 5 完成
  const handleESGComplete = () => {
    setEsgCompleted(true)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          profileCompleted={profileCompleted}
          matchingCompleted={matchingCompleted}
          esgCompleted={esgCompleted}
        />

        {/* 主内容区 */}
        <main className="flex-1 p-8 overflow-y-auto">
          {currentStep === 1 && (
            <Step1Profile onComplete={handleProfileComplete} />
          )}
          {currentStep === 4 && profile && (
            <Step4Matching
              profile={profile}
              onComplete={handleMatchingComplete}
            />
          )}
          {currentStep === 5 && profile && (
            <Step5ESG profile={profile} onComplete={handleESGComplete} />
          )}
        </main>
      </div>
    </div>
  )
}
