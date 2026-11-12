import { ApiError, http } from './http'
import { fenToUnitNumber } from './money'
import { asRecord, readInteger, readList, readString, warningFromRecord } from './json'

export type ProductZone = 'startup' | 'mall'
export type ProductStatus = 'draft' | 'on' | 'off'

export interface ProductCategory {
  id: string
  name: string
}

export interface Product {
  id: string
  zone: string
  name: string
  subtitle: string
  coverUrl: string
  imageUrls: string[]
  status: string
  priceFen: number | null
  freightFeeFen: number | null
  stock: number | null
  /**
   * 会员商城 PV，按分保存，便于和 priceFen 对齐（1 PV = 1 元 = 100）。
   * 创业专区没有 PV。
   */
  pvFen: number | null
  categoryId: string
  categoryName: string
  warning: string
}

export interface ProductList {
  items: Product[]
  startupZoneUnitPriceFen: number | null
}

export interface ProductWrite {
  name: string
  subtitle: string
  coverUrl: string
  imageUrls: string[]
  zone: ProductZone
  status: ProductStatus
  priceFen: number
  freightFeeFen: number
  stock: number
  /** 会员商城的 PV 数量，1 PV = 1 元。创业专区不传。 */
  pv?: number
  /** 仅当分类接口存在时传递。空字符串表示不选，提交 null。 */
  categoryId?: string | null
}

export interface ProductQuery {
  zone?: string
  status?: string
}

const productsPath = '/admin/products'
const categoriesPath = '/admin/product-categories'

let categoriesUnavailable = false

export async function fetchProducts(query: ProductQuery = {}): Promise<ProductList> {
  const params: Record<string, string> = {}
  if (query.zone) params.zone = query.zone
  if (query.status) params.status = query.status
  const { data } = await http.get<unknown>(productsPath, { params })
  return normalizeProductList(data)
}

export async function fetchProduct(id: string): Promise<Product> {
  const { data, apiMessage } = await http.get<unknown>(`${productsPath}/${encodeURIComponent(id)}`)
  const product = normalizeProduct(unwrapProduct(data), apiMessage)
  if (!product.id) throw new ApiError('商品响应无效', 500)
  return product
}

export async function createProduct(body: ProductWrite): Promise<Product> {
  const response = await http.post<unknown>(productsPath, toPayload(body))
  return readSavedProduct(response.data, response.apiMessage)
}

export async function updateProduct(id: string, body: ProductWrite): Promise<Product> {
  const response = await http.put<unknown>(
    `${productsPath}/${encodeURIComponent(id)}`,
    toPayload(body),
  )
  return readSavedProduct(response.data, response.apiMessage, id)
}

export async function setProductShelf(id: string, status: 'on' | 'off'): Promise<void> {
  try {
    await http.post(`${productsPath}/${encodeURIComponent(id)}/${status}`)
  } catch (error) {
    if (!isMissingRoute(error)) throw error
    await http.put(`${productsPath}/${encodeURIComponent(id)}`, { status })
  }
}

/**
 * 把库存设为给定数量。优先走库存接口。
 * 没有该路由时，用 fallback 回写整件商品；fallback 为空则把原错误抛出。
 */
export async function updateProductStock(
  id: string,
  stock: number,
  fallback: ProductWrite | null,
): Promise<void> {
  try {
    await http.put(`${productsPath}/${encodeURIComponent(id)}/stock`, { stock })
  } catch (error) {
    if (!isMissingRoute(error)) throw error
    if (!fallback) {
      throw new ApiError('没有单独的库存接口，暂时不能只改库存', 404)
    }
    await updateProduct(id, { ...fallback, stock })
  }
}

/**
 * 会员商城分类。接口不存在时返回 null，页面不展示分类。
 * 其他错误照常抛出。
 */
export async function fetchProductCategories(): Promise<ProductCategory[] | null> {
  if (categoriesUnavailable) return null
  try {
    const { data } = await http.get<unknown>(categoriesPath)
    return normalizeCategories(data)
  } catch (error) {
    if (isMissingRoute(error)) {
      categoriesUnavailable = true
      return null
    }
    throw error
  }
}

export function productToWrite(product: Product, patch: Partial<ProductWrite> = {}): ProductWrite {
  const zone = patch.zone ?? (isZone(product.zone) ? product.zone : 'mall')
  const status = patch.status ?? (isStatus(product.status) ? product.status : 'draft')
  const write: ProductWrite = {
    name: patch.name ?? product.name,
    subtitle: patch.subtitle ?? product.subtitle,
    coverUrl: patch.coverUrl ?? product.coverUrl,
    imageUrls: patch.imageUrls ?? product.imageUrls,
    zone,
    status,
    priceFen: patch.priceFen ?? product.priceFen ?? 0,
    freightFeeFen: patch.freightFeeFen ?? product.freightFeeFen ?? 0,
    stock: patch.stock ?? product.stock ?? 0,
  }
  if (zone !== 'mall') return write
  write.pv = patch.pv ?? (product.pvFen == null ? 0 : fenToUnitNumber(product.pvFen))
  if (patch.categoryId !== undefined) write.categoryId = patch.categoryId
  else if (product.categoryId) write.categoryId = product.categoryId
  return write
}

function toPayload(body: ProductWrite): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: body.name,
    subtitle: body.subtitle,
    coverUrl: body.coverUrl,
    imageUrls: body.imageUrls,
    zone: body.zone,
    status: body.status,
    priceFen: body.priceFen,
    freightFeeFen: body.freightFeeFen,
    stock: body.stock,
  }
  if (body.zone === 'mall') payload.pv = body.pv ?? 0
  if (body.categoryId !== undefined) payload.categoryId = body.categoryId
  return payload
}

function readSavedProduct(data: unknown, apiMessage: string | undefined, fallbackId = ''): Product {
  const product = normalizeProduct(unwrapProduct(data), apiMessage)
  if (!product.id && fallbackId) product.id = fallbackId
  const wrapperWarning = warningFromRecord(asRecord(data), apiMessage)
  if (wrapperWarning && !product.warning.includes(wrapperWarning)) {
    product.warning = [product.warning, wrapperWarning].filter(Boolean).join('；')
  }
  return product
}

export function normalizeProductList(data: unknown): ProductList {
  const rawItems = readList(data, ['items', 'list', 'products', 'records'])
  const items =
    rawItems.length > 0 ? rawItems.map((item) => normalizeProduct(item)) : singleProduct(data)
  return {
    items: items.filter((item) => item.id),
    startupZoneUnitPriceFen: readStartupPrice(data, rawItems),
  }
}

function singleProduct(data: unknown): Product[] {
  const record = asRecord(data)
  if (!record || typeof record.name !== 'string' || !record.zone) return []
  return [normalizeProduct(record)]
}

function readStartupPrice(data: unknown, rawItems: unknown[]): number | null {
  const root = readInteger(asRecord(data)?.startupZoneUnitPriceFen)
  if (root != null && root >= 0) return root
  for (const item of rawItems) {
    const value = readInteger(asRecord(item)?.startupZoneUnitPriceFen)
    if (value != null && value >= 0) return value
  }
  return null
}

export function normalizeProduct(data: unknown, apiMessage?: string): Product {
  const record = asRecord(unwrapProduct(data)) ?? {}
  const zone = readString(record, ['zone'])
  const sku = asRecord(record.sku)
  return {
    id: readString(record, ['id']),
    zone,
    name: readString(record, ['name']),
    subtitle: readString(record, ['subtitle', 'description']),
    coverUrl: readString(record, ['coverUrl', 'cover']),
    imageUrls: readImageUrls(record),
    status: readString(record, ['status']),
    priceFen: readPriceFen(record, sku),
    freightFeeFen: readOptionalInteger(record, ['freightFeeFen', 'freightFen']),
    stock: readStock(record, sku),
    pvFen: zone === 'mall' ? readPvFen(record) : null,
    categoryId: readString(record, ['categoryId']),
    categoryName: readString(record, ['categoryName']),
    warning: warningFromRecord(record, apiMessage),
  }
}

function unwrapProduct(data: unknown): unknown {
  const record = asRecord(data)
  if (!record) return data
  const nested = asRecord(record.product)
  if (!nested) return data
  return {
    ...nested,
    warning: nested.warning ?? record.warning,
    warnings: nested.warnings ?? record.warnings,
    pvWarning: nested.pvWarning ?? record.pvWarning,
    startupZoneUnitPriceFen: nested.startupZoneUnitPriceFen ?? record.startupZoneUnitPriceFen,
  }
}

function readPriceFen(
  record: Record<string, unknown>,
  sku: Record<string, unknown> | null,
): number | null {
  const fen = readInteger(record.priceFen) ?? (sku ? readInteger(sku.priceFen) : null)
  if (fen != null) return fen
  return null
}

function readStock(
  record: Record<string, unknown>,
  sku: Record<string, unknown> | null,
): number | null {
  const direct = readInteger(record.stock) ?? readInteger(record.quantity)
  if (direct != null) return direct
  const stockRecord = asRecord(record.stock)
  if (stockRecord) {
    const nested = readInteger(stockRecord.quantity) ?? readInteger(stockRecord.stock)
    if (nested != null) return nested
  }
  if (!sku) return null
  return readInteger(sku.stock) ?? readInteger(sku.quantity)
}

function readPvFen(record: Record<string, unknown>): number | null {
  const pvFen = readInteger(record.pvFen)
  if (pvFen != null) return pvFen
  const pv = record.pv
  if (typeof pv === 'number' && Number.isFinite(pv) && pv >= 0) return Math.round(pv * 100)
  if (typeof pv === 'string' && /^\d+(\.\d{1,2})?$/.test(pv.trim()))
    return Math.round(Number(pv) * 100)
  return null
}

function readOptionalInteger(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = readInteger(record[key])
    if (value != null) return value
  }
  return null
}

function readImageUrls(record: Record<string, unknown>): string[] {
  const raw = record.imageUrls ?? record.images
  if (typeof raw === 'string') {
    return raw
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      const row = asRecord(item)
      return row ? readString(row, ['url']) : ''
    })
    .filter(Boolean)
}

function normalizeCategories(data: unknown): ProductCategory[] {
  return readList(data, ['items', 'list', 'categories', 'records'])
    .map((item) => {
      const record = asRecord(item)
      if (!record) return null
      const id = readString(record, ['id'])
      const name = readString(record, ['name', 'title'])
      if (!id || !name) return null
      return { id, name }
    })
    .filter((item): item is ProductCategory => item !== null)
}

function isZone(value: string): value is ProductZone {
  return value === 'startup' || value === 'mall'
}

function isStatus(value: string): value is ProductStatus {
  return value === 'draft' || value === 'on' || value === 'off'
}

function isMissingRoute(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 405)
}
