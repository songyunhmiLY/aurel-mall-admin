import type { WalletType } from '@/api/member-wallets'

export const walletTypeOptions: { value: WalletType; label: string }[] = [
  { value: 'points', label: '积分' },
  { value: 'withdrawable', label: '可提现' },
  { value: 'consumption', label: '消费' },
]

const walletTypeLabels = Object.fromEntries(
  walletTypeOptions.map((item) => [item.value, item.label]),
)

const directionLabels: Record<string, string> = {
  credit: '入账',
  debit: '出账',
}

const holdStatusLabels: Record<string, string> = {
  held: '冻结中',
  captured: '已扣款',
  released: '已释放',
}

const sourceLabels: Record<string, string> = {
  startup_sales: '创业专区销售奖',
  startup_points: '创业专区见点奖',
  mall_sales: '会员商城销售奖',
  mall_points: '会员商城见点奖',
  filing_settlement: '幸运返还',
  position_dividend: '业绩奖',
  cofounder: '系统奖励',
  studio: '系统激励',
  operations: '平台分红',
  red_packet: '系统红包',
}

export const holdStatusOptions = [
  { value: 'held', label: '冻结中' },
  { value: 'captured', label: '已扣款' },
  { value: 'released', label: '已释放' },
]

export function walletTypeLabel(walletType: string): string {
  if (!walletType) return '—'
  return walletTypeLabels[walletType] ?? walletType
}

export function directionLabel(direction: string): string {
  if (!direction) return '—'
  return directionLabels[direction] ?? direction
}

export function holdStatusLabel(status: string): string {
  if (!status) return '—'
  return holdStatusLabels[status] ?? status
}

/** 来源编码的含义。不是管理员可改的提现显示名。 */
export function sourceLabel(sourceCode: string): string {
  if (!sourceCode) return '—'
  const gloss = sourceLabels[sourceCode]
  return gloss ? `${gloss}（${sourceCode}）` : sourceCode
}
