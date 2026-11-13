/** 接口已经种子的默认显示名。只用来对照，不拿来补接口没返回的来源。 */
export const officialDisplayDefaults: Record<string, string> = {
  cofounder: '系统奖励',
  studio: '系统激励',
  operations: '平台分红',
  red_packet: '系统红包',
  startup_sales: '销售激励',
  startup_points: '销售激励',
  mall_sales: '销售激励',
  mall_points: '销售激励',
  filing_settlement: '幸运返还',
  position_dividend: '业绩奖',
}

export interface DisplayNameDraft {
  sourceCode: string
  displayName: string
}

export interface DisplayNameGroup {
  displayName: string
  sourceCodes: string[]
}

export function officialDefaultName(sourceCode: string): string {
  return officialDisplayDefaults[sourceCode] ?? ''
}

export function groupDisplayNames(items: DisplayNameDraft[]): DisplayNameGroup[] {
  const groups: DisplayNameGroup[] = []
  for (const item of items) {
    const displayName = item.displayName.trim()
    if (!displayName) continue
    const existing = groups.find((group) => group.displayName === displayName)
    if (existing) {
      existing.sourceCodes.push(item.sourceCode)
      continue
    }
    groups.push({ displayName, sourceCodes: [item.sourceCode] })
  }
  return groups
}

export function displayNameProblem(items: DisplayNameDraft[]): string {
  if (items.length < 1) return '请填写显示名'
  const seen = new Set<string>()
  for (const item of items) {
    const sourceCode = item.sourceCode.trim()
    if (!sourceCode) return '提现分类来源不正确'
    if (seen.has(sourceCode)) return '来源重复'
    seen.add(sourceCode)
    const displayName = item.displayName.trim()
    if (displayName.length < 1 || displayName.length > 64) return '显示名不正确'
  }
  return ''
}

export function displayNamePayload(items: DisplayNameDraft[]): DisplayNameDraft[] {
  return items.map((item) => ({
    sourceCode: item.sourceCode.trim(),
    displayName: item.displayName.trim(),
  }))
}
