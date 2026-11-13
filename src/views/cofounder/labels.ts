import type { CofounderPayoutMode, CofounderScheduleCycle } from '@/api/cofounder'

export const payoutModeOptions: { value: CofounderPayoutMode; label: string; detail: string }[] = [
  {
    value: 'immediate',
    label: '即时分配',
    detail: '每笔合格订单当时分给当时在籍的人，不进入累计池。',
  },
  {
    value: 'periodic',
    label: '定期分配',
    detail: '订单先进入池子，到设定的上海时刻把池子分完。',
  },
  {
    value: 'pool_total',
    label: '按池子总额',
    detail: '池子达到总额门槛时，把当时的全部金额分完。',
  },
  {
    value: 'per_person',
    label: '按人均额度',
    detail: '池子除以当时在籍人数的整数份额达到人均门槛时，把整个池子分完。',
  },
]

export const scheduleCycleOptions: { value: CofounderScheduleCycle; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'interval', label: '按间隔' },
]

export const weekdayOptions = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
] as const

export function payoutModeLabel(mode: string): string {
  return payoutModeOptions.find((item) => item.value === mode)?.label ?? (mode || '—')
}

export function scheduleCycleLabel(cycle: string): string {
  return scheduleCycleOptions.find((item) => item.value === cycle)?.label ?? (cycle || '—')
}

export function cofounderStatusLabel(status: string): string {
  if (status === 'active') return '在籍'
  if (status === 'cancelled') return '已取消'
  return status || '—'
}

export function cofounderStatusTag(status: string): 'success' | 'info' {
  return status === 'active' ? 'success' : 'info'
}

export function cofounderSourceLabel(source: string | null): string {
  if (source === 'payment') return '付款开通'
  if (source === 'appointment') return '管理员指定'
  if (!source) return '—'
  return source
}

/** 锁定比例是基点。200 基点显示为 2%。 */
export function lockedRatioText(bps: number): string {
  if (!Number.isSafeInteger(bps) || bps < 0) return '—'
  const whole = Math.floor(bps / 100)
  const fraction = bps % 100
  const percent = fraction === 0 ? `${whole}%` : `${whole}.${String(fraction).padStart(2, '0')}%`
  return `${bps} 基点（${percent}）`
}
