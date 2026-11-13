import { ApiError, http } from './http'
import { asRecord, readId, readInteger, readNullableString, readPage, readString } from './json'

/**
 * 管理端商城退款。订单金额是 JSON 数字，单位分。
 * 审核通过的请求只带 refundFen 或 deductionFen 其中一个数字。
 */
export interface AdminRefund {
  id: string
  orderId: string
  userId: string
  status: string
  payAmountFen: number
  freightFen: number
  deductionHint: string
  refundFen: number | null
  deductionFen: number | null
  wechatRefundFen: number | null
  withdrawableDeductionFen: number | null
  consumptionCreditFen: number | null
  wechatRefundStatus: string | null
  appliedAt: string
  decidedAt: string
}

export interface RefundPage {
  items: AdminRefund[]
  total: number
  page: number
  pageSize: number
}

export interface RefundQuery {
  status?: 'pending' | 'approved' | 'rejected'
  userId?: string
  page: number
  pageSize: number
}

export type ApproveRefundBody = { refundFen: number } | { deductionFen: number }

const refundsPath = '/admin/refunds'

export async function fetchRefunds(query: RefundQuery): Promise<RefundPage> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.status) params.status = query.status
  if (query.userId) params.userId = query.userId
  const { data } = await http.get<unknown>(refundsPath, { params })
  const page = readPage(data, '退款')
  return { ...page, items: page.items.map((item) => readRefund(item)) }
}

export async function approveRefund(id: string, body: ApproveRefundBody): Promise<AdminRefund> {
  const payload = approvePayload(body)
  const { data } = await http.post<unknown>(
    `${refundsPath}/${encodeURIComponent(id)}/approve`,
    payload,
  )
  return readRefund(data)
}

export async function rejectRefund(id: string): Promise<AdminRefund> {
  const { data } = await http.post<unknown>(`${refundsPath}/${encodeURIComponent(id)}/reject`)
  return readRefund(data)
}

/** 保证 JSON 里只有一个数字字段，避免把另一项预览值一起提交。 */
function approvePayload(body: ApproveRefundBody): ApproveRefundBody {
  if ('refundFen' in body) return { refundFen: body.refundFen }
  return { deductionFen: body.deductionFen }
}

function readRefund(data: unknown): AdminRefund {
  const record = asRecord(data)
  const id = readId(record?.id)
  const orderId = readId(record?.orderId)
  const userId = readId(record?.userId)
  const payAmountFen = readInteger(record?.payAmountFen)
  const freightFen = readInteger(record?.freightFen)
  if (!record || !id || !orderId || !userId || payAmountFen == null || freightFen == null) {
    throw new ApiError('退款响应无效', 500)
  }
  return {
    id,
    orderId,
    userId,
    status: readString(record.status),
    payAmountFen,
    freightFen,
    deductionHint: readString(record.deductionHint),
    refundFen: readNullableFen(record.refundFen),
    deductionFen: readNullableFen(record.deductionFen),
    wechatRefundFen: readNullableFen(record.wechatRefundFen),
    withdrawableDeductionFen: readNullableFen(record.withdrawableDeductionFen),
    consumptionCreditFen: readNullableFen(record.consumptionCreditFen),
    wechatRefundStatus: readNullableStatus(record.wechatRefundStatus),
    appliedAt: readNullableString(record.appliedAt),
    decidedAt: readNullableString(record.decidedAt),
  }
}

function readNullableFen(value: unknown): number | null {
  if (value == null) return null
  const fen = readInteger(value)
  if (fen == null) throw new ApiError('退款响应无效', 500)
  return fen
}

function readNullableStatus(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'string') throw new ApiError('退款响应无效', 500)
  return value
}
