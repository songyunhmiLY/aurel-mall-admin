import type { OpsCountComparison, OpsPeriod } from '@/api/ops-overview'
import { decimalFenText } from '@/api/money'

export function moneyText(fen: string): string {
  return decimalFenText(fen)
}

/** 用接口返回的业务日起止做标签。同一天只写一天。 */
export function periodRangeText(period: OpsPeriod): string {
  if (period.fromBizDate === period.untilBizDate) return period.fromBizDate
  return `${period.fromBizDate} 至 ${period.untilBizDate}`
}

/** 展示接口给出的 delta，不在页面上重算。 */
export function comparisonText(row: OpsCountComparison): string {
  const change =
    row.delta === 0 ? '持平' : row.delta > 0 ? `多 ${row.delta}` : `少 ${Math.abs(row.delta)}`
  return `较 ${row.previousDay} 的 ${row.previousDayCount} 人，${change}`
}
