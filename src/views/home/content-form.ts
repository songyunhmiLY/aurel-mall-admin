import type {
  ArticleCreateBody,
  ArticleKind,
  ArticleUpdateBody,
  BannerCreateBody,
  BannerUpdateBody,
  TickerCreateBody,
  TickerUpdateBody,
} from '@/api/home'
import {
  articleBodyMax,
  articleSummaryMax,
  articleTitleMax,
  bannerTitleMax,
  imageUrlMax,
  pagePathMax,
  sortMax,
  sortMin,
  tickerContentMax,
} from '@/api/home'

export interface BannerDraft {
  title: string
  imageUrl: string
  pagePath: string
  sortOrder: number | null
  publishNow: boolean
}

export interface TickerDraft {
  content: string
  sortOrder: number | null
  publishNow: boolean
}

export interface ArticleDraft {
  kind: ArticleKind | ''
  title: string
  summary: string
  body: string
  coverUrl: string
  publishNow: boolean
}

export function emptyBannerDraft(): BannerDraft {
  return { title: '', imageUrl: '', pagePath: '', sortOrder: 0, publishNow: false }
}

export function emptyTickerDraft(): TickerDraft {
  return { content: '', sortOrder: 0, publishNow: false }
}

export function emptyArticleDraft(): ArticleDraft {
  return { kind: 'article', title: '', summary: '', body: '', coverUrl: '', publishNow: false }
}

export function bannerProblem(draft: BannerDraft): string {
  const title = textProblem(draft.title, '标题', bannerTitleMax)
  if (title) return title
  const image = httpUrlProblem(draft.imageUrl, '图片地址', true)
  if (image) return image
  const page = pagePathProblem(draft.pagePath)
  if (page) return page
  return sortProblem(draft.sortOrder)
}

export function tickerProblem(draft: TickerDraft): string {
  const content = textProblem(draft.content, '字幕', tickerContentMax)
  if (content) return content
  return sortProblem(draft.sortOrder)
}

export function articleProblem(draft: ArticleDraft): string {
  if (draft.kind !== 'article' && draft.kind !== 'news' && draft.kind !== 'notice') {
    return '内容类型不正确'
  }
  const title = textProblem(draft.title, '标题', articleTitleMax)
  if (title) return title
  const summary = textProblem(draft.summary, '摘要', articleSummaryMax)
  if (summary) return summary
  const body = textProblem(draft.body, '正文', articleBodyMax)
  if (body) return body
  return httpUrlProblem(draft.coverUrl, '封面', false)
}

export function bannerCreateBody(draft: BannerDraft): BannerCreateBody {
  const body: BannerCreateBody = {
    title: draft.title.trim(),
    imageUrl: draft.imageUrl.trim(),
    pagePath: draft.pagePath.trim(),
    sortOrder: draft.sortOrder ?? 0,
  }
  if (draft.publishNow) body.status = 'on'
  return body
}

export function bannerUpdateBody(draft: BannerDraft): BannerUpdateBody {
  return {
    title: draft.title.trim(),
    imageUrl: draft.imageUrl.trim(),
    pagePath: draft.pagePath.trim(),
    sortOrder: draft.sortOrder ?? 0,
  }
}

export function tickerCreateBody(draft: TickerDraft): TickerCreateBody {
  const body: TickerCreateBody = {
    content: draft.content.trim(),
    sortOrder: draft.sortOrder ?? 0,
  }
  if (draft.publishNow) body.status = 'on'
  return body
}

export function tickerUpdateBody(draft: TickerDraft): TickerUpdateBody {
  return {
    content: draft.content.trim(),
    sortOrder: draft.sortOrder ?? 0,
  }
}

export function articleCreateBody(draft: ArticleDraft): ArticleCreateBody {
  const body: ArticleCreateBody = {
    kind: draft.kind as ArticleKind,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    body: draft.body.trim(),
    coverUrl: coverUrlValue(draft.coverUrl),
  }
  if (draft.publishNow) body.status = 'published'
  return body
}

export function articleUpdateBody(draft: ArticleDraft): ArticleUpdateBody {
  return {
    kind: draft.kind as ArticleKind,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    body: draft.body.trim(),
    coverUrl: coverUrlValue(draft.coverUrl),
  }
}

/** 只预览 http(s)。其他字符串仍按表单校验，不在这里加载。 */
export function httpImageUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || httpUrlProblem(trimmed, '图片地址', true)) return ''
  return trimmed
}

export function bannerStatusHint(current: string, next: string, pagePath: string): string {
  if (next === current) return '状态没有变化。'
  if (next === 'off') return '下架后首页不再展示这张轮播图。记录保留，不删除。'
  if (next === 'draft') return '改为草稿后首页不展示。记录保留。'
  if (!pagePath.trim()) {
    return '没有跳转页面时，即使改为展示中，首页也不会出现这张图。'
  }
  return '改为展示中后，首页会显示这张轮播图。点击后打开所填的小程序页面。'
}

export function tickerStatusHint(current: string, next: string): string {
  if (next === current) return '状态没有变化。'
  if (next === 'off') return '下架后首页不再滚动这条字幕。记录保留，不删除。'
  if (next === 'draft') return '改为草稿后首页不滚动。记录保留。'
  return '改为展示中后，首页会滚动这条字幕。'
}

export function articleStatusHint(
  current: string,
  next: string,
  publishedAt: string | null,
): string {
  if (next === current) return '状态没有变化。'
  if (next === 'off') {
    return publishedAt
      ? '下架后状态为已下架，不再是已发布。首页不再展示，记录保留，已有的发布时间保留。'
      : '下架后状态为已下架。首页不展示，记录保留。还没有发布时间。'
  }
  if (next === 'draft') {
    return publishedAt
      ? '改为草稿后首页不展示，记录保留，已有的发布时间保留。'
      : '改为草稿后首页不展示，记录保留。还没有发布时间。'
  }
  if (publishedAt) return '再次发布会用当前业务时间覆盖原来的发布时间。'
  return '首次发布会写入当前业务时间作为发布时间。'
}

function coverUrlValue(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function textProblem(value: string, label: string, max: number): string {
  const trimmed = value.trim()
  if (trimmed.length < 1 || trimmed.length > max) return `${label}不正确`
  return ''
}

function sortProblem(value: number | null): string {
  if (value == null || !Number.isInteger(value) || value < sortMin || value > sortMax) {
    return '排序不正确'
  }
  return ''
}

function pagePathProblem(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length < 1 || trimmed.length > pagePathMax || /\s/.test(trimmed)) {
    return '跳转页面不正确'
  }
  if (/^https?:\/\//i.test(trimmed)) return '跳转页面必须是小程序页面'
  return ''
}

function httpUrlProblem(value: string, label: string, required: boolean): string {
  const trimmed = value.trim()
  if (!trimmed) return required ? `${label}不正确` : ''
  if (trimmed.length > imageUrlMax) return `${label}不正确`
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return `${label}必须是 http 或 https`
    }
  } catch {
    return `${label}必须是 URL`
  }
  return ''
}
