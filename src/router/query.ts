/** 读取路由查询里的单个字符串。重复参数时取第一项。 */
export function routeQueryText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0].trim()
  return ''
}
