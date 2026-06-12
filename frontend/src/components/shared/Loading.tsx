/** 统一 Loading 组件 — Spinner / Skeleton 两种模式 */

import { cn } from "@/lib/utils"

// ── Props ───────────────────────────────────────────────────
interface LoadingProps {
  /** 加载模式 */
  mode?: "spinner" | "skeleton"
  /** 说明文字 */
  text?: string
  /** 是否占据全屏/全容器 */
  fullscreen?: boolean
  /** 骨架屏行数（仅 skeleton 模式） */
  rows?: number
  /** 附加类名 */
  className?: string
}

// ── 主组件 ──────────────────────────────────────────────────
export default function Loading({
  mode = "spinner",
  text,
  fullscreen = false,
  rows = 3,
  className,
}: LoadingProps) {
  if (mode === "skeleton") {
    return (
      <div className={cn("animate-pulse", fullscreen && "h-full flex flex-col justify-center", className)}>
        <div className="space-y-3">
          {text && (
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full border-2 border-bochk-red/30 border-t-bochk-red animate-spin" />
              <span className="text-sm text-bochk-gray">{text}</span>
            </div>
          )}
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-bochk-light rounded"
              style={{ width: `${85 + (i % 3) * 5}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        fullscreen ? "h-full min-h-[200px]" : "py-12",
        className
      )}
    >
      <div className="relative">
        <div className="w-8 h-8 rounded-full border-2 border-bochk-red/20" />
        <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-transparent border-t-bochk-red animate-spin" />
      </div>
      {text && <p className="mt-3 text-sm text-bochk-gray">{text}</p>}
    </div>
  )
}

// ── 便捷子组件：卡片骨架屏 ──────────────────────────────────
export function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("card space-y-4", className)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full animate-skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded w-1/3 animate-skeleton-shimmer" />
          <div className="h-3 rounded w-1/2 animate-skeleton-shimmer" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded animate-skeleton-shimmer"
            style={{ width: `${80 + (i % 4) * 5}%` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── 便捷子组件：覆盖层 Loading ───────────────────────────────
export function OverlayLoading({ text }: { text?: string }) {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded">
      <Loading text={text} />
    </div>
  )
}
