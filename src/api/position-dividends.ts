import { ApiError, http } from './http'
import {
  asRecord,
  readBoolean,
  readDecimalFen,
  readId,
  readInteger,
  readNullableString,
  readPage,
  readString,
} from './json'

export interface DividendPayment {
  mode: string
  actualAmountFen: string
  remark: string
  paidAt: string
}

export interface DividendMember {
  userId: string
  nickname: string
  removed: boolean
  originalAmountFen: string
  payment: DividendPayment | null
}

export interface DividendPool {
  positionCode: string
  positionName: string
  poolBps: number
  exclusive: boolean
  poolFen: string
  eligibleCount: number
  shareFen: string
  members: DividendMember[]
}

export interface DividendPlan {
  performanceMonth: string
  payoutMonth: string
  payoutDate: string
  status: string
  thresholdFen: string
  mallPvFen: string
  pools: DividendPool[]
}

export interface QualificationRank {
  positionCode: string
  positionName: string
  qualified: boolean
  inPool: boolean
}

export interface QualificationMarket {
  userId: string
  nickname: string
  performanceFen: string
}

export interface UserQualification {
  userId: string
  nickname: string
  performanceMonth: string
  thresholdFen: string
  ranks: QualificationRank[]
  markets: QualificationMarket[]
}

export interface DividendRecord {
  id: string
  userId: string
  positionCode: string
  positionName: string
  mode: string
  originalAmountFen: string
  actualAmountFen: string
  remark: string
  paidAt: string
}

export interface DividendRecordPage {
  items: DividendRecord[]
  total: number
  page: number
  pageSize: number
}

export interface ManualPaymentInput {
  userId: string
  positionCode: string
  actualAmountFen: string
  remark: string
}

const dividendsPath = '/admin/position-dividends'

export async function fetchDividendPlan(month: string): Promise<DividendPlan> {
  const { data } = await http.get<unknown>(dividendsPath, { params: { month } })
  return readPlan(data)
}

export async function updatePayoutDate(month: string, payoutDate: string): Promise<DividendPlan> {
  const { data } = await http.put<unknown>(
    `${dividendsPath}/${encodeURIComponent(month)}/payout-date`,
    { payoutDate },
  )
  return readPlan(data)
}

/** 停止该会员的自动发放。接口不把份额分给其他人。 */
export async function excludeDividendMember(month: string, userId: string): Promise<DividendPlan> {
  const { data } = await http.post<unknown>(
    `${dividendsPath}/${encodeURIComponent(month)}/exclusions`,
    { userId },
  )
  return readPlan(data)
}

export async function payDividendManually(
  month: string,
  input: ManualPaymentInput,
): Promise<DividendRecord> {
  const { data } = await http.post<unknown>(
    `${dividendsPath}/${encodeURIComponent(month)}/manual-payments`,
    input,
  )
  return readRecord(data)
}

export async function fetchUserQualification(
  userId: string,
  month: string,
): Promise<UserQualification> {
  const { data } = await http.get<unknown>(
    `${dividendsPath}/qualifications/${encodeURIComponent(userId)}`,
    { params: { month } },
  )
  return readQualification(data)
}

export async function fetchDividendRecords(
  month: string,
  page: number,
  pageSize: number,
): Promise<DividendRecordPage> {
  const { data } = await http.get<unknown>(
    `${dividendsPath}/${encodeURIComponent(month)}/records`,
    { params: { page: String(page), pageSize: String(pageSize) } },
  )
  const result = readPage(data, '发放记录')
  return { ...result, items: result.items.map((item) => readRecord(item)) }
}

function readPlan(data: unknown): DividendPlan {
  const record = asRecord(data)
  const pools = record?.pools
  const thresholdFen = readDecimalFen(record?.thresholdFen)
  const mallPvFen = readDecimalFen(record?.mallPvFen)
  if (!record || !Array.isArray(pools) || thresholdFen == null || mallPvFen == null) {
    throw new ApiError('职位分红响应无效', 500)
  }
  const performanceMonth = readString(record.performanceMonth)
  const payoutMonth = readString(record.payoutMonth)
  const payoutDate = readString(record.payoutDate)
  if (!performanceMonth || !payoutMonth || !payoutDate) {
    throw new ApiError('职位分红响应无效', 500)
  }
  return {
    performanceMonth,
    payoutMonth,
    payoutDate,
    status: readString(record.status),
    thresholdFen,
    mallPvFen,
    pools: pools.map((item) => readPool(item)),
  }
}

function readPool(data: unknown): DividendPool {
  const record = asRecord(data)
  const members = record?.members
  const poolBps = readInteger(record?.poolBps)
  const exclusive = readBoolean(record?.exclusive)
  const eligibleCount = readInteger(record?.eligibleCount)
  const poolFen = readDecimalFen(record?.poolFen)
  const shareFen = readDecimalFen(record?.shareFen)
  const positionCode = readString(record?.positionCode)
  if (
    !record ||
    !Array.isArray(members) ||
    poolBps == null ||
    exclusive == null ||
    eligibleCount == null ||
    poolFen == null ||
    shareFen == null ||
    !positionCode
  ) {
    throw new ApiError('职位分红响应无效', 500)
  }
  return {
    positionCode,
    positionName: readString(record.positionName),
    poolBps,
    exclusive,
    poolFen,
    eligibleCount,
    shareFen,
    members: members.map((item) => readMember(item)),
  }
}

function readMember(data: unknown): DividendMember {
  const record = asRecord(data)
  const userId = readId(record?.userId)
  const removed = readBoolean(record?.removed)
  const originalAmountFen = readDecimalFen(record?.originalAmountFen)
  if (!record || !userId || removed == null || originalAmountFen == null) {
    throw new ApiError('职位分红响应无效', 500)
  }
  return {
    userId,
    nickname: readString(record.nickname),
    removed,
    originalAmountFen,
    payment: record.payment == null ? null : readPayment(record.payment),
  }
}

function readPayment(data: unknown): DividendPayment {
  const record = asRecord(data)
  const actualAmountFen = readDecimalFen(record?.actualAmountFen)
  if (!record || actualAmountFen == null) throw new ApiError('职位分红响应无效', 500)
  return {
    mode: readString(record.mode),
    actualAmountFen,
    remark: readNullableString(record.remark),
    paidAt: readNullableString(record.paidAt),
  }
}

function readQualification(data: unknown): UserQualification {
  const record = asRecord(data)
  const userId = readId(record?.userId)
  const thresholdFen = readDecimalFen(record?.thresholdFen)
  const ranks = record?.ranks
  const markets = record?.markets
  if (
    !record ||
    !userId ||
    thresholdFen == null ||
    !Array.isArray(ranks) ||
    !Array.isArray(markets)
  ) {
    throw new ApiError('考核结果响应无效', 500)
  }
  return {
    userId,
    nickname: readString(record.nickname),
    performanceMonth: readString(record.performanceMonth),
    thresholdFen,
    ranks: ranks.map((item) => readRank(item)),
    markets: markets.map((item) => readQualificationMarket(item)),
  }
}

function readRank(data: unknown): QualificationRank {
  const record = asRecord(data)
  const qualified = readBoolean(record?.qualified)
  const inPool = readBoolean(record?.inPool)
  const positionCode = readString(record?.positionCode)
  if (!record || qualified == null || inPool == null || !positionCode) {
    throw new ApiError('考核结果响应无效', 500)
  }
  return {
    positionCode,
    positionName: readString(record.positionName),
    qualified,
    inPool,
  }
}

function readQualificationMarket(data: unknown): QualificationMarket {
  const record = asRecord(data)
  const userId = readId(record?.userId)
  const performanceFen = readDecimalFen(record?.performanceFen)
  if (!record || !userId || performanceFen == null) throw new ApiError('考核结果响应无效', 500)
  return { userId, nickname: readString(record.nickname), performanceFen }
}

function readRecord(data: unknown): DividendRecord {
  const record = asRecord(data)
  const id = readId(record?.id)
  const userId = readId(record?.userId)
  const originalAmountFen = readDecimalFen(record?.originalAmountFen)
  const actualAmountFen = readDecimalFen(record?.actualAmountFen)
  const positionCode = readString(record?.positionCode)
  if (
    !record ||
    !id ||
    !userId ||
    !positionCode ||
    originalAmountFen == null ||
    actualAmountFen == null
  ) {
    throw new ApiError('发放记录响应无效', 500)
  }
  return {
    id,
    userId,
    positionCode,
    positionName: readString(record.positionName),
    mode: readString(record.mode),
    originalAmountFen,
    actualAmountFen,
    remark: readNullableString(record.remark),
    paidAt: readNullableString(record.paidAt),
  }
}
