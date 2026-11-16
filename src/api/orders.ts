import { ApiError, http } from './http'
import { asRecord, readBoolean, readId, readInteger, readNullableString, readPage, readString } from './json'

export type OrderZone = 'startup' | 'mall'
export type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'closed'

export interface OrderShipping {
  contactName: string
  contactPhone: string
  province: string
  city: string
  district: string
  detail: string
}

export interface OrderItem {
  id: string
  skuId: string
  productName: string
  skuName: string
  unitPriceFen: number
  unitPvFen: number
  unitFreightFen: number
  quantity: number
  lineTotalFen: number
  linePvFen: number
  lineFreightFen: number
}

/** 管理端订单。金额字段是 JSON 数字，编号是十进制字符串。 */
export interface AdminOrder {
  id: string
  orderNo: string
  userId: string
  zone: string
  status: string
  goodsTotalFen: number
  freightFen: number
  payAmountFen: number
  pvFen: number
  pointsFen: number
  withdrawableFen: number
  consumptionFen: number
  wechatFen: number
  shipping: OrderShipping
  courierName: string
  trackingNumber: string
  items: OrderItem[]
  placedAt: string
  paidAt: string
  shippedAt: string
  closedAt: string
  /** 微信已支付但结算未完成（存在活跃结算补偿），界面据此显示黄色「结算异常」标记。 */
  settlementPending: boolean
  /** 活跃结算补偿的 id；settlementPending 为 false 时为 null。 */
  compensationId: string | null
  /** 运营备注。人工强制完成结算时由系统写入缺口与入座处理说明。 */
  remark: string | null
}

export interface OrderPage {
  items: AdminOrder[]
  total: number
  page: number
  pageSize: number
}

export interface OrderQuery {
  zone?: OrderZone
  status?: OrderStatus
  userId?: string
  page: number
  pageSize: number
}

export interface ShipOrderBody {
  courierName: string
  trackingNumber: string
}

const ordersPath = '/admin/orders'

export async function fetchOrders(query: OrderQuery): Promise<OrderPage> {
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  }
  if (query.zone) params.zone = query.zone
  if (query.status) params.status = query.status
  if (query.userId) params.userId = query.userId
  const { data } = await http.get<unknown>(ordersPath, { params })
  const page = readPage(data, '订单')
  return { ...page, items: page.items.map((item) => readOrder(item)) }
}

export async function fetchOrder(id: string): Promise<AdminOrder> {
  const { data } = await http.get<unknown>(`${ordersPath}/${encodeURIComponent(id)}`)
  return readOrder(data)
}

export async function shipOrder(id: string, body: ShipOrderBody): Promise<AdminOrder> {
  const { data } = await http.post<unknown>(`${ordersPath}/${encodeURIComponent(id)}/ship`, {
    courierName: body.courierName,
    trackingNumber: body.trackingNumber,
  })
  return readOrder(data)
}

function readOrder(data: unknown): AdminOrder {
  const record = asRecord(data)
  const id = readId(record?.id)
  const userId = readId(record?.userId)
  const orderNo = readString(record?.orderNo).trim()
  if (!record || !id || !userId || !orderNo) throw new ApiError('订单响应无效', 500)
  return {
    id,
    orderNo,
    userId,
    zone: readString(record.zone),
    status: readString(record.status),
    goodsTotalFen: readFen(record.goodsTotalFen),
    freightFen: readFen(record.freightFen),
    payAmountFen: readFen(record.payAmountFen),
    pvFen: readFen(record.pvFen),
    pointsFen: readFen(record.pointsFen),
    withdrawableFen: readFen(record.withdrawableFen),
    consumptionFen: readFen(record.consumptionFen),
    wechatFen: readFen(record.wechatFen),
    shipping: readShipping(record.shipping),
    courierName: readNullableString(record.courierName),
    trackingNumber: readNullableString(record.trackingNumber),
    items: readItems(record.items),
    placedAt: readNullableString(record.placedAt),
    paidAt: readNullableString(record.paidAt),
    shippedAt: readNullableString(record.shippedAt),
    closedAt: readNullableString(record.closedAt),
    settlementPending: readBoolean(record.settlementPending) === true,
    compensationId: record.compensationId == null ? null : readString(record.compensationId),
    remark: record.remark == null ? null : readString(record.remark),
  }
}

function readShipping(value: unknown): OrderShipping {
  const record = asRecord(value)
  if (!record) throw new ApiError('订单响应无效', 500)
  return {
    contactName: readString(record.contactName),
    contactPhone: readString(record.contactPhone),
    province: readString(record.province),
    city: readString(record.city),
    district: readString(record.district),
    detail: readString(record.detail),
  }
}

function readItems(value: unknown): OrderItem[] {
  if (!Array.isArray(value)) throw new ApiError('订单响应无效', 500)
  return value.map((item) => readItem(item))
}

function readItem(data: unknown): OrderItem {
  const record = asRecord(data)
  const id = readId(record?.id)
  const skuId = readId(record?.skuId)
  const quantity = readInteger(record?.quantity)
  if (!record || !id || !skuId || quantity == null) throw new ApiError('订单响应无效', 500)
  return {
    id,
    skuId,
    productName: readString(record.productName),
    skuName: readString(record.skuName),
    unitPriceFen: readFen(record.unitPriceFen),
    unitPvFen: readFen(record.unitPvFen),
    unitFreightFen: readFen(record.unitFreightFen),
    quantity,
    lineTotalFen: readFen(record.lineTotalFen),
    linePvFen: readFen(record.linePvFen),
    lineFreightFen: readFen(record.lineFreightFen),
  }
}

/** 订单金额在 JSON 里是数字（分）。十进制字符串也接受，避免把合法整数误判成无效。 */
function readFen(value: unknown): number {
  const fen = readInteger(value)
  if (fen == null) throw new ApiError('订单响应无效', 500)
  return fen
}

export interface ForceSettleResult {
  /** 写入订单备注的处理说明。 */
  note: string
}

/**
 * 人工强制完成结算。后端把钱包冻结尽量扣掉（创业专区按单价对齐、零头留在账户，
 * 不够扣的缺口写进订单备注）、尝试为创业专区订单入座，然后把订单转为已支付并关闭结算补偿。
 * 仅当订单存在活跃结算补偿（黄色「结算异常」标记）时可用。
 */
export async function forceSettleOrder(id: string): Promise<ForceSettleResult> {
  const { data } = await http.post<unknown>(
    `/admin/orders/${encodeURIComponent(id)}/force-settle`,
  )
  const record = asRecord(data)
  if (!record) throw new ApiError('强制结算响应无效', 500)
  return { note: readString(record.note) }
}
