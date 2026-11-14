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

export interface SettlementCompensation {
  id: string
  orderId: string
  orderNo: string
  userId: string
  zone: string
  payNo: string
  wechatTradeNo: string | null
  amountFen: string
  failReason: string
  status: string
  retryCount: number
  lastError: string | null
  lastTriedAt: string | null
  completedAt: string | null
  refundedAt: string | null
  createdAt: string
}

export interface CompensationPage {
  items: SettlementCompensation[]
  total: number
  page: number
  pageSize: number
}

export async function fetchCompensations(query: {
  status?: string
  page: number
  pageSize: number
}): Promise<CompensationPage> {
  const { data } = await http.get<unknown>('/admin/finance/settlement-compensations', {
    params: query,
  })
  const record = requireRecord(data, '结算补偿列表')
  return {
    items: readArray(record.items).map((item) => ({
      id: readString(item.id),
      orderId: readString(item.orderId),
      orderNo: readString(item.orderNo),
      userId: readString(item.userId),
      zone: readString(item.zone),
      payNo: readString(item.payNo),
      wechatTradeNo: item.wechatTradeNo == null ? null : readString(item.wechatTradeNo),
      amountFen: readDecimalFen(item.amountFen) ?? '0',
      failReason: readString(item.failReason),
      status: readString(item.status),
      retryCount: readInteger(item.retryCount) ?? 0,
      lastError: item.lastError == null ? null : readString(item.lastError),
      lastTriedAt: item.lastTriedAt == null ? null : readString(item.lastTriedAt),
      completedAt: item.completedAt == null ? null : readString(item.completedAt),
      refundedAt: item.refundedAt == null ? null : readString(item.refundedAt),
      createdAt: readString(item.createdAt),
    })),
    total: readInteger(record.total) ?? 0,
    page: readInteger(record.page) ?? 1,
    pageSize: readInteger(record.pageSize) ?? 20,
  }
}

export async function retryCompensation(id: string, subsidize: boolean): Promise<unknown> {
  const { data } = await http.post<unknown>(`/admin/finance/settlement-compensations/${id}/retry`, {
    subsidize,
  })
  return data
}

export async function refundCompensation(id: string): Promise<unknown> {
  const { data } = await http.post<unknown>(
    `/admin/finance/settlement-compensations/${id}/refund`,
  )
  return data
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
