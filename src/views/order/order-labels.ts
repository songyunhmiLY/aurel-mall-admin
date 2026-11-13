import type { OrderShipping } from '@/api/orders'
import { fenToYuan } from '@/api/money'

export const orderZoneOptions = [
  { value: 'startup', label: '创业专区' },
  { value: 'mall', label: '会员商城' },
] as const

export const orderStatusOptions = [
  { value: 'pending_payment', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'shipped', label: '已发货' },
  { value: 'closed', label: '已关闭' },
] as const

export function orderZoneLabel(zone: string): string {
  return orderZoneOptions.find((item) => item.value === zone)?.label ?? (zone || '—')
}

export function orderStatusLabel(status: string): string {
  return orderStatusOptions.find((item) => item.value === status)?.label ?? (status || '—')
}

export function orderStatusTag(status: string): 'success' | 'warning' | 'info' | 'primary' {
  if (status === 'paid') return 'success'
  if (status === 'pending_payment') return 'warning'
  if (status === 'shipped') return 'primary'
  return 'info'
}

/** 不能发货时返回接口使用的原因。已支付返回空字符串。 */
export function shipBlockedMessage(status: string): string {
  if (status === 'paid') return ''
  if (status === 'shipped') return '订单已发货'
  return '只有已支付的订单可以发货'
}

export function fenText(fen: number): string {
  return `${fenToYuan(fen)} 元`
}

/** PV 按分计，100 = 1 PV。展示成与金额相同的两位小数，不加「元」。 */
export function pvText(fen: number): string {
  return fenToYuan(fen)
}

export function formatOrderTime(value: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

export function formatShippingAddress(shipping: OrderShipping): string {
  const text = `${shipping.province}${shipping.city}${shipping.district}${shipping.detail}`.trim()
  return text || '—'
}
