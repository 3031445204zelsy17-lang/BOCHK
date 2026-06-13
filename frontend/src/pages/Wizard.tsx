/** 向导页面 — 三步出海导航主容器 */

import { useState } from "react"
import type { WizardStep, CompanyProfile, ProductRecommendation, ESGAnalysis } from "@/lib/types"
import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"
import Step1Profile from "@/components/steps/Step1Profile"
import Step4Matching from "@/components/steps/Step4Matching"
import Step5ESG from "@/components/steps/Step5ESG"
import ProgressDashboard from "@/components/shared/ProgressDashboard"

export default function Wizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [profileCompleted, setProfileCompleted] = useState(false)
  const [matchingCompleted, setMatchingCompleted] = useState(false)
  const [esgCompleted, setEsgCompleted] = useState(false)

  // 各步骤结果数据（用于进度看板）
  const [recommendations, setRecommendations] = useState<ProductRecommendation[] | null>(null)
  const [esgResult, setEsgResult] = useState<ESGAnalysis | null>(null)

  // Step 1 完成 → 保存画像，跳到 Step 2
  const handleProfileComplete = (p: CompanyProfile) => {
    setProfile(p)
    setProfileCompleted(true)
    setCurrentStep(2)
  }

  // Step 2 完成 → 保存推荐结果，跳到 Step 3
  const handleMatchingComplete = (recs: ProductRecommendation[]) => {
    setRecommendations(recs)
    setMatchingCompleted(true)
    setCurrentStep(3)
  }

  // Step 3 完成 → 保存 ESG 结果
  const handleESGComplete = (result: ESGAnalysis | null) => {
    setEsgResult(result)
    setEsgCompleted(true)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-col md:flex-row flex-1">
        <Sidebar
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          profileCompleted={profileCompleted}
          matchingCompleted={matchingCompleted}
          esgCompleted={esgCompleted}
        />

        {/* 主内容区 */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* 进度看板 — 有任一步完成时显示 */}
          <ProgressDashboard
            profileCompleted={profileCompleted}
            profile={profile}
            matchingCompleted={matchingCompleted}
            recommendations={recommendations}
            esgCompleted={esgCompleted}
            esgResult={esgResult}
          />

          <div key={currentStep} className="animate-fade-in">
            {currentStep === 1 && (
              <Step1Profile onComplete={handleProfileComplete} />
            )}
            {currentStep === 2 && profile && (
              <Step4Matching
                profile={profile}
                onComplete={handleMatchingComplete}
              />
            )}
            {currentStep === 3 && profile && (
              <Step5ESG profile={profile} onComplete={handleESGComplete} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
