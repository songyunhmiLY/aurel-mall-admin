/** 把分格式化成元，保留两位小数。 */
export function fenToYuan(fen: number): string {
  const negative = fen < 0
  const abs = Math.abs(fen)
  const yuan = Math.floor(abs / 100)
  const cents = abs % 100
  return `${negative ? '-' : ''}${yuan}.${cents.toString().padStart(2, '0')}`
}

/**
 * 把元输入转成分。只接受非负、最多两位小数。
 * 无法解析时返回 null。
 */
export function parseYuanToFen(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const [whole, fraction = ''] = trimmed.split('.')
  const fen = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(fen)) return null
  return fen
}

/** 分转成 JSON 数字（元）。用于 PV：1 PV = 1 元。 */
export function fenToUnitNumber(fen: number): number {
  return Number((fen / 100).toFixed(2))
}
