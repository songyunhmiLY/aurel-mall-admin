/**
 * 把二维表格下载成带 BOM 的 CSV 文件，Excel 直接打开不乱码。
 * 单元格统一加引号并转义内部引号，逗号、换行无需单独处理。
 */
export function downloadCsv(
  filename: string,
  header: string[],
  rows: Array<Array<string | number | null | undefined>>,
): void {
  const cell = (value: string | number | null | undefined): string =>
    `"${String(value ?? '').replaceAll('"', '""')}"`
  const lines = [header, ...rows].map((row) => row.map(cell).join(','))
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** 导出文件名用的时间戳，形如 2026-11-17-173800。 */
export function csvTimestamp(): string {
  return new Date().toISOString().replace('T', '-').replaceAll(':', '').slice(0, 17)
}
