import { ApiError, http } from './http'
import { asRecord, readId, readNullableString, readPage, readString } from './json'

export interface MemberSummary {
  id: string
  status: string
  nickname: string
  avatarUrl: string
  phone: string
  inviteCode: string
  member: boolean
  kycVerified: boolean
  /** 创业专区微信实付合计（分）。 */
  startupPaidFen: number
  /** 创业专区下单总金额（应付，含运费，分）。 */
  startupPayableFen: number
  /** 商城专区微信实付合计（分）。 */
  mallPaidFen: number
  /** 商城专区下单总金额（应付，分）。 */
  mallPayableFen: number
  startupPaidOrders: number
  mallPaidOrders: number
  startupPaidUnits: number
  mallPaidUnits: number
  /** 可提现账户余额（分，含冻结）。 */
  withdrawableBalanceFen: number
  /** 积分账户余额（分，含冻结）。 */
  pointsBalanceFen: number
  /** 消费金账户余额（分，含冻结）。 */
  consumptionBalanceFen: number
  /** 累计提现金额（分，已打款结算单合计）。 */
  totalWithdrawnFen: number
  inviteeCount: number
  /** 身份：normal/member + cofounder/studio/ops_team 叠加。 */
  identities: string[]
  createdAt: string
  updatedAt: string
}

export interface MemberPage {
  items: MemberSummary[]
  total: number
  page: number
  pageSize: number
}

/** GET /admin/users/:id/kyc。还没提交时 verified 为 false，文字字段为空。 */
export interface MemberKyc {
  verified: boolean
  realName: string
  idNumber: string
  mobile: string
}

export interface MemberQuery {
  id?: string
  nickname?: string
  phone?: string
  page: number
  pageSize: number
}

const usersPath = '/admin/users'

export async function fetchMembers(query: MemberQuery): Promise<MemberPage> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.id) params.id = query.id
  if (query.nickname) params.nickname = query.nickname
  if (query.phone) params.phone = query.phone
  const { data } = await http.get<unknown>(usersPath, { params })
  const page = readPage(data, '会员')
  return { ...page, items: page.items.map((item) => readMember(item)) }
}

export async function fetchMember(id: string): Promise<MemberSummary> {
  const { data } = await http.get<unknown>(`${usersPath}/${encodeURIComponent(id)}`)
  return readMember(data)
}

export async function fetchMemberKyc(id: string): Promise<MemberKyc> {
  const { data } = await http.get<unknown>(`${usersPath}/${encodeURIComponent(id)}/kyc`)
  return readKyc(data)
}

export async function setMemberEnabled(id: string, enabled: boolean): Promise<MemberSummary> {
  const action = enabled ? 'enable' : 'disable'
  const { data } = await http.post<unknown>(`${usersPath}/${encodeURIComponent(id)}/${action}`)
  return readMember(data)
}

export function memberStatusLabel(status: string): string {
  if (status === 'active') return '正常'
  if (status === 'disabled') return '已停用'
  return status || '未知'
}

export function memberFlagLabel(member: boolean): string {
  return member ? '会员' : '非会员'
}

/** 身份编码 → 显示名。 */
export function identityLabel(identity: string): string {
  if (identity === 'normal') return '普通'
  if (identity === 'member') return '会员'
  if (identity === 'cofounder') return '联创'
  if (identity === 'studio') return '工作室'
  if (identity === 'ops_team') return '运营团队'
  return identity
}

/** 身份标签颜色。 */
export function identityTagType(
  identity: string,
): 'info' | 'primary' | 'warning' | 'success' | 'danger' {
  if (identity === 'normal') return 'info'
  if (identity === 'member') return 'primary'
  if (identity === 'cofounder') return 'warning'
  if (identity === 'studio') return 'success'
  return 'danger'
}

function readIdentities(record: Record<string, unknown> | null): string[] {
  const value = record?.identities
  if (!Array.isArray(value)) return ['normal']
  const list = value.filter((item): item is string => typeof item === 'string')
  return list.length > 0 ? list : ['normal']
}

/** 分转元显示。 */
export function formatFen(fen: number): string {
  return `¥${(fen / 100).toFixed(2)}`
}

function readCount(record: Record<string, unknown> | null, key: string): number {
  const value = record?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function readMember(data: unknown): MemberSummary {
  const record = asRecord(data)
  const id = readId(record?.id)
  if (
    !record ||
    !id ||
    typeof record.member !== 'boolean' ||
    typeof record.kycVerified !== 'boolean'
  ) {
    throw new ApiError('会员响应无效', 500)
  }
  return {
    id,
    status: readString(record.status),
    nickname: readString(record.nickname),
    avatarUrl: readNullableString(record.avatarUrl),
    phone: readNullableString(record.phone),
    inviteCode: readNullableString(record.inviteCode),
    member: record.member,
    kycVerified: record.kycVerified,
    startupPaidFen: readCount(record, 'startupPaidFen'),
    startupPayableFen: readCount(record, 'startupPayableFen'),
    mallPaidFen: readCount(record, 'mallPaidFen'),
    mallPayableFen: readCount(record, 'mallPayableFen'),
    startupPaidOrders: readCount(record, 'startupPaidOrders'),
    mallPaidOrders: readCount(record, 'mallPaidOrders'),
    startupPaidUnits: readCount(record, 'startupPaidUnits'),
    mallPaidUnits: readCount(record, 'mallPaidUnits'),
    withdrawableBalanceFen: readCount(record, 'withdrawableBalanceFen'),
    pointsBalanceFen: readCount(record, 'pointsBalanceFen'),
    consumptionBalanceFen: readCount(record, 'consumptionBalanceFen'),
    totalWithdrawnFen: readCount(record, 'totalWithdrawnFen'),
    inviteeCount: readCount(record, 'inviteeCount'),
    identities: readIdentities(record),
    createdAt: readString(record.createdAt),
    updatedAt: readString(record.updatedAt),
  }
}

function readKyc(data: unknown): MemberKyc {
  const record = asRecord(data)
  if (!record || typeof record.verified !== 'boolean') throw new ApiError('实名响应无效', 500)
  return {
    verified: record.verified,
    realName: readNullableString(record.realName),
    idNumber: readNullableString(record.idNumber),
    mobile: readNullableString(record.mobile),
  }
}
