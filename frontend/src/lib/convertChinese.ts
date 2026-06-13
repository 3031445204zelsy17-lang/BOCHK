/** 简→繁中文字符转换工具 — 基于 opencc-js */

import { Converter } from "opencc-js"
import i18n from "@/i18n"

const converter = Converter({ from: "cn", to: "tw" })

/** 单字符串简→繁转换 */
export function toTraditional(text: string): string {
  return converter(text)
}

/** 判断当前是否繁中模式 */
export function isTraditionalChinese(): boolean {
  return i18n.language === "zh-TW"
}

/**
 * 深度遍历对象，对 string 字段做简→繁转换
 * 用于 AI 返回的复杂嵌套对象（画像标签、产品推荐、ESG 缺口等）
 */
export function convertAIContent<T>(data: T): T {
  if (!isTraditionalChinese()) return data
  return deepConvert(data)
}

function deepConvert<T>(obj: T): T {
  if (typeof obj === "string") return converter(obj) as T
  if (Array.isArray(obj)) return obj.map(deepConvert) as T
  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      result[key] = deepConvert((obj as Record<string, unknown>)[key])
    }
    return result as T
  }
  return obj
}
