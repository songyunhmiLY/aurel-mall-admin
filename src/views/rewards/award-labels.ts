import type { AwardType } from '@/api/reward-entries'

export const awardTypeOptions: { value: AwardType; label: string }[] = [
  { value: 'startup_sales', label: '创业专区销售奖' },
  { value: 'startup_points', label: '创业专区见点奖' },
  { value: 'mall_sales', label: '会员商城销售奖' },
  { value: 'mall_points', label: '会员商城见点奖' },
]

const awardTypeLabels: Record<string, string> = Object.fromEntries(
  awardTypeOptions.map((item) => [item.value, item.label]),
)

export function awardTypeLabel(rewardType: string): string {
  if (!rewardType) return '—'
  return awardTypeLabels[rewardType] ?? rewardType
}
