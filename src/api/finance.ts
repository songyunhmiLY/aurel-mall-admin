import { ApiError, http } from './http'
import { asRecord, readDecimalFen, readInteger, readString } from './json'

/** 财务对账。所有金额都是十进制字符串，单位分。 */
export interface FinanceOverview {
  range: { from: string; to: string }
  cash: { inflowFen: string; outflowFen: string; netFen: string }
  byBizType: Array<{ bizType: string; direction: string; amountFen: string }>
  withdrawals: { pendingCount: number; pendingFen: string }
  walletLiability: Array<{ walletType: string; balanceFen: string; frozenFen: string }>
  walletLiabilityTotalFen: string
}

export interface CashLedgerEntry {
  id: string
  direction: string
  amountFen: string
  bizType: string
  bizId: string
  occurredAt: string
}

export interface CashLedgerPage {
  range: { from: string; to: string }
  rows: CashLedgerEntry[]
  total: number
  page: number
  pageSize: number
}

export interface Reconciliation {
  range: { from: string; to: string }
  orderWechatFen: string
  ledgerWechatFen: string
  diffFen: string
  matched: boolean
  missingOrderIds: string[]
}

export interface FinanceQuery {
  from?: string
  to?: string
}

export async function fetchOverview(query: FinanceQuery): Promise<FinanceOverview> {
  const { data } = await http.get<unknown>('/admin/finance/overview', { params: query })
  const record = requireRecord(data, '财务概览')
  const cash = asRecord(record.cash) ?? {}
  const withdrawals = asRecord(record.withdrawals) ?? {}
  return {
    range: readRange(record.range),
    cash: {
      inflowFen: readDecimalFen(cash.inflowFen) ?? '0',
      outflowFen: readDecimalFen(cash.outflowFen) ?? '0',
      netFen: readDecimalFen(cash.netFen) ?? '0',
    },
    byBizType: readArray(record.byBizType).map((item) => ({
      bizType: readString(item.bizType),
      direction: readString(item.direction),
      amountFen: readDecimalFen(item.amountFen) ?? '0',
    })),
    withdrawals: {
      pendingCount: readInteger(withdrawals.pendingCount) ?? 0,
      pendingFen: readDecimalFen(withdrawals.pendingFen) ?? '0',
    },
    walletLiability: readArray(record.walletLiability).map((item) => ({
      walletType: readString(item.walletType),
      balanceFen: readDecimalFen(item.balanceFen) ?? '0',
      frozenFen: readDecimalFen(item.frozenFen) ?? '0',
    })),
    walletLiabilityTotalFen: readDecimalFen(record.walletLiabilityTotalFen) ?? '0',
  }
}

export async function fetchCashLedger(
  query: FinanceQuery & { direction?: string; bizType?: string; page: number; pageSize: number },
): Promise<CashLedgerPage> {
  const { data } = await http.get<unknown>('/admin/finance/cash-ledger', { params: query })
  const record = requireRecord(data, '现金流水')
  return {
    range: readRange(record.range),
    rows: readArray(record.rows).map((item) => ({
      id: readString(item.id),
      direction: readString(item.direction),
      amountFen: readDecimalFen(item.amountFen) ?? '0',
      bizType: readString(item.bizType),
      bizId: readString(item.bizId),
      occurredAt: readString(item.occurredAt),
    })),
    total: readInteger(record.total) ?? 0,
    page: readInteger(record.page) ?? 1,
    pageSize: readInteger(record.pageSize) ?? 20,
  }
}

export async function fetchReconciliation(query: FinanceQuery): Promise<Reconciliation> {
  const { data } = await http.get<unknown>('/admin/finance/reconciliation', { params: query })
  const record = requireRecord(data, '对账结果')
  return {
    range: readRange(record.range),
    orderWechatFen: readDecimalFen(record.orderWechatFen) ?? '0',
    ledgerWechatFen: readDecimalFen(record.ledgerWechatFen) ?? '0',
    diffFen: readDecimalFen(record.diffFen) ?? '0',
    matched: record.matched === true,
    missingOrderIds: readArray(record.missingOrderIds).map((item) => readString(item)),
  }
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  const record = asRecord(value)
  if (!record) {
    throw new ApiError(`${label}返回格式不正确`)
  }
  return record
}

function readRange(value: unknown): { from: string; to: string } {
  const record = asRecord(value) ?? {}
  return { from: readString(record.from), to: readString(record.to) }
}

function readArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((item) => {
    const record = asRecord(item)
    return record ? [record] : []
  })
}
