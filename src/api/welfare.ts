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

/** 小程序首页福利专场入口。图片未配置时 imageUrl 为 null。 */
export interface WelfareEntry {
  copy: string
  imageUrl: string | null
}

/** PUT /admin/welfare/entry。只含文案和图片地址。 */
export interface WelfareEntryUpdate {
  copy: string
  imageUrl: string
}

export interface WelfareSignup {
  id: string
  userId: string
  nickname: string
  bizDate: string
  signedAt: string
  settled: boolean
  payoutFen: string | null
}

export interface WelfareParticipant {
  userId: string
  nickname: string
  member: boolean
  eligible: boolean
  actualPayFen: string
  openedRoundCount: number
  claimCapFen: string
  cumulativeClaimedFen: string
  currentRoundNo: number
  currentRoundClaimedFen: string
  signedUpToday: boolean
}

export interface WelfareSignupPage {
  items: WelfareSignup[]
  total: number
  page: number
  pageSize: number
}

export interface WelfareParticipantPage {
  items: WelfareParticipant[]
  total: number
  page: number
  pageSize: number
}

export interface WelfareSignupQuery {
  userId?: string
  bizDate?: string
  page: number
  pageSize: number
}

export interface WelfareParticipantQuery {
  userId?: string
  page: number
  pageSize: number
}

const entryPath = '/admin/welfare/entry'
const signupsPath = '/admin/welfare/signups'
const participantsPath = '/admin/welfare/participants'

export async function fetchWelfareEntry(): Promise<WelfareEntry> {
  const { data } = await http.get<unknown>(entryPath)
  return readEntry(data)
}

export async function saveWelfareEntry(body: WelfareEntryUpdate): Promise<WelfareEntry> {
  const { data } = await http.put<unknown>(entryPath, {
    copy: body.copy,
    imageUrl: body.imageUrl,
  })
  return readEntry(data)
}

export async function fetchWelfareSignups(query: WelfareSignupQuery): Promise<WelfareSignupPage> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.userId) params.userId = query.userId
  if (query.bizDate) params.bizDate = query.bizDate
  const { data } = await http.get<unknown>(signupsPath, { params })
  const page = readPage(data, '报名')
  return { ...page, items: page.items.map((item) => readSignup(item)) }
}

export async function fetchWelfareParticipants(
  query: WelfareParticipantQuery,
): Promise<WelfareParticipantPage> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.userId) params.userId = query.userId
  const { data } = await http.get<unknown>(participantsPath, { params })
  const page = readPage(data, '参与资格')
  return { ...page, items: page.items.map((item) => readParticipant(item)) }
}

function readEntry(data: unknown): WelfareEntry {
  const record = asRecord(data)
  if (!record || typeof record.copy !== 'string') throw new ApiError('入口配置响应无效', 500)
  return {
    copy: record.copy,
    imageUrl: readOptionalImage(record.imageUrl),
  }
}

function readOptionalImage(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'string') throw new ApiError('入口配置响应无效', 500)
  return value.trim() ? value : null
}

function readSignup(data: unknown): WelfareSignup {
  const record = asRecord(data)
  const id = readId(record?.id)
  const userId = readId(record?.userId)
  const settled = readBoolean(record?.settled)
  const payoutFen = record?.payoutFen == null ? null : readDecimalFen(record.payoutFen)
  if (
    !record ||
    !id ||
    !userId ||
    settled == null ||
    (record.payoutFen != null && payoutFen == null)
  ) {
    throw new ApiError('报名列表响应无效', 500)
  }
  return {
    id,
    userId,
    nickname: readString(record.nickname),
    bizDate: readString(record.bizDate),
    signedAt: readString(record.signedAt),
    settled,
    payoutFen,
  }
}

function readParticipant(data: unknown): WelfareParticipant {
  const record = asRecord(data)
  const userId = readId(record?.userId)
  const member = readBoolean(record?.member)
  const eligible = readBoolean(record?.eligible)
  const signedUpToday = readBoolean(record?.signedUpToday)
  const actualPayFen = readDecimalFen(record?.actualPayFen)
  const claimCapFen = readDecimalFen(record?.claimCapFen)
  const cumulativeClaimedFen = readDecimalFen(record?.cumulativeClaimedFen)
  const currentRoundClaimedFen = readDecimalFen(record?.currentRoundClaimedFen)
  const openedRoundCount = readInteger(record?.openedRoundCount)
  const currentRoundNo = readInteger(record?.currentRoundNo)
  if (
    !record ||
    !userId ||
    member == null ||
    eligible == null ||
    signedUpToday == null ||
    actualPayFen == null ||
    claimCapFen == null ||
    cumulativeClaimedFen == null ||
    currentRoundClaimedFen == null ||
    openedRoundCount == null ||
    currentRoundNo == null
  ) {
    throw new ApiError('参与资格列表响应无效', 500)
  }
  return {
    userId,
    nickname: readString(record.nickname),
    member,
    eligible,
    actualPayFen,
    openedRoundCount,
    claimCapFen,
    cumulativeClaimedFen,
    currentRoundNo,
    currentRoundClaimedFen,
    signedUpToday,
  }
}
