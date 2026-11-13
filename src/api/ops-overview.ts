import { ApiError, http } from './http'
import { asRecord, readDecimalFen, readId, readInteger, readString } from './json'

/** 运营总览的区间。自然日按 Asia/Shanghai。 */
export type OpsPeriodKey = 'today' | 'yesterday' | 'last7days' | 'month' | 'custom'

export interface OpsOverviewQuery {
  period: OpsPeriodKey
  /** 自定义区间的上海自然日，含首尾。仅 `custom` 发送。 */
  from?: string
  to?: string
}

export interface OpsPeriod {
  key: string
  timezone: string
  from: string
  until: string
  fromBizDate: string
  untilBizDate: string
}

export interface OpsCountComparison {
  count: number
  previousDay: string
  previousDayCount: number
  delta: number
}

export interface OpsMoneyCount {
  count: number
  amountFen: string
}

export interface OpsWechatCash {
  cashInFen: string
  cashRefundedFen: string
  netFen: string
}

export interface OpsKpis {
  registeredUsers: number
  members: number
  newRegistrations: OpsCountComparison
  newMembers: OpsCountComparison
  wechatCash: OpsWechatCash
  pendingWithdrawals: OpsMoneyCount
}

export interface OpsTrendPoint {
  bizDate: string
  startupPayableFen: string
  mallPayableFen: string
}

export interface OpsZoneComposition {
  orderCount: number
  itemQuantity: number
  payableFen: string
  pendingShipmentCount: number
  shippedCount: number
  closedCount: number
}

export interface OpsCashComposition {
  wechatCashInFen: string
  wechatCashRefundedFen: string
  netCashFen: string
  withdrawalPayoutFen: string
  cofounderActivationFen: string
}

export interface OpsCompletedPayouts {
  count: number
  amountFen: string
  payoutFen: string
}

export interface OpsMutualExclusion {
  withdrawalBlocksRefundUserCount: number
  refundBlocksWithdrawalUserCount: number
  bothPendingUserCount: number
}

export interface OpsWithdrawals {
  pendingReview: OpsMoneyCount
  completedPayouts: OpsCompletedPayouts
  pendingRefunds: { count: number }
  mutualExclusion: OpsMutualExclusion
}

export interface OpsWalletBucket {
  availableFen: string
  frozenFen: string
}

export interface OpsWallets {
  withdrawable: OpsWalletBucket
  points: OpsWalletBucket
  consumption: OpsWalletBucket
  withdrawalAppliedUnpaidFen: string
}

export interface OpsLuckyReturn {
  id: string
  triggerSequence: number
  beneficiarySequence: number
  beneficiaryFilingId: string
  beneficiaryUserId: string
  pointsFen: string
  withdrawableFen: string
  settledAt: string
}

export interface OpsFiling {
  todayFiledCount: number
  todayBizDate: string
  currentSequence: number
  nextLuckyReturnSequence: number
  nextLuckyReturnBeneficiarySequence: number
  latestLuckyReturn: OpsLuckyReturn | null
  backlogCount: number
  dailyCheckTime: string
}

export interface OpsPositionCount {
  positionCode: string
  positionName: string
  qualifiedCount: number
}

export interface OpsPositionQualifications {
  available: boolean
  performanceMonth: string
  thresholdFen: string
  counts: OpsPositionCount[]
}

export interface OpsOrganization {
  seatedMembers: number
  nonMembers: number
  membersWithThreeMarkets: number
  positionQualifications: OpsPositionQualifications
}

export interface OpsOverview {
  period: OpsPeriod
  kpis: OpsKpis
  trend: OpsTrendPoint[]
  composition: {
    startup: OpsZoneComposition
    mall: OpsZoneComposition
    cash: OpsCashComposition
  }
  withdrawals: OpsWithdrawals
  wallets: OpsWallets
  filing: OpsFiling
  organization: OpsOrganization
}

const overviewPath = '/admin/ops/overview'
const periodKeys = new Set<OpsPeriodKey>(['today', 'yesterday', 'last7days', 'month', 'custom'])

export async function fetchOpsOverview(
  query: OpsOverviewQuery,
  signal?: AbortSignal,
): Promise<OpsOverview> {
  if (!periodKeys.has(query.period)) throw new ApiError('周期不正确', 400)
  const params: Record<string, string> = { period: query.period }
  if (query.period === 'custom') {
    if (!query.from || !query.to) throw new ApiError('自定义区间需要 from 和 to', 400)
    params.from = query.from
    params.to = query.to
  }
  const { data } = await http.get<unknown>(overviewPath, { params, signal })
  return readOverview(data)
}

function readOverview(data: unknown): OpsOverview {
  const record = asRecord(data)
  if (!record) invalid()
  const composition = asRecord(record.composition)
  if (!composition) invalid()
  return {
    period: readPeriod(record.period),
    kpis: readKpis(record.kpis),
    trend: readTrend(record.trend),
    composition: {
      startup: readZone(composition.startup),
      mall: readZone(composition.mall),
      cash: readCash(composition.cash),
    },
    withdrawals: readWithdrawals(record.withdrawals),
    wallets: readWallets(record.wallets),
    filing: readFiling(record.filing),
    organization: readOrganization(record.organization),
  }
}

function readPeriod(value: unknown): OpsPeriod {
  const record = asRecord(value)
  const fromBizDate = readString(record?.fromBizDate)
  const untilBizDate = readString(record?.untilBizDate)
  const from = readString(record?.from)
  const until = readString(record?.until)
  const timezone = readString(record?.timezone)
  const key = readString(record?.key)
  if (
    !record ||
    !key ||
    !timezone ||
    !from ||
    !until ||
    !isBizDate(fromBizDate) ||
    !isBizDate(untilBizDate)
  ) {
    invalid()
  }
  return { key, timezone, from, until, fromBizDate, untilBizDate }
}

function readKpis(value: unknown): OpsKpis {
  const record = asRecord(value)
  const registeredUsers = readCount(record?.registeredUsers)
  const members = readCount(record?.members)
  if (!record || registeredUsers == null || members == null) invalid()
  return {
    registeredUsers,
    members,
    newRegistrations: readComparison(record.newRegistrations),
    newMembers: readComparison(record.newMembers),
    wechatCash: readWechatCash(record.wechatCash),
    pendingWithdrawals: readMoneyCount(record.pendingWithdrawals),
  }
}

function readComparison(value: unknown): OpsCountComparison {
  const record = asRecord(value)
  const count = readCount(record?.count)
  const previousDayCount = readCount(record?.previousDayCount)
  const delta = readInteger(record?.delta)
  const previousDay = readString(record?.previousDay)
  if (
    !record ||
    count == null ||
    previousDayCount == null ||
    delta == null ||
    !isBizDate(previousDay)
  ) {
    invalid()
  }
  return { count, previousDay, previousDayCount, delta }
}

function readWechatCash(value: unknown): OpsWechatCash {
  const record = asRecord(value)
  const cashInFen = readDecimalFen(record?.cashInFen)
  const cashRefundedFen = readDecimalFen(record?.cashRefundedFen)
  const netFen = readDecimalFen(record?.netFen)
  if (!record || cashInFen == null || cashRefundedFen == null || netFen == null) invalid()
  return { cashInFen, cashRefundedFen, netFen }
}

function readMoneyCount(value: unknown): OpsMoneyCount {
  const record = asRecord(value)
  const count = readCount(record?.count)
  const amountFen = readDecimalFen(record?.amountFen)
  if (!record || count == null || amountFen == null) invalid()
  return { count, amountFen }
}

function readTrend(value: unknown): OpsTrendPoint[] {
  if (!Array.isArray(value)) invalid()
  return value.map((item) => {
    const record = asRecord(item)
    const bizDate = readString(record?.bizDate)
    const startupPayableFen = readDecimalFen(record?.startupPayableFen)
    const mallPayableFen = readDecimalFen(record?.mallPayableFen)
    if (!record || !isBizDate(bizDate) || startupPayableFen == null || mallPayableFen == null)
      invalid()
    return { bizDate, startupPayableFen, mallPayableFen }
  })
}

function readZone(value: unknown): OpsZoneComposition {
  const record = asRecord(value)
  const orderCount = readCount(record?.orderCount)
  const itemQuantity = readCount(record?.itemQuantity)
  const payableFen = readDecimalFen(record?.payableFen)
  const pendingShipmentCount = readCount(record?.pendingShipmentCount)
  const shippedCount = readCount(record?.shippedCount)
  const closedCount = readCount(record?.closedCount)
  if (
    !record ||
    orderCount == null ||
    itemQuantity == null ||
    payableFen == null ||
    pendingShipmentCount == null ||
    shippedCount == null ||
    closedCount == null
  ) {
    invalid()
  }
  return {
    orderCount,
    itemQuantity,
    payableFen,
    pendingShipmentCount,
    shippedCount,
    closedCount,
  }
}

function readCash(value: unknown): OpsCashComposition {
  const record = asRecord(value)
  const wechatCashInFen = readDecimalFen(record?.wechatCashInFen)
  const wechatCashRefundedFen = readDecimalFen(record?.wechatCashRefundedFen)
  const netCashFen = readDecimalFen(record?.netCashFen)
  const withdrawalPayoutFen = readDecimalFen(record?.withdrawalPayoutFen)
  const cofounderActivationFen = readDecimalFen(record?.cofounderActivationFen)
  if (
    !record ||
    wechatCashInFen == null ||
    wechatCashRefundedFen == null ||
    netCashFen == null ||
    withdrawalPayoutFen == null ||
    cofounderActivationFen == null
  ) {
    invalid()
  }
  return {
    wechatCashInFen,
    wechatCashRefundedFen,
    netCashFen,
    withdrawalPayoutFen,
    cofounderActivationFen,
  }
}

function readWithdrawals(value: unknown): OpsWithdrawals {
  const record = asRecord(value)
  const completed = asRecord(record?.completedPayouts)
  const pendingRefunds = asRecord(record?.pendingRefunds)
  const mutual = asRecord(record?.mutualExclusion)
  const completedCount = readCount(completed?.count)
  const amountFen = readDecimalFen(completed?.amountFen)
  const payoutFen = readDecimalFen(completed?.payoutFen)
  const pendingRefundCount = readCount(pendingRefunds?.count)
  const withdrawalBlocksRefundUserCount = readCount(mutual?.withdrawalBlocksRefundUserCount)
  const refundBlocksWithdrawalUserCount = readCount(mutual?.refundBlocksWithdrawalUserCount)
  const bothPendingUserCount = readCount(mutual?.bothPendingUserCount)
  if (
    !record ||
    !completed ||
    !pendingRefunds ||
    !mutual ||
    completedCount == null ||
    amountFen == null ||
    payoutFen == null ||
    pendingRefundCount == null ||
    withdrawalBlocksRefundUserCount == null ||
    refundBlocksWithdrawalUserCount == null ||
    bothPendingUserCount == null
  ) {
    invalid()
  }
  return {
    pendingReview: readMoneyCount(record.pendingReview),
    completedPayouts: { count: completedCount, amountFen, payoutFen },
    pendingRefunds: { count: pendingRefundCount },
    mutualExclusion: {
      withdrawalBlocksRefundUserCount,
      refundBlocksWithdrawalUserCount,
      bothPendingUserCount,
    },
  }
}

function readWallets(value: unknown): OpsWallets {
  const record = asRecord(value)
  const withdrawalAppliedUnpaidFen = readDecimalFen(record?.withdrawalAppliedUnpaidFen)
  if (!record || withdrawalAppliedUnpaidFen == null) invalid()
  return {
    withdrawable: readWalletBucket(record.withdrawable),
    points: readWalletBucket(record.points),
    consumption: readWalletBucket(record.consumption),
    withdrawalAppliedUnpaidFen,
  }
}

function readWalletBucket(value: unknown): OpsWalletBucket {
  const record = asRecord(value)
  const availableFen = readDecimalFen(record?.availableFen)
  const frozenFen = readDecimalFen(record?.frozenFen)
  if (!record || availableFen == null || frozenFen == null) invalid()
  return { availableFen, frozenFen }
}

function readFiling(value: unknown): OpsFiling {
  const record = asRecord(value)
  const todayFiledCount = readCount(record?.todayFiledCount)
  const todayBizDate = readString(record?.todayBizDate)
  const currentSequence = readCount(record?.currentSequence)
  const nextLuckyReturnSequence = readCount(record?.nextLuckyReturnSequence)
  const nextLuckyReturnBeneficiarySequence = readCount(record?.nextLuckyReturnBeneficiarySequence)
  const backlogCount = readCount(record?.backlogCount)
  const dailyCheckTime = readString(record?.dailyCheckTime)
  if (
    !record ||
    todayFiledCount == null ||
    !isBizDate(todayBizDate) ||
    currentSequence == null ||
    nextLuckyReturnSequence == null ||
    nextLuckyReturnBeneficiarySequence == null ||
    backlogCount == null ||
    !dailyCheckTime
  ) {
    invalid()
  }
  return {
    todayFiledCount,
    todayBizDate,
    currentSequence,
    nextLuckyReturnSequence,
    nextLuckyReturnBeneficiarySequence,
    latestLuckyReturn: readLuckyReturn(record.latestLuckyReturn),
    backlogCount,
    dailyCheckTime,
  }
}

function readLuckyReturn(value: unknown): OpsLuckyReturn | null {
  if (value == null) return null
  const record = asRecord(value)
  const id = readId(record?.id)
  const triggerSequence = readCount(record?.triggerSequence)
  const beneficiarySequence = readCount(record?.beneficiarySequence)
  const beneficiaryFilingId = readId(record?.beneficiaryFilingId)
  const beneficiaryUserId = readId(record?.beneficiaryUserId)
  const pointsFen = readDecimalFen(record?.pointsFen)
  const withdrawableFen = readDecimalFen(record?.withdrawableFen)
  const settledAt = readString(record?.settledAt)
  if (
    !record ||
    !id ||
    triggerSequence == null ||
    beneficiarySequence == null ||
    !beneficiaryFilingId ||
    !beneficiaryUserId ||
    pointsFen == null ||
    withdrawableFen == null ||
    !settledAt
  ) {
    invalid()
  }
  return {
    id,
    triggerSequence,
    beneficiarySequence,
    beneficiaryFilingId,
    beneficiaryUserId,
    pointsFen,
    withdrawableFen,
    settledAt,
  }
}

function readOrganization(value: unknown): OpsOrganization {
  const record = asRecord(value)
  const seatedMembers = readCount(record?.seatedMembers)
  const nonMembers = readCount(record?.nonMembers)
  const membersWithThreeMarkets = readCount(record?.membersWithThreeMarkets)
  if (!record || seatedMembers == null || nonMembers == null || membersWithThreeMarkets == null) {
    invalid()
  }
  return {
    seatedMembers,
    nonMembers,
    membersWithThreeMarkets,
    positionQualifications: readQualifications(record.positionQualifications),
  }
}

function readQualifications(value: unknown): OpsPositionQualifications {
  const record = asRecord(value)
  if (!record || typeof record.available !== 'boolean') invalid()
  if (!record.available) {
    return { available: false, performanceMonth: '', thresholdFen: '0', counts: [] }
  }
  const performanceMonth = readString(record.performanceMonth)
  const thresholdFen = readDecimalFen(record.thresholdFen)
  if (!performanceMonth || thresholdFen == null || !Array.isArray(record.counts)) invalid()
  return {
    available: true,
    performanceMonth,
    thresholdFen,
    counts: record.counts.map((item) => {
      const row = asRecord(item)
      const positionCode = readString(row?.positionCode)
      const positionName = readString(row?.positionName)
      const qualifiedCount = readCount(row?.qualifiedCount)
      if (!row || !positionCode || qualifiedCount == null) invalid()
      return { positionCode, positionName, qualifiedCount }
    }),
  }
}

function readCount(value: unknown): number | null {
  const parsed = readInteger(value)
  if (parsed == null || parsed < 0) return null
  return parsed
}

function isBizDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function invalid(): never {
  throw new ApiError('运营总览响应无效', 500)
}
