/** Asia/Shanghai 的 `YYYY-MM`。只用于日期选择器的初始值。 */
export function shanghaiMonth(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
  }).format(date)
  return parts.slice(0, 7)
}

/** 上海日历的上一个月，作为职位分红业绩月的初始选择。 */
export function shanghaiPreviousMonth(date = new Date()): string {
  const [yearText, monthText] = shanghaiMonth(date).split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!year || !month) return shanghaiMonth(date)
  if (month === 1) return `${year - 1}-12`
  return `${year}-${String(month - 1).padStart(2, '0')}`
}

export function formatShanghaiTime(value: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}
