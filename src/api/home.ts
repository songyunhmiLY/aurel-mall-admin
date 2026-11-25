import { ApiError, http } from './http'
import { asRecord, readId, readInteger, readPage, readString } from './json'

/** 与 aurel-mall-api `cms.constants` 一致。 */
export const bannerTitleMax = 128
export const imageUrlMax = 512
export const pagePathMax = 512
export const tickerContentMax = 255
export const articleTitleMax = 200
export const articleSummaryMax = 500
/** 正文是富文本 HTML，与后端 `ARTICLE_BODY_MAX` 一致。 */
export const articleBodyMax = 60_000
export const sortMin = -1_000_000
export const sortMax = 1_000_000

export const shelfStatuses = ['draft', 'on', 'off'] as const
export const articleStatuses = ['draft', 'published', 'off'] as const
export const articleKinds = ['article', 'news', 'notice'] as const

export type ShelfStatus = (typeof shelfStatuses)[number]
export type ArticleStatus = (typeof articleStatuses)[number]
export type ArticleKind = (typeof articleKinds)[number]

export interface HomePage<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface AdminBanner {
  id: string
  title: string
  imageUrl: string
  pagePath: string
  sortOrder: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface AdminTicker {
  id: string
  content: string
  sortOrder: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface AdminArticle {
  id: string
  kind: string
  title: string
  summary: string
  body: string
  coverUrl: string | null
  status: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface HomeListQuery {
  status?: string
  page: number
  pageSize: number
}

export interface ArticleListQuery extends HomeListQuery {
  kind?: string
}

/** 创建时省略 status，接口写成草稿。立即展示只传 `on`。 */
export interface BannerCreateBody {
  title: string
  imageUrl: string
  pagePath: string
  sortOrder: number
  status?: 'on'
}

/** 更新只含内容，不含状态。 */
export interface BannerUpdateBody {
  title: string
  imageUrl: string
  pagePath: string
  sortOrder: number
}

export interface TickerCreateBody {
  content: string
  sortOrder: number
  status?: 'on'
}

export interface TickerUpdateBody {
  content: string
  sortOrder: number
}

export interface ArticleCreateBody {
  kind: ArticleKind
  title: string
  summary: string
  body: string
  coverUrl: string | null
  status?: 'published'
}

export interface ArticleUpdateBody {
  kind: ArticleKind
  title: string
  summary: string
  body: string
  coverUrl: string | null
}

const bannersPath = '/admin/home/banners'
const tickersPath = '/admin/home/tickers'
const articlesPath = '/admin/home/articles'

export async function fetchBanners(query: HomeListQuery): Promise<HomePage<AdminBanner>> {
  const { data } = await http.get<unknown>(bannersPath, { params: listParams(query) })
  const page = readPage(data, '轮播图')
  return { ...page, items: page.items.map((item) => readBanner(item)) }
}

export async function fetchBanner(id: string): Promise<AdminBanner> {
  const { data } = await http.get<unknown>(`${bannersPath}/${id}`)
  return readBanner(data)
}

export async function createBanner(body: BannerCreateBody): Promise<AdminBanner> {
  const { data } = await http.post<unknown>(bannersPath, body)
  return readBanner(data)
}

export async function updateBanner(id: string, body: BannerUpdateBody): Promise<AdminBanner> {
  const { data } = await http.put<unknown>(`${bannersPath}/${id}`, body)
  return readBanner(data)
}

export async function setBannerStatus(id: string, status: ShelfStatus): Promise<AdminBanner> {
  const { data } = await http.post<unknown>(`${bannersPath}/${id}/status`, { status })
  return readBanner(data)
}

export async function fetchTickers(query: HomeListQuery): Promise<HomePage<AdminTicker>> {
  const { data } = await http.get<unknown>(tickersPath, { params: listParams(query) })
  const page = readPage(data, '滚动字幕')
  return { ...page, items: page.items.map((item) => readTicker(item)) }
}

export async function fetchTicker(id: string): Promise<AdminTicker> {
  const { data } = await http.get<unknown>(`${tickersPath}/${id}`)
  return readTicker(data)
}

export async function createTicker(body: TickerCreateBody): Promise<AdminTicker> {
  const { data } = await http.post<unknown>(tickersPath, body)
  return readTicker(data)
}

export async function updateTicker(id: string, body: TickerUpdateBody): Promise<AdminTicker> {
  const { data } = await http.put<unknown>(`${tickersPath}/${id}`, body)
  return readTicker(data)
}

export async function setTickerStatus(id: string, status: ShelfStatus): Promise<AdminTicker> {
  const { data } = await http.post<unknown>(`${tickersPath}/${id}/status`, { status })
  return readTicker(data)
}

export async function fetchArticles(query: ArticleListQuery): Promise<HomePage<AdminArticle>> {
  const params = listParams(query)
  if (query.kind) params.kind = query.kind
  const { data } = await http.get<unknown>(articlesPath, { params })
  const page = readPage(data, '资讯')
  return { ...page, items: page.items.map((item) => readArticle(item)) }
}

export async function fetchArticle(id: string): Promise<AdminArticle> {
  const { data } = await http.get<unknown>(`${articlesPath}/${id}`)
  return readArticle(data)
}

export async function createArticle(body: ArticleCreateBody): Promise<AdminArticle> {
  const { data } = await http.post<unknown>(articlesPath, body)
  return readArticle(data)
}

export async function updateArticle(id: string, body: ArticleUpdateBody): Promise<AdminArticle> {
  const { data } = await http.put<unknown>(`${articlesPath}/${id}`, body)
  return readArticle(data)
}

export async function setArticleStatus(id: string, status: ArticleStatus): Promise<AdminArticle> {
  const { data } = await http.post<unknown>(`${articlesPath}/${id}/status`, { status })
  return readArticle(data)
}

/**
 * 上传富文本插图，multipart 字段名是 file。
 * 返回后端给的相对地址（/api/v1/uploads/{id}），这里拼成绝对 URL 供编辑器插入正文。
 */
export async function uploadArticleImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await http.post<unknown>('/admin/home/images', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30_000,
  })
  const record = asRecord(data)
  if (!record || typeof record.url !== 'string' || !record.url) {
    throw new ApiError('图片上传响应无效', 500)
  }
  const base = import.meta.env?.VITE_API_BASE_URL?.trim() || window.location.origin
  return new URL(record.url, base).toString()
}

function listParams(query: HomeListQuery): Record<string, string> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.status) params.status = query.status
  return params
}

function readBanner(data: unknown): AdminBanner {
  const record = asRecord(data)
  const id = readId(record?.id)
  const sortOrder = readInteger(record?.sortOrder)
  if (
    !record ||
    !id ||
    typeof record.title !== 'string' ||
    typeof record.imageUrl !== 'string' ||
    typeof record.pagePath !== 'string' ||
    sortOrder == null ||
    typeof record.status !== 'string' ||
    typeof record.createdAt !== 'string' ||
    typeof record.updatedAt !== 'string'
  ) {
    throw new ApiError('轮播图响应无效', 500)
  }
  return {
    id,
    title: record.title,
    imageUrl: record.imageUrl,
    pagePath: record.pagePath,
    sortOrder,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function readTicker(data: unknown): AdminTicker {
  const record = asRecord(data)
  const id = readId(record?.id)
  const sortOrder = readInteger(record?.sortOrder)
  if (
    !record ||
    !id ||
    typeof record.content !== 'string' ||
    sortOrder == null ||
    typeof record.status !== 'string' ||
    typeof record.createdAt !== 'string' ||
    typeof record.updatedAt !== 'string'
  ) {
    throw new ApiError('滚动字幕响应无效', 500)
  }
  return {
    id,
    content: record.content,
    sortOrder,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function readArticle(data: unknown): AdminArticle {
  const record = asRecord(data)
  const id = readId(record?.id)
  const coverUrl = readNullableText(record?.coverUrl)
  const publishedAt = readNullableText(record?.publishedAt)
  if (
    !record ||
    !id ||
    typeof record.kind !== 'string' ||
    typeof record.title !== 'string' ||
    typeof record.summary !== 'string' ||
    typeof record.body !== 'string' ||
    (record.coverUrl != null && coverUrl == null) ||
    typeof record.status !== 'string' ||
    (record.publishedAt != null && publishedAt == null) ||
    typeof record.createdAt !== 'string' ||
    typeof record.updatedAt !== 'string'
  ) {
    throw new ApiError('资讯响应无效', 500)
  }
  return {
    id,
    kind: record.kind,
    title: record.title,
    summary: readString(record.summary),
    body: record.body,
    coverUrl,
    status: record.status,
    publishedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function readNullableText(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value
  return null
}
