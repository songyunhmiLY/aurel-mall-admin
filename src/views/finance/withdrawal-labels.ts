export const withdrawalStatusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'rejected', label: '已驳回' },
  { value: 'paid', label: '已打款' },
] as const

export function withdrawalStatusLabel(status: string): string {
  return withdrawalStatusOptions.find((item) => item.value === status)?.label ?? (status || '—')
}

export function withdrawalStatusTag(status: string): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'paid') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'danger'
  return 'info'
}

export function settlementOutcomeLabel(outcome: string): string {
  if (outcome === 'paid') return '已打款'
  if (outcome === 'rejected') return '已驳回'
  return outcome || '—'
}
