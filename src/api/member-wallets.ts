import { ApiError, http } from './http'
import { asRecord, readDecimalFen, readId, readNullableString, readPage, readString } from './json'

export type WalletType = 'points' | 'withdrawable' | 'consumption'

export interface WalletBalance {
  balanceFen: string
  frozenFen: string
  availableFen: string
}

export interface MemberWallets {
  points: WalletBalance
  withdrawable: WalletBalance
  consumption: WalletBalance
}

export interface WalletLedgerEntry {
  id: string
  walletType: string
  direction: string
  amountFen: string
  balanceAfterFen: string
  bizType: string
  bizId: string
  sourceCode: string
  occurredAt: string
}

export interface WalletHold {
  id: string
  orderId: string
  walletType: string
  amountFen: string
  status: string
  createdAt: string
}

export interface ConsumptionTransferRow {
  id: string
  payerUserId: string
  payerNickname: string
  payeeUserId: string
  payeeNickname: string
  amountFen: string
  createdAt: string
}

export interface WalletLedgerPage {
  items: WalletLedgerEntry[]
  total: number
  page: number
  pageSize: number
}

export interface WalletHoldPage {
  items: WalletHold[]
  total: number
  page: number
  pageSize: number
}

export interface TransferPage {
  items: ConsumptionTransferRow[]
  total: number
  page: number
  pageSize: number
}

export async function fetchMemberWallets(userId: string): Promise<MemberWallets> {
  const { data } = await http.get<unknown>(`/admin/users/${encodeURIComponent(userId)}/wallets`)
  return readWallets(data)
}

export async function fetchMemberLedger(
  userId: string,
  walletType: WalletType,
  page: number,
  pageSize: number,
): Promise<WalletLedgerPage> {
  const { data } = await http.get<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/wallets/${walletType}/ledger`,
    { params: { page: String(page), pageSize: String(pageSize) } },
  )
  const result = readPage(data, '钱包流水')
  return { ...result, items: result.items.map((item) => readLedger(item)) }
}

export async function fetchMemberHolds(
  userId: string,
  page: number,
  pageSize: number,
  status?: string,
): Promise<WalletHoldPage> {
  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  }
  if (status) params.status = status
  const { data } = await http.get<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/wallet-holds`,
    { params },
  )
  const result = readPage(data, '钱包冻结')
  return { ...result, items: result.items.map((item) => readHold(item)) }
}

export async function fetchMemberTransfers(query: {
  payerId?: string
  payeeId?: string
  page: number
  pageSize: number
}): Promise<TransferPage> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.payerId) params.payerId = query.payerId
  if (query.payeeId) params.payeeId = query.payeeId
  const { data } = await http.get<unknown>('/admin/transfers', { params })
  const result = readPage(data, '消费划转')
  return { ...result, items: result.items.map((item) => readTransfer(item)) }
}

function readWallets(data: unknown): MemberWallets {
  const record = asRecord(data)
  if (!record) throw new ApiError('钱包响应无效', 500)
  return {
    points: readBalance(record.points),
    withdrawable: readBalance(record.withdrawable),
    consumption: readBalance(record.consumption),
  }
}

function readBalance(data: unknown): WalletBalance {
  const record = asRecord(data)
  const balanceFen = readDecimalFen(record?.balanceFen)
  const frozenFen = readDecimalFen(record?.frozenFen)
  const availableFen = readDecimalFen(record?.availableFen)
  if (!record || balanceFen == null || frozenFen == null || availableFen == null) {
    throw new ApiError('钱包响应无效', 500)
  }
  return { balanceFen, frozenFen, availableFen }
}

function readLedger(data: unknown): WalletLedgerEntry {
  const record = asRecord(data)
  const id = readId(record?.id)
  const amountFen = readDecimalFen(record?.amountFen)
  const balanceAfterFen = readDecimalFen(record?.balanceAfterFen)
  if (!record || !id || amountFen == null || balanceAfterFen == null) {
    throw new ApiError('钱包流水响应无效', 500)
  }
  return {
    id,
    walletType: readString(record.walletType),
    direction: readString(record.direction),
    amountFen,
    balanceAfterFen,
    bizType: readString(record.bizType),
    bizId: readString(record.bizId),
    sourceCode: readString(record.sourceCode),
    occurredAt: readNullableString(record.occurredAt),
  }
}

function readHold(data: unknown): WalletHold {
  const record = asRecord(data)
  const id = readId(record?.id)
  const amountFen = readDecimalFen(record?.amountFen)
  if (!record || !id || amountFen == null) throw new ApiError('钱包冻结响应无效', 500)
  return {
    id,
    orderId: readId(record.orderId),
    walletType: readString(record.walletType),
    amountFen,
    status: readString(record.status),
    createdAt: readNullableString(record.createdAt),
  }
}

function readTransfer(data: unknown): ConsumptionTransferRow {
  const record = asRecord(data)
  const id = readId(record?.id)
  const payerUserId = readId(record?.payerUserId)
  const payeeUserId = readId(record?.payeeUserId)
  const amountFen = readDecimalFen(record?.amountFen)
  if (!record || !id || !payerUserId || !payeeUserId || amountFen == null) {
    throw new ApiError('消费划转响应无效', 500)
  }
  return {
    id,
    payerUserId,
    payerNickname: readString(record.payerNickname),
    payeeUserId,
    payeeNickname: readString(record.payeeNickname),
    amountFen,
    createdAt: readNullableString(record.createdAt),
  }
}
