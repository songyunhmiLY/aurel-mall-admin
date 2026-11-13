import { ApiError, http } from './http'
import { asRecord, readBoolean, readId, readString } from './json'

export interface OpsTeamEnrollment {
  id: string
  userId: string
  nickname: string
  member: boolean
  status: string
  enrolledAt: string
  cancelledAt: string | null
}

const path = '/admin/ops-team'

/** GET /admin/ops-team。没有持有人时为 null。 */
export async function fetchOpsTeam(): Promise<OpsTeamEnrollment | null> {
  const { data } = await http.get<unknown>(path)
  return readCurrent(data)
}

/** POST /admin/ops-team。没人在籍时指定；已有别人时同一次请求改派。 */
export async function appointOpsTeam(userId: string): Promise<OpsTeamEnrollment> {
  const { data } = await http.post<unknown>(path, { userId })
  return readEnrollment(data, '指定结果无效')
}

/** POST /admin/ops-team/cancel。没有请求体。 */
export async function cancelOpsTeam(): Promise<OpsTeamEnrollment> {
  const { data } = await http.post<unknown>(`${path}/cancel`)
  return readEnrollment(data, '取消结果无效')
}

function readCurrent(data: unknown): OpsTeamEnrollment | null {
  const record = asRecord(data)
  if (!record || !('holder' in record)) {
    throw new ApiError('运营团队响应无效', 500)
  }
  if (record.holder == null) return null
  return readEnrollment(record.holder, '运营团队响应无效')
}

function readEnrollment(data: unknown, invalidMessage: string): OpsTeamEnrollment {
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
