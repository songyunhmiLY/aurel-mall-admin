import { ApiError, http } from './http'
import { asRecord, readDecimalFen, readId, readNullableString, readPage, readString } from './json'

/** 管理端提现。金额是十进制字符串，单位分。 */
export interface WithdrawalSettlement {
  outcome: string
  amountFen: string
  /** 历史字段。平台不收手续费，新记录的 feeFen 恒为 null。 */
  feeFen: string | null
  /** 实际打款金额。平台不收手续费，与申请金额相等。 */
  payoutFen: string | null
  adminId: string
  settledAt: string
}

export interface AdminWithdrawal {
  id: string
  userId: string
  amountFen: string
  status: string
  accountName: string
  bankName: string
  accountNo: string
  branchName: string
  appliedAt: string
  settlement: WithdrawalSettlement | null
}

export interface WithdrawalPage {
  items: AdminWithdrawal[]
  total: number
  page: number
  pageSize: number
}

export interface WithdrawalQuery {
  status?: 'pending' | 'rejected' | 'paid'
  userId?: string
  page: number
  pageSize: number
}

const withdrawalsPath = '/admin/withdrawals'

export async function fetchWithdrawals(query: WithdrawalQuery): Promise<WithdrawalPage> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.status) params.status = query.status
  if (query.userId) params.userId = query.userId
  const { data } = await http.get<unknown>(withdrawalsPath, { params })
  const page = readPage(data, '提现')
  return { ...page, items: page.items.map((item) => readWithdrawal(item)) }
}

export async function fetchWithdrawal(id: string): Promise<AdminWithdrawal> {
  const { data } = await http.get<unknown>(`${withdrawalsPath}/${encodeURIComponent(id)}`)
  return readWithdrawal(data)
}

export async function rejectWithdrawal(id: string): Promise<AdminWithdrawal> {
  const { data } = await http.post<unknown>(`${withdrawalsPath}/${encodeURIComponent(id)}/reject`)
  return readWithdrawal(data)
}

/** 确认财务已经完成线下打款。请求没有 body，打款金额就是申请金额。 */
export async function payoutWithdrawal(id: string): Promise<AdminWithdrawal> {
  const { data } = await http.post<unknown>(`${withdrawalsPath}/${encodeURIComponent(id)}/payout`)
  return readWithdrawal(data)
}

function readWithdrawal(data: unknown): AdminWithdrawal {
  const record = asRecord(data)
  const id = readId(record?.id)
  const userId = readId(record?.userId)
  const amountFen = readDecimalFen(record?.amountFen)
  if (!record || !id || !userId || amountFen == null) throw new ApiError('提现响应无效', 500)
  return {
    id,
    userId,
    amountFen,
    status: readString(record.status),
    accountName: readString(record.accountName),
    bankName: readString(record.bankName),
    accountNo: readString(record.accountNo),
    branchName: readString(record.branchName),
    appliedAt: readNullableString(record.appliedAt),
    settlement: readSettlement(record.settlement),
  }
}

function readSettlement(value: unknown): WithdrawalSettlement | null {
  if (value == null) return null
  const record = asRecord(value)
  const adminId = readId(record?.adminId)
  const amountFen = readDecimalFen(record?.amountFen)
  if (!record || !adminId || amountFen == null) throw new ApiError('提现响应无效', 500)
  return {
    outcome: readString(record.outcome),
    amountFen,
    feeFen: readNullableDecimalFen(record.feeFen),
    payoutFen: readNullableDecimalFen(record.payoutFen),
    adminId,
    settledAt: readNullableString(record.settledAt),
  }
}

function readNullableDecimalFen(value: unknown): string | null {
  if (value == null) return null
  const fen = readDecimalFen(value)
  if (fen == null) throw new ApiError('提现响应无效', 500)
  return fen
}
