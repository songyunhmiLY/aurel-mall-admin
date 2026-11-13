const filingStatusLabels: Record<string, string> = {
  draft: '草稿',
  submitted: '已报单',
  settled: '已结算',
  void: '已作废',
}

export function filingStatusLabel(status: string): string {
  if (!status) return '—'
  return filingStatusLabels[status] ?? status
}

export function isLuckySequence(sequence: number): boolean {
  return sequence > 0 && sequence % 5 === 0
}
