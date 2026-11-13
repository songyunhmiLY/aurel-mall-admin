import { ApiError, http } from './http'
import { asRecord, readBoolean, readId, readInteger, readNullableString, readString } from './json'

/** 与 `GET /admin/users/:id/invite` 的人物字段一致。 */
export interface InvitePerson {
  userId: string
  nickname: string
  inviteCode: string
  member: boolean
}

export interface DirectInvitee extends InvitePerson {
  joinedAt: string
}

export interface InviteChain {
  user: InvitePerson
  inviter: InvitePerson | null
  directInvitees: DirectInvitee[]
}

export interface InviteChainItem extends InvitePerson {
  parentUserId: string | null
  depth: number
}

export interface InviteAncestors {
  items: InviteChainItem[]
}

export interface InviteDescendants {
  depth: number
  items: InviteChainItem[]
}

export async function fetchInvite(userId: string): Promise<InviteChain> {
  const { data } = await http.get<unknown>(`/admin/users/${encodeURIComponent(userId)}/invite`)
  return readInvite(data)
}

export async function fetchInviteAncestors(userId: string): Promise<InviteAncestors> {
  const { data } = await http.get<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/invite/ancestors`,
  )
  return { items: readItems(data, '上级链') }
}

export async function fetchInviteDescendants(
  userId: string,
  depth: number,
): Promise<InviteDescendants> {
  const { data } = await http.get<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/invite/descendants`,
    { params: { depth: String(depth) } },
  )
  const record = asRecord(data)
  const reported = readInteger(record?.depth)
  if (!record || reported == null) throw new ApiError('下级链响应无效', 500)
  return { depth: reported, items: readItems(data, '下级链') }
}

function readInvite(data: unknown): InviteChain {
  const record = asRecord(data)
  const invitees = record?.directInvitees
  if (!record || !Array.isArray(invitees)) throw new ApiError('邀请关系响应无效', 500)
  return {
    user: readPerson(record.user, '邀请关系'),
    inviter: record.inviter == null ? null : readPerson(record.inviter, '邀请关系'),
    directInvitees: invitees.map((item) => ({
      ...readPerson(item, '直接邀请'),
      joinedAt: readNullableString(asRecord(item)?.joinedAt),
    })),
  }
}

function readItems(data: unknown, label: string): InviteChainItem[] {
  const record = asRecord(data)
  const items = record?.items
  if (!record || !Array.isArray(items)) throw new ApiError(`${label}响应无效`, 500)
  return items.map((item) => readChainItem(item, label))
}

function readPerson(data: unknown, label: string): InvitePerson {
  const record = asRecord(data)
  const userId = readId(record?.userId)
  const member = readBoolean(record?.member)
  if (!record || !userId || member == null) throw new ApiError(`${label}响应无效`, 500)
  return {
    userId,
    nickname: readString(record.nickname),
    inviteCode: readNullableString(record.inviteCode),
    member,
  }
}

function readChainItem(data: unknown, label: string): InviteChainItem {
  const person = readPerson(data, label)
  const record = asRecord(data)
  const depth = readInteger(record?.depth)
  if (depth == null) throw new ApiError(`${label}响应无效`, 500)
  return { ...person, parentUserId: readOptionalId(record?.parentUserId, label), depth }
}

function readOptionalId(value: unknown, label: string): string | null {
  if (value == null) return null
  const id = readId(value)
  if (!id) throw new ApiError(`${label}响应无效`, 500)
  return id
}
