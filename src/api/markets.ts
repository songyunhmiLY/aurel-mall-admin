import { ApiError, http } from './http'
import { asRecord, readBoolean, readId, readInteger, readNullableString, readString } from './json'

export interface MarketPerson {
  userId: string
  nickname: string
  inviteCode: string
  member: boolean
}

export interface MarketMember {
  userId: string
  nickname: string
  depth: number
  placedAt: string
}

export interface MarketBranch {
  userId: string
  nickname: string
  placedAt: string
  memberCount: number
  members: MarketMember[]
}

export interface MarketTree {
  userId: string
  seated: boolean
  depth: number | null
  placedAt: string
  parent: MarketPerson | null
  markets: MarketBranch[]
}

export async function fetchMarketTree(userId: string): Promise<MarketTree> {
  const { data } = await http.get<unknown>(`/admin/users/${encodeURIComponent(userId)}/market-tree`)
  return readTree(data)
}

function readTree(data: unknown): MarketTree {
  const record = asRecord(data)
  const userId = readId(record?.userId)
  const seated = readBoolean(record?.seated)
  const markets = record?.markets
  if (!record || !userId || seated == null || !Array.isArray(markets)) {
    throw new ApiError('市场关系响应无效', 500)
  }
  return {
    userId,
    seated,
    depth: readInteger(record.depth),
    placedAt: readNullableString(record.placedAt),
    parent: record.parent == null ? null : readPerson(record.parent),
    markets: markets.map((item) => readBranch(item)),
  }
}

function readPerson(data: unknown): MarketPerson {
  const record = asRecord(data)
  const userId = readId(record?.userId)
  const member = readBoolean(record?.member)
  if (!record || !userId || member == null) throw new ApiError('市场关系响应无效', 500)
  return {
    userId,
    nickname: readString(record.nickname),
    inviteCode: readNullableString(record.inviteCode),
    member,
  }
}

function readBranch(data: unknown): MarketBranch {
  const record = asRecord(data)
  const userId = readId(record?.userId)
  const memberCount = readInteger(record?.memberCount)
  const members = record?.members
  if (!record || !userId || memberCount == null || !Array.isArray(members)) {
    throw new ApiError('市场关系响应无效', 500)
  }
  return {
    userId,
    nickname: readString(record.nickname),
    placedAt: readNullableString(record.placedAt),
    memberCount,
    members: members.map((item) => readMember(item)),
  }
}

function readMember(data: unknown): MarketMember {
  const record = asRecord(data)
  const userId = readId(record?.userId)
  const depth = readInteger(record?.depth)
  if (!record || !userId || depth == null) throw new ApiError('市场关系响应无效', 500)
  return {
    userId,
    nickname: readString(record.nickname),
    depth,
    placedAt: readNullableString(record.placedAt),
  }
}
