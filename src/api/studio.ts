import { ApiError, http } from './http'
import { asRecord, readBoolean, readId, readPage, readString } from './json'

/** 未配置时接口返回这个名称。 */
export const studioExternalNameDefault = '补贴'

/** 与接口 `STUDIO_EXTERNAL_NAME_MAX` 一致。 */
export const studioExternalNameMax = 64

export type StudioStatus = 'active' | 'cancelled'

export interface StudioEnrollment {
  id: string
  userId: string
  nickname: string
  member: boolean
  status: string
  enrolledAt: string
  cancelledAt: string | null
}

export interface StudioPage {
  items: StudioEnrollment[]
  total: number
  page: number
  pageSize: number
}

export interface StudioListQuery {
  status?: StudioStatus
  page: number
  pageSize: number
}

/** GET / PUT 都只有对外名称。补贴比例不在这个对象里。 */
export interface StudioSettings {
  externalName: string
}

/** PUT /admin/studio/settings。只有对外名称。 */
export interface StudioSettingsUpdate {
  externalName: string
}

const peoplePath = '/admin/studios'
const settingsPath = '/admin/studio/settings'

export async function fetchStudios(query: StudioListQuery): Promise<StudioPage> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.status) params.status = query.status
  const { data } = await http.get<unknown>(peoplePath, { params })
  const page = readPage(data, '工作室')
  return {
    ...page,
    items: page.items.map((item) => readEnrollment(item, '工作室列表响应无效')),
  }
}

export async function appointStudio(userId: string): Promise<StudioEnrollment> {
  const { data } = await http.post<unknown>(peoplePath, { userId })
  return readEnrollment(data, '指定结果无效')
}

export async function cancelStudio(userId: string): Promise<StudioEnrollment> {
  const { data } = await http.post<unknown>(`${peoplePath}/${userId}/cancel`)
  return readEnrollment(data, '取消结果无效')
}

export async function fetchStudioSettings(): Promise<StudioSettings> {
  const { data } = await http.get<unknown>(settingsPath)
  return readSettings(data)
}

export async function saveStudioSettings(body: StudioSettingsUpdate): Promise<StudioSettings> {
  const { data } = await http.put<unknown>(settingsPath, settingsBody(body))
  return readSettings(data)
}

function settingsBody(body: StudioSettingsUpdate): StudioSettingsUpdate {
  return { externalName: body.externalName }
}

function readSettings(data: unknown): StudioSettings {
  const record = asRecord(data)
  const externalName = typeof record?.externalName === 'string' ? record.externalName.trim() : ''
  if (!record || externalName.length < 1 || externalName.length > studioExternalNameMax) {
    throw new ApiError('工作室配置响应无效', 500)
  }
  return { externalName }
}

function readEnrollment(data: unknown, invalidMessage: string): StudioEnrollment {
  const record = asRecord(data)
  const id = readMemberId(record?.id)
  const userId = readMemberId(record?.userId)
  const member = readBoolean(record?.member)
  const cancelledAt = readNullableInstant(record?.cancelledAt)
  if (
    !record ||
    !id ||
    !userId ||
    member == null ||
    typeof record.status !== 'string' ||
    typeof record.enrolledAt !== 'string' ||
    (record.cancelledAt != null && cancelledAt == null)
  ) {
    throw new ApiError(invalidMessage, 500)
  }
  return {
    id,
    userId,
    nickname: readString(record.nickname),
    member,
    status: record.status,
    enrolledAt: record.enrolledAt,
    cancelledAt,
  }
}

function readNullableInstant(value: unknown): string | null {
  if (value == null) return null
  return typeof value === 'string' ? value : null
}

/** 会员编号是不含前导零的十进制字符串。 */
function readMemberId(value: unknown): string {
  const id = readId(value)
  return /^[1-9]\d{0,18}$/.test(id) ? id : ''
}
