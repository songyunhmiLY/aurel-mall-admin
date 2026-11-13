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

/** 创业专区 / 会员商城的销售奖与见点奖。 */
export type AwardType = 'startup_sales' | 'startup_points' | 'mall_sales' | 'mall_points'

export interface AwardWalletLine {
  walletType: string
  amountFen: string
  sourceCode: string
}

export interface RewardEntry {
  id: string
  userId: string
  nickname: string
  rewardType: string
  orderId: string
  layer: number | null
  amountFen: string
  occurredAt: string
  wallets: AwardWalletLine[]
}

export interface RewardEntryPage {
  items: RewardEntry[]
  total: number
  page: number
  pageSize: number
}

export interface RewardEntryQuery {
  rewardType?: AwardType
  orderId?: string
  userId?: string
  layer?: string
  page: number
  pageSize: number
}

export async function fetchRewardEntries(query: RewardEntryQuery): Promise<RewardEntryPage> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.rewardType) params.rewardType = query.rewardType
  if (query.orderId) params.orderId = query.orderId
  if (query.userId) params.userId = query.userId
  if (query.layer) params.layer = query.layer
  const { data } = await http.get<unknown>('/admin/awards', { params })
  const page = readPage(data, '奖励明细')
  return { ...page, items: page.items.map((item) => readEntry(item)) }
}

function readEntry(data: unknown): RewardEntry {
  const record = asRecord(data)
  const id = readId(record?.id)
  const userId = readId(record?.userId)
  const amountFen = readDecimalFen(record?.amountFen)
  const wallets = record?.wallets
  if (!record || !id || !userId || amountFen == null || !Array.isArray(wallets)) {
    throw new ApiError('奖励明细响应无效', 500)
  }
  return {
    id,
    userId,
    nickname: readString(record.nickname),
    rewardType: readString(record.rewardType),
    orderId: readId(record.orderId),
    layer: readInteger(record.layer),
    amountFen,
    occurredAt: readNullableString(record.occurredAt),
    wallets: wallets.map((item) => readWallet(item)),
  }
}

function readWallet(data: unknown): AwardWalletLine {
  const record = asRecord(data)
  const amountFen = readDecimalFen(record?.amountFen)
  if (!record || amountFen == null) throw new ApiError('奖励明细响应无效', 500)
  return {
    walletType: readString(record.walletType),
    amountFen,
    sourceCode: readNullableString(record.sourceCode),
  }
}
