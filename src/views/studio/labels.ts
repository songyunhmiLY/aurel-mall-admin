export function studioStatusLabel(status: string): string {
  if (status === 'active') return '在籍'
  if (status === 'cancelled') return '已取消'
  return status || '—'
}

export function studioStatusTag(status: string): 'success' | 'info' {
  return status === 'active' ? 'success' : 'info'
}
