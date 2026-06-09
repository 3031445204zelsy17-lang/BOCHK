/** Step 1: 企业画像 — 表单输入 + 画像卡片展示 */

import { useState } from "react"
import type { CompanyInput, CompanyProfile } from "@/lib/types"
import { generateProfile } from "@/lib/api"

// ── Mock fallback（后端未启动时使用）──────────────────
const MOCK_PROFILE: CompanyProfile = {
  industry_tags: ["电子制造", "消费电子"],
  size_level: "中型",
  trade_capability: "高",
  export_markets: ["东南亚", "欧洲"],
  readiness_score: 78,
  tags: ["制造业", "有出海经验", "电子"],
}

interface Step1Props {
  onComplete: (profile: CompanyProfile) => void
}

export default function Step1Profile({ onComplete }: Step1Props) {
  const [form, setForm] = useState<CompanyInput>({
    company_name: "",
    industry: "",
    size: "",
    description: "",
    export_experience: "",
  })
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await generateProfile(form)
      setProfile(result.profile)
    } catch {
      // 后端未启动，使用 mock 数据
      console.warn("后端未连接，使用 mock 数据")
      setProfile(MOCK_PROFILE)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    field: keyof CompanyInput,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">企业信息录入</h2>

      {/* ── 表单 ────────────────────────────── */}
      <form onSubmit={handleSubmit} className="card space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-bochk-gray mb-1">
            企业名称
          </label>
          <input
            type="text"
            value={form.company_name}
            onChange={(e) => handleChange("company_name", e.target.value)}
            placeholder="例：深圳XX电子科技有限公司"
            className="w-full border border-bochk-border rounded px-3 py-2 text-sm focus:outline-none focus:border-bochk-red"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-bochk-gray mb-1">
              行业
            </label>
            <select
              value={form.industry}
              onChange={(e) => handleChange("industry", e.target.value)}
              className="w-full border border-bochk-border rounded px-3 py-2 text-sm focus:outline-none focus:border-bochk-red"
              required
            >
              <option value="">请选择</option>
              <option value="电子制造">电子制造</option>
              <option value="纺织制造">纺织制造</option>
              <option value="家居制造">家居制造</option>
              <option value="贸易">贸易</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-bochk-gray mb-1">
              规模
            </label>
            <select
              value={form.size}
              onChange={(e) => handleChange("size", e.target.value)}
              className="w-full border border-bochk-border rounded px-3 py-2 text-sm focus:outline-none focus:border-bochk-red"
              required
            >
              <option value="">请选择</option>
              <option value="小型">小型（10-50人）</option>
              <option value="中小型">中小型（50-100人）</option>
              <option value="中型">中型（100-500人）</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-bochk-gray mb-1">
            企业描述
          </label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="请简要描述企业主营业务、产品特点..."
            rows={3}
            className="w-full border border-bochk-border rounded px-3 py-2 text-sm focus:outline-none focus:border-bochk-red"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-bochk-gray mb-1">
            出海经验
          </label>
          <select
            value={form.export_experience}
            onChange={(e) => handleChange("export_experience", e.target.value)}
            className="w-full border border-bochk-border rounded px-3 py-2 text-sm focus:outline-none focus:border-bochk-red"
            required
          >
            <option value="">请选择</option>
            <option value="无">无出海经验</option>
            <option value="计划中">计划中</option>
            <option value="1-3年">1-3年</option>
            <option value="3年以上">3年以上</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5 disabled:opacity-50"
        >
          {loading ? "生成中..." : "生成企业画像"}
        </button>
      </form>

      {/* ── 画像卡片 ────────────────────────── */}
      {profile && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">企业画像</h3>
            <div className="text-2xl font-bold text-bochk-red">
              {profile.readiness_score}
              <span className="text-sm font-normal text-bochk-gray">/100</span>
            </div>
          </div>

          {/* 标签 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-bochk-red/10 text-bochk-red text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 详情 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-bochk-gray">行业：</span>
              <span className="font-medium">
                {profile.industry_tags.join("、")}
              </span>
            </div>
            <div>
              <span className="text-bochk-gray">规模：</span>
              <span className="font-medium">{profile.size_level}</span>
            </div>
            <div>
              <span className="text-bochk-gray">贸易能力：</span>
              <span className="font-medium">{profile.trade_capability}</span>
            </div>
            <div>
              <span className="text-bochk-gray">目标市场：</span>
              <span className="font-medium">
                {profile.export_markets.join("、") || "待定"}
              </span>
            </div>
          </div>

          {/* 出海准备度进度条 */}
          <div className="mt-4 pt-4 border-t border-bochk-border">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-bochk-gray">出海准备度</span>
              <span className="font-semibold">{profile.readiness_score}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-bochk-red rounded-full h-2 transition-all"
                style={{ width: `${profile.readiness_score}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => onComplete(profile)}
            className="btn-primary w-full py-2.5 mt-4"
          >
            下一步：服务匹配 →
          </button>
        </div>
      )}
    </div>
  )
}
