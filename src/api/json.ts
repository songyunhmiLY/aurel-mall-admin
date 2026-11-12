export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function readString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

/** 非负或任意安全整数。字符串只接受可选负号加数字。 */
export function readInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value.trim())
    if (Number.isSafeInteger(parsed)) return parsed
  }
  return null
}

export function readBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  return null
}

export function readList(data: unknown, keys: string[]): unknown[] {
  if (Array.isArray(data)) return data
  const record = asRecord(data)
  if (!record) return []
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) return value
  }
  return []
}

const genericSuccess = new Set([
  'ok',
  'success',
  'created',
  'updated',
  '成功',
  '已保存',
  '创建成功',
  '更新成功',
])

/** 包络 message 不是普通成功语时，当作接口提示。 */
export function warningFromMessage(message: string | undefined): string {
  const text = message?.trim() ?? ''
  if (!text || genericSuccess.has(text.toLowerCase()) || genericSuccess.has(text)) return ''
  return text
}

export function warningFromRecord(
  record: Record<string, unknown> | null,
  apiMessage?: string,
): string {
  const parts: string[] = []
  if (record) {
    const direct = [record.warning, record.pvWarning]
    for (const value of direct) {
      if (typeof value === 'string' && value.trim()) parts.push(value.trim())
    }
    if (Array.isArray(record.warnings)) {
      for (const value of record.warnings) {
        if (typeof value === 'string' && value.trim()) parts.push(value.trim())
      }
    }
  }
  const fromMessage = warningFromMessage(apiMessage)
  if (fromMessage) parts.push(fromMessage)
  return [...new Set(parts)].join('；')
}
