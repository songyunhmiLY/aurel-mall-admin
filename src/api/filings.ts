import { ApiError, http } from './http'
import {
  asRecord,
  readDecimalFen,
  readId,
  readInteger,
  readNullableString,
  readPage,
  readString,
} from './json'

/** 幸运返还。积分和可提现都是十进制字符串，单位分。 */
export interface FilingSettlement {
  triggerSequence: number
  beneficiaryFilingId: string
  beneficiaryUserId: string
  pointsFen: string
  withdrawableFen: string
  unitPriceFen: number
  withdrawalRatioBps: number
  settledAt: string
}

export interface AdminFiling {
  id: string
  filingNo: string
  userId: string
  nickname: string
  orderId: string
  subOrderId: string
  sequence: number | null
  bizDate: string
  status: string
  amountFen: number
  filedAt: string
  settledAt: string
  settlement: FilingSettlement | null
  triggeredSettlement: FilingSettlement | null
}

export interface FilingPage {
  items: AdminFiling[]
  total: number
  page: number
  pageSize: number
}

export interface FilingSettlementPage {
  items: FilingSettlement[]
  total: number
  page: number
  pageSize: number
}

export interface FilingQuery {
  userId?: string
  bizDate?: string
  sequence?: string
  page: number
  pageSize: number
}

export async function fetchFilings(query: FilingQuery): Promise<FilingPage> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.userId) params.userId = query.userId
  if (query.bizDate) params.bizDate = query.bizDate
  if (query.sequence) params.sequence = query.sequence
  const { data } = await http.get<unknown>('/admin/filings', { params })
  const page = readPage(data, '报单')
  return { ...page, items: page.items.map((item) => readFiling(item)) }
}

export async function fetchFilingSettlements(
  userId: string | undefined,
  page: number,
  pageSize: number,
): Promise<FilingSettlementPage> {
  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  }
  if (userId) params.userId = userId
  const { data } = await http.get<unknown>('/admin/filing-settlements', { params })
  const result = readPage(data, '幸运返还')
  return { ...result, items: result.items.map((item) => readSettlement(item)) }
}

function readFiling(data: unknown): AdminFiling {
  const record = asRecord(data)
  const id = readId(record?.id)
  const userId = readId(record?.userId)
  const amountFen = readInteger(record?.amountFen)
  if (!record || !id || !userId || amountFen == null) throw new ApiError('报单响应无效', 500)
  return {
    id,
    filingNo: readString(record.filingNo),
    userId,
    nickname: readString(record.nickname),
    orderId: readId(record.orderId),
    subOrderId: readId(record.subOrderId),
    sequence: readInteger(record.sequence),
    bizDate: readNullableString(record.bizDate),
    status: readString(record.status),
    amountFen,
    filedAt: readNullableString(record.filedAt),
    settledAt: readNullableString(record.settledAt),
    settlement: record.settlement == null ? null : readSettlement(record.settlement),
    triggeredSettlement:
      record.triggeredSettlement == null ? null : readSettlement(record.triggeredSettlement),
  }
}

function readSettlement(data: unknown): FilingSettlement {
  const record = asRecord(data)
  const triggerSequence = readInteger(record?.triggerSequence)
  const beneficiaryFilingId = readId(record?.beneficiaryFilingId)
  const beneficiaryUserId = readId(record?.beneficiaryUserId)
  const pointsFen = readDecimalFen(record?.pointsFen)
  const withdrawableFen = readDecimalFen(record?.withdrawableFen)
  const unitPriceFen = readInteger(record?.unitPriceFen)
  const withdrawalRatioBps = readInteger(record?.withdrawalRatioBps)
  if (
    !record ||
    triggerSequence == null ||
    !beneficiaryFilingId ||
    !beneficiaryUserId ||
    pointsFen == null ||
    withdrawableFen == null ||
    unitPriceFen == null ||
    withdrawalRatioBps == null
  ) {
    throw new ApiError('幸运返还响应无效', 500)
  }
  return {
    triggerSequence,
    beneficiaryFilingId,
    beneficiaryUserId,
    pointsFen,
    withdrawableFen,
    unitPriceFen,
    withdrawalRatioBps,
    settledAt: readNullableString(record.settledAt),
  }
}
