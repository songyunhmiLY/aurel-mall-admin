export function opsTeamStatusLabel(status: string): string {
  if (status === 'active') return '在籍'
  if (status === 'cancelled') return '已取消'
  return status || '—'
}

export function opsTeamStatusTag(status: string): 'success' | 'info' {
  return status === 'active' ? 'success' : 'info'
}

export function opsTeamPerson(holder: { nickname: string; userId: string }): string {
  return holder.nickname ? `「${holder.nickname}」` : `用户 ${holder.userId}`
}
