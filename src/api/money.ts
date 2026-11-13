/** 把十进制分（可为超出安全整数的字符串）格式化成元。无法解析时返回空字符串。 */
export function formatDecimalFen(fen: string): string {
  const text = fen.trim()
  if (!/^-?\d+$/.test(text)) return ''
  const negative = text.startsWith('-')
  const digits = (negative ? text.slice(1) : text).replace(/^0+(?=\d)/, '')
  const padded = digits.padStart(3, '0')
  const yuan = padded.slice(0, -2)
  const cents = padded.slice(-2)
  const sign = negative && digits !== '0' ? '-' : ''
  return `${sign}${yuan}.${cents}`
}

export function decimalFenText(fen: string | null): string {
  if (!fen) return '—'
  const yuan = formatDecimalFen(fen)
  return yuan ? `${yuan} 元` : '—'
}

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
