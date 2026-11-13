import { ApiError, http } from './http'
import {
  asRecord,
  readBoolean,
  readDecimalFen,
  readId,
  readInteger,
  readPage,
  readString,
} from './json'

/** 四种分配方式互斥。 */
export type CofounderPayoutMode = 'immediate' | 'periodic' | 'pool_total' | 'per_person'

export type CofounderScheduleCycle = 'daily' | 'weekly' | 'monthly' | 'interval'

export type CofounderStatus = 'active' | 'cancelled'

export interface CofounderSchedule {
  cycle: CofounderScheduleCycle
  time: string
  weekday: number
  monthDay: number
  intervalDays: number
  anchorDate: string
}

/** 只读。保存设置时不提交这两项。 */
export interface CofounderLockedRates {
  startupDividendRatioBps: number
  mallDividendRatioBps: number
}

export interface CofounderSettings {
  seatCap: number
  userButtonOpen: boolean
  activationAmountFen: string
  payoutMode: CofounderPayoutMode
  schedule: CofounderSchedule
  poolThresholdFen: string
  perPersonThresholdFen: string
  enrolledCount: number
  poolFen: string
  lockedRates: CofounderLockedRates
}

/** PUT /admin/cofounder/settings。不含在籍人数、池子余额和锁定比例。 */
export interface CofounderSettingsUpdate {
  seatCap: number
  userButtonOpen: boolean
  activationAmountFen: string
  payoutMode: CofounderPayoutMode
  schedule: CofounderSchedule
  poolThresholdFen: string
  perPersonThresholdFen: string
}

export interface CofounderContent {
  entryCopy: string
  entryImageUrls: string[]
  introTitle: string
  introBody: string
  introImageUrls: string[]
}

export interface CofounderEnrollment {
  id: string
  userId: string
  nickname: string
  member: boolean
  status: string
  source: string
  enrolledAt: string
  cancelledAt: string | null
}

export interface CofounderPage {
  items: CofounderEnrollment[]
  total: number
  page: number
  pageSize: number
}

export interface CofounderListQuery {
  status?: CofounderStatus
  page: number
  pageSize: number
}

export interface CofounderAwardTotal {
  rewardType: string
  label: string
  amountFen: string
}

export interface CofounderWithdrawalSettlement {
  outcome: string
  amountFen: string
  feeFen: string | null
  payoutFen: string | null
  settledAt: string
}

export interface CofounderWithdrawalDetail {
  id: string
  amountFen: string
  status: string
  accountName: string
  bankName: string
  accountNo: string
  branchName: string
  appliedAt: string
  settlement: CofounderWithdrawalSettlement | null
}

/** 取消前的审核明细。不包含退款动作。 */
export interface CofounderCancellation {
  userId: string
  nickname: string
  member: boolean
  enrolled: boolean
  source: string | null
  enrolledAt: string | null
  awards: CofounderAwardTotal[]
  cofounderDividendFen: string
  withdrawable: {
    balanceFen: string
    frozenFen: string
    availableFen: string
  }
  withdrawals: {
    completedCount: number
    completedAmountFen: string
    completedPayoutFen: string
    items: CofounderWithdrawalDetail[]
  }
}

const settingsPath = '/admin/cofounder/settings'
const contentPath = '/admin/cofounder/content'
const peoplePath = '/admin/cofounders'

export async function fetchCofounderSettings(): Promise<CofounderSettings> {
  const { data } = await http.get<unknown>(settingsPath)
  return readSettings(data)
}

export async function saveCofounderSettings(
  body: CofounderSettingsUpdate,
): Promise<CofounderSettings> {
  const { data } = await http.put<unknown>(settingsPath, settingsBody(body))
  return readSettings(data)
}

export async function fetchCofounderContent(): Promise<CofounderContent> {
  const { data } = await http.get<unknown>(contentPath)
  return readContent(data)
}

export async function saveCofounderContent(body: CofounderContent): Promise<CofounderContent> {
  const { data } = await http.put<unknown>(contentPath, contentBody(body))
  return readContent(data)
}

export async function fetchCofounders(query: CofounderListQuery): Promise<CofounderPage> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.status) params.status = query.status
  const { data } = await http.get<unknown>(peoplePath, { params })
  const page = readPage(data, '联合创始人')
  return {
    ...page,
    items: page.items.map((item) => readEnrollment(item, '联合创始人列表响应无效')),
  }
}

export async function appointCofounder(userId: string): Promise<CofounderEnrollment> {
  const { data } = await http.post<unknown>(peoplePath, { userId })
  return readEnrollment(data, '指定结果无效')
}

export async function fetchCofounderCancellation(userId: string): Promise<CofounderCancellation> {
  const { data } = await http.get<unknown>(`${peoplePath}/${userId}/cancellation`)
  return readCancellation(data)
}

export async function cancelCofounder(userId: string): Promise<CofounderEnrollment> {
  const { data } = await http.post<unknown>(`${peoplePath}/${userId}/cancel`)
  return readEnrollment(data, '取消结果无效')
}

function settingsBody(body: CofounderSettingsUpdate): CofounderSettingsUpdate {
  return {
    seatCap: body.seatCap,
    userButtonOpen: body.userButtonOpen,
    activationAmountFen: body.activationAmountFen,
    payoutMode: body.payoutMode,
    schedule: {
      cycle: body.schedule.cycle,
      time: body.schedule.time,
      weekday: body.schedule.weekday,
      monthDay: body.schedule.monthDay,
      intervalDays: body.schedule.intervalDays,
      anchorDate: body.schedule.anchorDate,
    },
    poolThresholdFen: body.poolThresholdFen,
    perPersonThresholdFen: body.perPersonThresholdFen,
  }
}

function contentBody(body: CofounderContent): CofounderContent {
  return {
    entryCopy: body.entryCopy,
    entryImageUrls: [...body.entryImageUrls],
    introTitle: body.introTitle,
    introBody: body.introBody,
    introImageUrls: [...body.introImageUrls],
  }
}

function readSettings(data: unknown): CofounderSettings {
  const record = asRecord(data)
  const seatCap = readInteger(record?.seatCap)
  const userButtonOpen = readBoolean(record?.userButtonOpen)
  const activationAmountFen = readNonNegativeFen(record?.activationAmountFen)
  const payoutMode = readPayoutMode(record?.payoutMode)
  const schedule = readSchedule(record?.schedule)
  const poolThresholdFen = readNonNegativeFen(record?.poolThresholdFen)
  const perPersonThresholdFen = readNonNegativeFen(record?.perPersonThresholdFen)
  const enrolledCount = readInteger(record?.enrolledCount)
  const poolFen = readNonNegativeFen(record?.poolFen)
  const lockedRates = readLockedRates(record?.lockedRates)
  if (
    !record ||
    seatCap == null ||
    seatCap < 0 ||
    userButtonOpen == null ||
    activationAmountFen == null ||
    !payoutMode ||
    !schedule ||
    poolThresholdFen == null ||
    perPersonThresholdFen == null ||
    enrolledCount == null ||
    enrolledCount < 0 ||
    poolFen == null ||
    !lockedRates
  ) {
    throw new ApiError('联合创始人配置响应无效', 500)
  }
  return {
    seatCap,
    userButtonOpen,
    activationAmountFen,
    payoutMode,
    schedule,
    poolThresholdFen,
    perPersonThresholdFen,
    enrolledCount,
    poolFen,
    lockedRates,
  }
}

function readContent(data: unknown): CofounderContent {
  const record = asRecord(data)
  const entryImageUrls = readImageList(record?.entryImageUrls)
  const introImageUrls = readImageList(record?.introImageUrls)
  if (
    !record ||
    typeof record.entryCopy !== 'string' ||
    typeof record.introTitle !== 'string' ||
    typeof record.introBody !== 'string' ||
    !entryImageUrls ||
    !introImageUrls
  ) {
    throw new ApiError('联合创始人内容响应无效', 500)
  }
  return {
    entryCopy: record.entryCopy,
    entryImageUrls,
    introTitle: record.introTitle,
    introBody: record.introBody,
    introImageUrls,
  }
}

function readEnrollment(data: unknown, invalidMessage: string): CofounderEnrollment {
  const record = asRecord(data)
  const id = readMemberId(record?.id)
  const userId = readMemberId(record?.userId)
  const member = readBoolean(record?.member)
  const cancelledAt = readNullableInstant(record?.cancelledAt)
  if (
    !record ||
    !id ||
    !userId ||
    member == null ||
    typeof record.status !== 'string' ||
    typeof record.source !== 'string' ||
    typeof record.enrolledAt !== 'string' ||
    (record.cancelledAt != null && cancelledAt == null)
  ) {
    throw new ApiError(invalidMessage, 500)
  }
  return {
    id,
    userId,
    nickname: readString(record.nickname),
    member,
    status: record.status,
    source: record.source,
    enrolledAt: record.enrolledAt,
    cancelledAt,
  }
}

function readCancellation(data: unknown): CofounderCancellation {
  const record = asRecord(data)
  const userId = readMemberId(record?.userId)
  const member = readBoolean(record?.member)
  const enrolled = readBoolean(record?.enrolled)
  const source = readNullableText(record?.source)
  const enrolledAt = readNullableInstant(record?.enrolledAt)
  const awards = readAwards(record?.awards)
  const cofounderDividendFen = readNonNegativeFen(record?.cofounderDividendFen)
  const withdrawable = readWithdrawable(record?.withdrawable)
  const withdrawals = readWithdrawals(record?.withdrawals)
  if (
    !record ||
    !userId ||
    member == null ||
    enrolled == null ||
    (record.source != null && source == null) ||
    (record.enrolledAt != null && enrolledAt == null) ||
    !awards ||
    cofounderDividendFen == null ||
    !withdrawable ||
    !withdrawals
  ) {
    throw new ApiError('取消审核响应无效', 500)
  }
  return {
    userId,
    nickname: readString(record.nickname),
    member,
    enrolled,
    source,
    enrolledAt,
    awards,
    cofounderDividendFen,
    withdrawable,
    withdrawals,
  }
}

function readWithdrawable(value: unknown): CofounderCancellation['withdrawable'] | null {
  const record = asRecord(value)
  const balanceFen = readNonNegativeFen(record?.balanceFen)
  const frozenFen = readNonNegativeFen(record?.frozenFen)
  const availableFen = readDecimalFen(record?.availableFen)
  if (!record || balanceFen == null || frozenFen == null || availableFen == null) return null
  return { balanceFen, frozenFen, availableFen }
}

function readWithdrawals(value: unknown): CofounderCancellation['withdrawals'] | null {
  const record = asRecord(value)
  const completedCount = readInteger(record?.completedCount)
  const completedAmountFen = readNonNegativeFen(record?.completedAmountFen)
  const completedPayoutFen = readNonNegativeFen(record?.completedPayoutFen)
  const items = record?.items
  if (
    !record ||
    completedCount == null ||
    completedCount < 0 ||
    completedAmountFen == null ||
    completedPayoutFen == null ||
    !Array.isArray(items)
  ) {
    return null
  }
  const details: CofounderWithdrawalDetail[] = []
  for (const item of items) {
    const detail = readWithdrawal(item)
    if (!detail) return null
    details.push(detail)
  }
  return { completedCount, completedAmountFen, completedPayoutFen, items: details }
}

function readWithdrawal(data: unknown): CofounderWithdrawalDetail | null {
  const record = asRecord(data)
  const id = readMemberId(record?.id)
  const amountFen = readNonNegativeFen(record?.amountFen)
  const settlement = readSettlement(record?.settlement)
  if (
    !record ||
    !id ||
    amountFen == null ||
    typeof record.status !== 'string' ||
    typeof record.appliedAt !== 'string' ||
    (record.settlement != null && !settlement)
  ) {
    return null
  }
  return {
    id,
    amountFen,
    status: record.status,
    accountName: readString(record.accountName),
    bankName: readString(record.bankName),
    accountNo: readString(record.accountNo),
    branchName: readString(record.branchName),
    appliedAt: record.appliedAt,
    settlement,
  }
}

function readSettlement(value: unknown): CofounderWithdrawalSettlement | null {
  if (value == null) return null
  const record = asRecord(value)
  const amountFen = readNonNegativeFen(record?.amountFen)
  const feeFen = readNullableFen(record?.feeFen)
  const payoutFen = readNullableFen(record?.payoutFen)
  if (
    !record ||
    typeof record.outcome !== 'string' ||
    amountFen == null ||
    (record.feeFen != null && feeFen == null) ||
    (record.payoutFen != null && payoutFen == null) ||
    typeof record.settledAt !== 'string'
  ) {
    return null
  }
  return {
    outcome: record.outcome,
    amountFen,
    feeFen,
    payoutFen,
    settledAt: record.settledAt,
  }
}

function readAwards(value: unknown): CofounderAwardTotal[] | null {
  if (!Array.isArray(value)) return null
  const awards: CofounderAwardTotal[] = []
  for (const item of value) {
    const record = asRecord(item)
    const amountFen = readNonNegativeFen(record?.amountFen)
    if (
      !record ||
      typeof record.rewardType !== 'string' ||
      !record.rewardType ||
      amountFen == null
    ) {
      return null
    }
    awards.push({
      rewardType: record.rewardType,
      label: readString(record.label),
      amountFen,
    })
  }
  return awards
}

function readSchedule(value: unknown): CofounderSchedule | null {
  const record = asRecord(value)
  const cycle = readScheduleCycle(record?.cycle)
  const weekday = readInteger(record?.weekday)
  const monthDay = readInteger(record?.monthDay)
  const intervalDays = readInteger(record?.intervalDays)
  if (
    !record ||
    !cycle ||
    typeof record.time !== 'string' ||
    weekday == null ||
    monthDay == null ||
    intervalDays == null ||
    typeof record.anchorDate !== 'string'
  ) {
    return null
  }
  return {
    cycle,
    time: record.time,
    weekday,
    monthDay,
    intervalDays,
    anchorDate: record.anchorDate,
  }
}

function readLockedRates(value: unknown): CofounderLockedRates | null {
  const record = asRecord(value)
  const startupDividendRatioBps = readInteger(record?.startupDividendRatioBps)
  const mallDividendRatioBps = readInteger(record?.mallDividendRatioBps)
  if (
    !record ||
    startupDividendRatioBps == null ||
    startupDividendRatioBps < 0 ||
    mallDividendRatioBps == null ||
    mallDividendRatioBps < 0
  ) {
    return null
  }
  return { startupDividendRatioBps, mallDividendRatioBps }
}

function readPayoutMode(value: unknown): CofounderPayoutMode | null {
  if (
    value === 'immediate' ||
    value === 'periodic' ||
    value === 'pool_total' ||
    value === 'per_person'
  ) {
    return value
  }
  return null
}

function readScheduleCycle(value: unknown): CofounderScheduleCycle | null {
  if (value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'interval')
    return value
  return null
}

function readImageList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const urls: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return null
    urls.push(item)
  }
  return urls
}

function readNonNegativeFen(value: unknown): string | null {
  const fen = readDecimalFen(value)
  if (fen == null || fen.startsWith('-')) return null
  return fen
}

function readNullableFen(value: unknown): string | null {
  if (value == null) return null
  return readNonNegativeFen(value)
}

function readNullableInstant(value: unknown): string | null {
  if (value == null) return null
  return typeof value === 'string' ? value : null
}

function readNullableText(value: unknown): string | null {
  if (value == null) return null
  return typeof value === 'string' ? value : null
}

/** 会员编号是不含前导零的十进制字符串。 */
function readMemberId(value: unknown): string {
  const id = readId(value)
  return /^[1-9]\d{0,18}$/.test(id) ? id : ''
}
