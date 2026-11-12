import { ApiError, http } from './http'
import { asRecord, readBoolean, readList, readString } from './json'

export interface MemberSummary {
  id: string
  nickname: string
  phone: string
  avatarUrl: string
  status: string
  /** 接口没说明时为 null，页面显示「未知」。 */
  member: boolean | null
}

export interface MemberKyc {
  name: string
  nationalIdNumber: string
  mobile: string
}

export interface MemberDetail extends MemberSummary {
  kyc: MemberKyc | null
}

export interface MemberQuery {
  id?: string
  nickname?: string
  phone?: string
}

const usersPath = '/admin/users'

export async function fetchMembers(query: MemberQuery = {}): Promise<MemberSummary[]> {
  const params: Record<string, string> = {}
  if (query.id) params.id = query.id
  if (query.nickname) params.nickname = query.nickname
  if (query.phone) params.phone = query.phone
  const { data } = await http.get<unknown>(usersPath, { params })
  return normalizeMemberList(data)
}

export async function fetchMember(id: string): Promise<MemberDetail> {
  const { data } = await http.get<unknown>(`${usersPath}/${encodeURIComponent(id)}`)
  const detail = normalizeMemberDetail(data)
  if (!detail.id) throw new ApiError('会员响应无效', 500)
  return detail
}

export async function setMemberEnabled(id: string, enabled: boolean): Promise<void> {
  const action = enabled ? 'enable' : 'disable'
  await http.post(`${usersPath}/${encodeURIComponent(id)}/${action}`)
}

export function memberStatusLabel(status: string): string {
  if (status === 'active') return '正常'
  if (status === 'disabled') return '已停用'
  return status || '未知'
}

export function memberFlagLabel(member: boolean | null): string {
  if (member === true) return '会员'
  if (member === false) return '非会员'
  return '未知'
}

export function normalizeMemberList(data: unknown): MemberSummary[] {
  const raw = readList(data, ['items', 'list', 'users', 'records'])
  const rows = raw.length > 0 ? raw : singleMember(data)
  return rows.map((item) => normalizeMember(item)).filter((item) => item.id)
}

export function normalizeMemberDetail(data: unknown): MemberDetail {
  const record = unwrapMember(data)
  const summary = normalizeMember(record)
  return { ...summary, kyc: readKyc(record) }
}

function singleMember(data: unknown): unknown[] {
  const record = asRecord(data)
  if (!record) return []
  if (record.id == null && record.user == null) return []
  return [data]
}

function unwrapMember(data: unknown): Record<string, unknown> {
  const record = asRecord(data) ?? {}
  const user = asRecord(record.user)
  if (!user) return record
  if (user.kyc == null && record.kyc != null) return { ...user, kyc: record.kyc }
  return user
}

function normalizeMember(data: unknown): MemberSummary {
  const record = unwrapMember(data)
  return {
    id: readString(record, ['id']),
    nickname: readString(record, ['nickname', 'name']),
    phone: readPhone(record),
    avatarUrl: readString(record, ['avatarUrl', 'avatar']),
    status: readString(record, ['status']),
    member: readMemberFlag(record),
  }
}

function readMemberFlag(record: Record<string, unknown>): boolean | null {
  const direct = readBoolean(record.member) ?? readBoolean(record.isMember)
  if (direct != null) return direct
  return null
}

function readPhone(record: Record<string, unknown>): string {
  const direct = readString(record, ['phone', 'mobile'])
  if (direct) return direct
  const identities = record.identities ?? record.userIdentities
  if (!Array.isArray(identities)) return ''
  for (const item of identities) {
    const row = asRecord(item)
    if (!row || row.provider !== 'phone') continue
    const identifier = readString(row, ['identifier'])
    if (identifier) return identifier
  }
  return ''
}

function readKyc(record: Record<string, unknown>): MemberKyc | null {
  const source = asRecord(record.kyc)
  if (!source) return null
  const name = readString(source, ['name', 'realName'])
  const nationalIdNumber = readString(source, ['nationalIdNumber', 'idNumber', 'idCardNo', 'idNo'])
  const mobile = readString(source, ['mobile', 'phone'])
  if (!name && !nationalIdNumber && !mobile) return null
  return { name, nationalIdNumber, mobile }
}
