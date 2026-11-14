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
  /** 成本价（元，含运费）。留空表示未录入，利润按 0 计。 */
  costYuan: string
  stockQuantity: number | undefined
  pvYuan: string
  categoryId: string
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
    costYuan: '',
    stockQuantity: 0,
    pvYuan: '',
    categoryId: '',
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
    costYuan: product.costFen == null ? '' : fenToYuan(product.costFen),
    stockQuantity: product.stockQuantity,
    pvYuan: product.pvFen == null ? '' : fenToYuan(product.pvFen),
    categoryId: product.categoryId,
  }
}

export function buildProductCreate(draft: ProductDraft): ProductCreateBody {
  const shared = readShared(draft)
  const stockQuantity = draft.stockQuantity
  if (stockQuantity == null || !Number.isSafeInteger(stockQuantity) || stockQuantity < 0) {
    throw new Error('请填写不小于 0 的整数库存')
  }
  const body: ProductCreateBody = {
    zone: draft.zone,
    name: shared.name,
    subtitle: shared.subtitle,
    body: shared.body,
    coverUrl: shared.coverUrl,
    imageUrls: shared.imageUrls,
    // 运费并入售价与成本，不再单独体现
    freightFen: 0,
    costFen: readCostFen(draft.costYuan),
    stockQuantity,
    status: draft.status,
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
    // 运费并入售价与成本，不再单独体现
    freightFen: 0,
    costFen: readCostFen(draft.costYuan),
    status: draft.status,
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

/** 成本价留空表示未录入；填了必须是不小于 0 的金额。 */
function readCostFen(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const fen = parseYuanToFen(trimmed)
  if (fen == null) throw new Error('成本价请填写不小于 0 的金额，最多两位小数')
  return fen
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
