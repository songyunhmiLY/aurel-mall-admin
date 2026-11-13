import { ApiError } from './http'

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function readNullableString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  return ''
}

export function readInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value.trim())
    if (Number.isSafeInteger(parsed)) return parsed
  }
  return null
}

export function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

/**
 * 钱包金额是十进制字符串，单位分。JSON 数字也接受。
 * 无法解析时返回 null。
 */
export function readDecimalFen(value: unknown): string | null {
  if (typeof value === 'bigint') return normalizeDecimalFen(value.toString())
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value)
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return normalizeDecimalFen(value.trim())
  }
  return null
}

function normalizeDecimalFen(value: string): string | null {
  const negative = value.startsWith('-')
  const digits = (negative ? value.slice(1) : value).replace(/^0+(?=\d)/, '')
  if (!digits) return null
  if (digits === '0') return '0'
  return `${negative ? '-' : ''}${digits}`
}

/** JSON 里的 bigint 编号是十进制字符串。 */
export function readId(value: unknown): string {
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return value.trim()
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value)
  return ''
}

export function readPage(
  data: unknown,
  label: string,
): {
  items: unknown[]
  total: number
  page: number
  pageSize: number
} {
  const record = asRecord(data)
  const items = record?.items
  const total = readInteger(record?.total)
  const page = readInteger(record?.page)
  const pageSize = readInteger(record?.pageSize)
  if (!record || !Array.isArray(items) || total == null || page == null || pageSize == null) {
    throw new ApiError(`${label}列表响应无效`, 500)
  }
  return { items, total, page, pageSize }
}
