import { ApiError, http } from './http'
import {
  asRecord,
  readBoolean,
  readId,
  readInteger,
  readNullableString,
  readPage,
  readString,
} from './json'

export type ProductZone = 'startup' | 'mall'
export type ProductStatus = 'draft' | 'on' | 'off'

export interface MallCategory {
  id: string
  name: string
  sortOrder: number
}

export interface Product {
  id: string
  zone: string
  name: string
  subtitle: string
  body: string
  coverUrl: string
  imageUrls: string[]
  freightFen: number
  priceFen: number
  /** 会员商城为分。1 PV = 1 元 = 100。创业专区为 null。 */
  pvFen: number | null
  /**
   * 含运费的进货成本（分）。业务上不再使用：管理端不录入、不展示，库内字段保留并恒为 0。
   * 保留类型是为了继续兼容接口返回，不参与任何页面计算。
   */
  costFen: number | null
  /** 库存只留档：不参与下单、结算与页面展示。 */
  stockQuantity: number
  status: string
  /** 商城混排顺序，管理端配置。数值小的排前面。 */
  sortOrder: number
  /** 是否出现在小程序首页商品流。 */
  homeVisible: boolean
  skuId: string
  categoryId: string
  categoryName: string
}

export interface ProductPage {
  items: Product[]
  total: number
  page: number
  pageSize: number
}

export interface ProductSaveResult {
  product: Product
  warnings: string[]
}

/** 与 CreateProductDto 一致。创业专区不传 priceFen、pvFen、categoryId。运费并入售价，固定 0。 */
export interface ProductCreateBody {
  zone: ProductZone
  name: string
  subtitle: string | null
  body: string | null
  coverUrl: string | null
  imageUrls: string[]
  freightFen: number
  priceFen?: number
  pvFen?: number
  costFen?: number | null
  categoryId?: string | null
  status: ProductStatus
  sortOrder?: number
  homeVisible?: boolean
}

/** 与 UpdateProductDto 一致。不能带 zone。运费并入售价，固定 0。 */
export interface ProductUpdateBody {
  name: string
  subtitle: string | null
  body: string | null
  coverUrl: string | null
  imageUrls: string[]
  freightFen: number
  priceFen?: number
  pvFen?: number
  costFen?: number | null
  categoryId?: string | null
  status: ProductStatus
  sortOrder?: number
  homeVisible?: boolean
}

export interface ProductQuery {
  zone?: string
  status?: string
  page: number
  pageSize: number
}

const productsPath = '/admin/products'
const categoriesPath = '/admin/mall-categories'

export async function fetchProducts(query: ProductQuery): Promise<ProductPage> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.zone) params.zone = query.zone
  if (query.status) params.status = query.status
  const { data } = await http.get<unknown>(productsPath, { params })
  const page = readPage(data, '商品')
  return { ...page, items: page.items.map((item) => readProduct(item)) }
}

export async function fetchProduct(id: string): Promise<Product> {
  const { data } = await http.get<unknown>(`${productsPath}/${encodeURIComponent(id)}`)
  return readProduct(data)
}

export async function createProduct(body: ProductCreateBody): Promise<ProductSaveResult> {
  const { data } = await http.post<unknown>(productsPath, body)
  return readSaveResult(data)
}

export async function updateProduct(
  id: string,
  body: ProductUpdateBody,
): Promise<ProductSaveResult> {
  const { data } = await http.put<unknown>(`${productsPath}/${encodeURIComponent(id)}`, body)
  return readSaveResult(data)
}

export async function setProductShelf(id: string, status: 'on' | 'off'): Promise<Product> {
  const { data } = await http.post<unknown>(`${productsPath}/${encodeURIComponent(id)}/shelf`, {
    status,
  })
  return readProduct(data)
}

export async function setProductSort(id: string, sortOrder: number): Promise<Product> {
  const { data } = await http.put<unknown>(`${productsPath}/${encodeURIComponent(id)}/sort`, {
    sortOrder,
  })
  return readProduct(data)
}

export async function setProductHome(id: string, homeVisible: boolean): Promise<Product> {
  const { data } = await http.put<unknown>(`${productsPath}/${encodeURIComponent(id)}/home`, {
    homeVisible,
  })
  return readProduct(data)
}

export async function fetchMallCategories(): Promise<MallCategory[]> {
  const { data } = await http.get<unknown>(categoriesPath)
  if (!Array.isArray(data)) throw new ApiError('分类响应无效', 500)
  return data.map((item) => readCategory(item))
}

export async function createMallCategory(name: string, sortOrder: number): Promise<MallCategory> {
  const { data } = await http.post<unknown>(categoriesPath, { name, sortOrder })
  return readCategory(data)
}

export function readProduct(data: unknown): Product {
  const record = asRecord(data)
  if (!record) throw new ApiError('商品响应无效', 500)
  const id = readId(record.id)
  const freightFen = readInteger(record.freightFen)
  const priceFen = readInteger(record.priceFen)
  const stockQuantity = readInteger(record.stockQuantity)
  if (!id || freightFen == null || priceFen == null || stockQuantity == null) {
    throw new ApiError('商品响应无效', 500)
  }
  const category = asRecord(record.category)
  const pvFen = record.pvFen == null ? null : readInteger(record.pvFen)
  if (record.pvFen != null && pvFen == null) throw new ApiError('商品响应无效', 500)
  const costFen = record.costFen == null ? null : readInteger(record.costFen)
  return {
    id,
    zone: readString(record.zone),
    name: readString(record.name),
    subtitle: readNullableString(record.subtitle),
    body: readNullableString(record.body),
    coverUrl: readNullableString(record.coverUrl),
    imageUrls: readImageUrls(record.imageUrls),
    freightFen,
    priceFen,
    pvFen,
    costFen,
    stockQuantity,
    status: readString(record.status),
    sortOrder: readInteger(record.sortOrder) ?? 0,
    homeVisible: readBoolean(record.homeVisible) === true,
    skuId: readId(record.skuId),
    categoryId: readId(record.categoryId),
    categoryName: category ? readString(category.name) : '',
  }
}

function readSaveResult(data: unknown): ProductSaveResult {
  const record = asRecord(data)
  if (!record || !Array.isArray(record.warnings)) throw new ApiError('商品保存响应无效', 500)
  const warnings = record.warnings.filter((item): item is string => typeof item === 'string')
  return { product: readProduct(record.product), warnings }
}

function readImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) throw new ApiError('商品响应无效', 500)
  return value.map((item) => {
    if (typeof item !== 'string') throw new ApiError('商品响应无效', 500)
    return item
  })
}

function readCategory(data: unknown): MallCategory {
  const record = asRecord(data)
  const id = readId(record?.id)
  const sortOrder = readInteger(record?.sortOrder)
  const name = readString(record?.name)
  if (!record || !id || !name || sortOrder == null) throw new ApiError('分类响应无效', 500)
  return { id, name, sortOrder }
}
