/** 工具函数（shadcn/ui 风格） */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ")
}
