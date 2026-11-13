import { fenText } from './order-labels'

export function optionalFenText(fen: number | null): string {
  if (fen == null) return '—'
  return fenText(fen)
}

export const refundStatusOptions = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
] as const

export function refundStatusLabel(status: string): string {
  return refundStatusOptions.find((item) => item.value === status)?.label ?? (status || '—')
}

export function refundStatusTag(status: string): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'danger'
  return 'info'
}

export function wechatRefundStatusLabel(status: string | null): string {
  if (!status) return '—'
  if (status === 'none') return '无'
  if (status === 'sandbox') return '沙箱'
  if (status === 'accepted') return '已受理'
  return status
}

export function wechatRefundStatusTag(
  status: string | null,
): 'success' | 'warning' | 'info' | 'primary' {
  if (status === 'accepted') return 'success'
  if (status === 'sandbox') return 'warning'
  if (status === 'none') return 'info'
  return 'primary'
}
