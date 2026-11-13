import type { ArticleStatus, ShelfStatus } from '@/api/home'

export const homeSectionTitle = '首页轮播图、资讯知识和滚动字幕'

export function shelfStatusLabel(status: string): string {
  if (status === 'draft') return '草稿'
  if (status === 'on') return '展示中'
  if (status === 'off') return '已下架'
  return status || '—'
}

export function articleStatusLabel(status: string): string {
  if (status === 'draft') return '草稿'
  if (status === 'published') return '已发布'
  if (status === 'off') return '已下架'
  return status || '—'
}

export function articleKindLabel(kind: string): string {
  if (kind === 'article') return '文章'
  if (kind === 'news') return '新闻'
  if (kind === 'notice') return '通知'
  return kind || '—'
}

export function shelfStatusTag(status: string): 'success' | 'info' | 'warning' {
  if (status === 'on') return 'success'
  if (status === 'off') return 'warning'
  return 'info'
}

export function articleStatusTag(status: string): 'success' | 'info' | 'warning' {
  if (status === 'published') return 'success'
  if (status === 'off') return 'warning'
  return 'info'
}

export const shelfStatusChoices: { value: ShelfStatus; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'on', label: '展示中' },
  { value: 'off', label: '已下架' },
]

export const articleStatusChoices: { value: ArticleStatus; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'off', label: '已下架' },
]

export const articleKindChoices: { value: 'article' | 'news' | 'notice'; label: string }[] = [
  { value: 'article', label: '文章' },
  { value: 'news', label: '新闻' },
  { value: 'notice', label: '通知' },
]
