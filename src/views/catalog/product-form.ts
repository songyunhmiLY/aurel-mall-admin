import type {
  Product,
  ProductCreateBody,
  ProductStatus,
  ProductUpdateBody,
  ProductZone,
} from '@/api/products'
import { fenToYuan, parseYuanToFen } from '@/api/money'

export interface ProductDraft {
  zone: ProductZone
  name: string
  subtitle: string
  body: string
  coverUrl: string
  imageUrlsText: string
  status: ProductStatus
  priceYuan: string
  pvYuan: string
  categoryId: string
  /** 商城混排顺序。数值小的排前面，同值按创建时间倒序。 */
  sortOrder: string
  /** 是否出现在小程序首页商品流。 */
  homeVisible: boolean
}

export const zoneOptions: { value: ProductZone; label: string }[] = [
  { value: 'startup', label: '创业专区' },
  { value: 'mall', label: '会员商城' },
]

export const statusOptions: { value: ProductStatus; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'on', label: '上架' },
  { value: 'off', label: '下架' },
]

const maxImages = 20

export function zoneLabel(zone: string): string {
  return zoneOptions.find((item) => item.value === zone)?.label ?? (zone || '—')
}

export function statusLabel(status: string): string {
  return statusOptions.find((item) => item.value === status)?.label ?? (status || '—')
}

export function statusTagType(status: string): 'success' | 'warning' | 'info' {
  if (status === 'on') return 'success'
  if (status === 'off') return 'warning'
  return 'info'
}

export function createDraft(): ProductDraft {
  return {
    zone: 'mall',
    name: '',
    subtitle: '',
    body: '',
    coverUrl: '',
    imageUrlsText: '',
    status: 'draft',
    priceYuan: '',
    pvYuan: '',
    categoryId: '',
    sortOrder: '0',
    homeVisible: false,
  }
}

export function draftFromProduct(product: Product): ProductDraft {
  const zone: ProductZone = product.zone === 'startup' ? 'startup' : 'mall'
  const status: ProductStatus =
    product.status === 'on' || product.status === 'off' || product.status === 'draft'
      ? product.status
      : 'draft'
  return {
    zone,
    name: product.name,
    subtitle: product.subtitle,
    body: product.body,
    coverUrl: product.coverUrl,
    imageUrlsText: product.imageUrls.join('\n'),
    status,
    priceYuan: fenToYuan(product.priceFen),
    pvYuan: product.pvFen == null ? '' : fenToYuan(product.pvFen),
    categoryId: product.categoryId,
    sortOrder: String(product.sortOrder),
    homeVisible: product.homeVisible,
  }
}

export function buildProductCreate(draft: ProductDraft): ProductCreateBody {
  const shared = readShared(draft)
  const body: ProductCreateBody = {
    zone: draft.zone,
    name: shared.name,
    subtitle: shared.subtitle,
    body: shared.body,
    coverUrl: shared.coverUrl,
    imageUrls: shared.imageUrls,
    // 运费并入售价，不再单独体现。成本价不录入，库内字段保留并恒为 0。
    freightFen: 0,
    status: draft.status,
    sortOrder: readSortOrder(draft.sortOrder),
    homeVisible: draft.homeVisible,
  }
  if (draft.zone === 'mall') {
    body.priceFen = readPriceFen(draft.priceYuan)
    body.pvFen = readPvFen(draft.pvYuan)
    body.categoryId = categoryIdOf(draft)
  }
  return body
}

export function buildProductUpdate(draft: ProductDraft): ProductUpdateBody {
  const shared = readShared(draft)
  const body: ProductUpdateBody = {
    name: shared.name,
    subtitle: shared.subtitle,
    body: shared.body,
    coverUrl: shared.coverUrl,
    imageUrls: shared.imageUrls,
    // 运费并入售价，不再单独体现。成本价不录入，库内字段保留并恒为 0。
    freightFen: 0,
    status: draft.status,
    sortOrder: readSortOrder(draft.sortOrder),
    homeVisible: draft.homeVisible,
  }
  if (draft.zone === 'mall') {
    body.priceFen = readPriceFen(draft.priceYuan)
    body.pvFen = readPvFen(draft.pvYuan)
    body.categoryId = categoryIdOf(draft)
  }
  return body
}

function categoryIdOf(draft: ProductDraft): string | null {
  const value: unknown = draft.categoryId
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || null
}

function readShared(draft: ProductDraft): {
  name: string
  subtitle: string | null
  body: string | null
  coverUrl: string | null
  imageUrls: string[]
} {
  const name = draft.name.trim()
  if (!name || name.length > 128) throw new Error('请填写不超过 128 个字的商品名称')
  const subtitle = emptyToNull(draft.subtitle.trim(), '副标题', 255)
  const body = emptyToNull(draft.body.trim(), '详情', 20_000)
  const coverUrl = draft.coverUrl.trim()
  if (coverUrl) assertUrl(coverUrl, '封面')
  const imageUrls = draft.imageUrlsText
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (imageUrls.length > maxImages) throw new Error(`附图最多 ${maxImages} 个`)
  imageUrls.forEach((url, index) => assertUrl(url, `附图${index + 1}`))
  return {
    name,
    subtitle,
    body,
    coverUrl: coverUrl || null,
    imageUrls,
  }
}

function readSortOrder(input: string): number {
  const text = input.trim() === '' ? '0' : input.trim()
  if (!/^-?\d+$/.test(text)) throw new Error('排序请填写整数')
  const value = Number(text)
  if (!Number.isSafeInteger(value) || value < -1_000_000 || value > 1_000_000) {
    throw new Error('排序超出范围（-1000000 ~ 1000000）')
  }
  return value
}

function readPriceFen(input: string): number {
  const fen = parseYuanToFen(input)
  if (fen == null) throw new Error('价格请填写不小于 0 的金额，最多两位小数')
  return fen
}

function readPvFen(input: string): number {
  const fen = parseYuanToFen(input)
  if (fen == null) throw new Error('PV 请填写不小于 0 的金额，最多两位小数')
  return fen
}

function emptyToNull(value: string, label: string, max: number): string | null {
  if (!value) return null
  if (value.length > max) throw new Error(`${label}过长`)
  return value
}

function assertUrl(value: string, label: string): void {
  if (value.length > 512) throw new Error(`${label}链接过长`)
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label}必须是 http 或 https 链接`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${label}必须是 http 或 https 链接`)
  }
}
