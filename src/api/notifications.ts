import { ApiError, http } from './http'
import { asRecord, readBoolean } from './json'

/** 与 GET/PUT /api/v1/admin/settings/notifications 的 data 对应。 */
export const deliveryModes = ['wechat', 'sms', 'both'] as const
export type DeliveryMode = (typeof deliveryModes)[number]

export const notifyPageMax = 512
export const notifyWechatTemplateMax = 64
export const notifySmsTemplateMax = 20
export const notifySecretMax = 128
export const notifySdkAppIdMax = 20
export const notifySignNameMax = 64
export const notifyRegionMax = 32
export const notifySlotNameMax = 32
export const notifySlotLimit = 20

export type NotifyChannel = 'wechat' | 'sms'

export interface NotifySlot {
  channel: NotifyChannel
  slot: string
  field: string
}

export interface NotificationEventSettings {
  event: string
  enabled: boolean
  wechatTemplateId: string | null
  smsTemplateId: string | null
  pagePath: string | null
  slots: NotifySlot[]
  /** 只读。这个事件允许填入模板空位的业务数据。 */
  fields: string[]
}

export interface NotificationSmsSettings {
  configured: boolean
  secretId: string | null
  /** 只读掩码。PUT 使用 secretKey，不要把这个值写回去。 */
  secretKeyMasked: string | null
  sdkAppId: string | null
  signName: string | null
  region: string | null
}

export interface NotificationSettings {
  deliveryMode: DeliveryMode | null
  /** 只读。跳转页面留空时，发送使用的小程序页面。 */
  defaultPagePath: string
  sms: NotificationSmsSettings
  events: NotificationEventSettings[]
  updatedAt: string | null
}

export interface NotificationSmsUpdate {
  secretId?: string
  secretKey?: string
  sdkAppId?: string
  signName?: string
  region?: string
}

export interface NotificationEventUpdate {
  event: string
  enabled?: boolean
  wechatTemplateId?: string
  smsTemplateId?: string
  pagePath?: string
  slots?: NotifySlot[]
}

/** 只包含有改动的字段。不要提交 GET 才有的只读字段。 */
export interface NotificationSettingsUpdate {
  deliveryMode?: DeliveryMode
  sms?: NotificationSmsUpdate
  events?: NotificationEventUpdate[]
}

const path = '/admin/settings/notifications'

export function isDeliveryMode(value: string): value is DeliveryMode {
  return (deliveryModes as readonly string[]).includes(value)
}

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const { data } = await http.get<unknown>(path)
  return normalizeNotificationSettings(data)
}

export async function saveNotificationSettings(
  body: NotificationSettingsUpdate,
): Promise<NotificationSettings> {
  const { data } = await http.put<unknown>(path, body)
  return normalizeNotificationSettings(data)
}

export function normalizeNotificationSettings(data: unknown): NotificationSettings {
  const record = asRecord(data)
  if (!record) throw new ApiError('消息推送配置响应无效', 500)
  return {
    deliveryMode: readDeliveryMode(record.deliveryMode),
    defaultPagePath: readPagePath(record.defaultPagePath),
    sms: readSms(record.sms),
    events: readEvents(record.events),
    updatedAt: readUpdatedAt(record.updatedAt),
  }
}

function readDeliveryMode(value: unknown): DeliveryMode | null {
  if (value == null || value === '') return null
  if (typeof value === 'string' && isDeliveryMode(value)) return value
  throw new ApiError('消息推送配置响应无效', 500)
}

function readPagePath(value: unknown): string {
  if (value == null) return ''
  if (typeof value !== 'string') throw new ApiError('消息推送配置响应无效', 500)
  return value
}

function readUpdatedAt(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'string' || !value.trim()) throw new ApiError('消息推送配置响应无效', 500)
  return value
}

function readNullableText(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'string') throw new ApiError('消息推送配置响应无效', 500)
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readSms(value: unknown): NotificationSmsSettings {
  const record = asRecord(value)
  if (!record) throw new ApiError('消息推送配置响应无效', 500)
  const secretId = readNullableText(record.secretId)
  const secretKeyMasked = readNullableText(record.secretKeyMasked)
  const sdkAppId = readNullableText(record.sdkAppId)
  const signName = readNullableText(record.signName)
  const configured = readBoolean(record.configured)
  return {
    configured: configured ?? Boolean(secretId && secretKeyMasked && sdkAppId && signName),
    secretId,
    secretKeyMasked,
    sdkAppId,
    signName,
    region: readNullableText(record.region),
  }
}

function readEvents(value: unknown): NotificationEventSettings[] {
  if (!Array.isArray(value)) throw new ApiError('消息推送配置响应无效', 500)
  return value.map((item) => readEvent(item))
}

function readEvent(value: unknown): NotificationEventSettings {
  const record = asRecord(value)
  const event = typeof record?.event === 'string' ? record.event.trim() : ''
  const enabled = readBoolean(record?.enabled)
  if (!record || !event || enabled == null) throw new ApiError('消息推送配置响应无效', 500)
  const fields = readFields(record.fields)
  return {
    event,
    enabled,
    wechatTemplateId: readNullableText(record.wechatTemplateId),
    smsTemplateId: readNullableText(record.smsTemplateId),
    pagePath: readNullableText(record.pagePath),
    slots: readSlots(record.slots, fields),
    fields,
  }
}

function readFields(value: unknown): string[] {
  if (!Array.isArray(value)) throw new ApiError('消息推送配置响应无效', 500)
  const fields: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) throw new ApiError('消息推送配置响应无效', 500)
    fields.push(item)
  }
  return fields
}

function readSlots(value: unknown, fields: readonly string[]): NotifySlot[] {
  if (!Array.isArray(value)) throw new ApiError('消息推送配置响应无效', 500)
  const slots: NotifySlot[] = []
  for (const item of value) {
    const record = asRecord(item)
    const channel = record?.channel
    const slot = record?.slot
    const field = record?.field
    if (
      (channel !== 'wechat' && channel !== 'sms') ||
      typeof slot !== 'string' ||
      !slot.trim() ||
      typeof field !== 'string' ||
      !fields.includes(field)
    ) {
      throw new ApiError('消息推送配置响应无效', 500)
    }
    slots.push({ channel, slot, field })
  }
  return slots
}
