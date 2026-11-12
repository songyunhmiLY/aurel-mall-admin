import type { Product, ProductStatus, ProductWrite, ProductZone } from '@/api/products'

import { fenToUnitNumber, fenToYuan, parseYuanToFen } from '@/api/money'

export interface ProductDraft {
  zone: ProductZone
  name: string
  subtitle: string
  coverUrl: string
  imageUrlsText: string
  status: ProductStatus
  priceYuan: string
  freightYuan: string
  stock: number | undefined
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

const httpUrl = /^https?:\/\/\S+$/i

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
    coverUrl: '',
    imageUrlsText: '',
    status: 'draft',
    priceYuan: '',
    freightYuan: '0.00',
    stock: 0,
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
    coverUrl: product.coverUrl,
    imageUrlsText: product.imageUrls.join('\n'),
    status,
    priceYuan: product.priceFen == null ? '' : fenToYuan(product.priceFen),
    freightYuan: product.freightFeeFen == null ? '0.00' : fenToYuan(product.freightFeeFen),
    stock: product.stock ?? undefined,
    pvYuan: product.pvFen == null ? '' : fenToYuan(product.pvFen),
    categoryId: product.categoryId,
  }
}

export function buildProductWrite(
  draft: ProductDraft,
  startupZoneUnitPriceFen: number | null,
  categoriesEnabled: boolean,
): ProductWrite {
  const name = draft.name.trim()
  if (!name) throw new Error('请填写商品名称')
  if (name.length > 128) throw new Error('商品名称不能超过 128 个字')

  const subtitle = draft.subtitle.trim()
  if (subtitle.length > 255) throw new Error('副标题不能超过 255 个字')

  const coverUrl = draft.coverUrl.trim()
  assertUrl(coverUrl, '封面')

  const imageUrls = draft.imageUrlsText
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
  for (const url of imageUrls) assertUrl(url, '图片')

  if (draft.stock == null || !Number.isSafeInteger(draft.stock) || draft.stock < 0) {
    throw new Error('请填写不小于 0 的整数库存')
  }

  const freightFeeFen = parseYuanToFen(draft.freightYuan)
  if (freightFeeFen == null) throw new Error('运费请填写不小于 0 的金额，最多两位小数')

  let priceFen: number
  if (draft.zone === 'startup') {
    if (startupZoneUnitPriceFen == null || startupZoneUnitPriceFen < 0) {
      throw new Error('还没有读到创业专区锁定单价，暂时不能保存')
    }
    priceFen = startupZoneUnitPriceFen
  } else {
    const parsed = parseYuanToFen(draft.priceYuan)
    if (parsed == null) throw new Error('价格请填写不小于 0 的金额，最多两位小数')
    priceFen = parsed
  }

  const write: ProductWrite = {
    name,
    subtitle,
    coverUrl,
    imageUrls,
    zone: draft.zone,
    status: draft.status,
    priceFen,
    freightFeeFen,
    stock: draft.stock,
  }

  if (draft.zone === 'mall') {
    const pvFen = parseYuanToFen(draft.pvYuan)
    if (pvFen == null) throw new Error('PV 请填写不小于 0 的数值，最多两位小数')
    write.pv = fenToUnitNumber(pvFen)
    const categoryId = typeof draft.categoryId === 'string' ? draft.categoryId.trim() : ''
    if (categoriesEnabled) write.categoryId = categoryId || null
  }

  return write
}

function assertUrl(value: string, label: string): void {
  if (!value) return
  if (value.length > 512) throw new Error(`${label}链接过长`)
  if (!httpUrl.test(value)) throw new Error(`${label}请填写 http 或 https 链接`)
}
