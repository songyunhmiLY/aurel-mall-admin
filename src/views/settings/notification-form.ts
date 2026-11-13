import {
  isDeliveryMode,
  notifyPageMax,
  notifySecretMax,
  notifySignNameMax,
  notifySlotLimit,
  notifySmsTemplateMax,
  notifyWechatTemplateMax,
  type DeliveryMode,
  type NotificationEventSettings,
  type NotificationEventUpdate,
  type NotificationSettings,
  type NotificationSettingsUpdate,
  type NotificationSmsUpdate,
  type NotifyChannel,
  type NotifySlot,
} from '@/api/notifications'

export interface NotificationSlotDraft {
  key: number
  channel: NotifyChannel
  slot: string
  field: string
}

export interface NotificationEventDraft {
  event: string
  enabled: boolean
  wechatTemplateId: string
  smsTemplateId: string
  pagePath: string
  fields: string[]
  slots: NotificationSlotDraft[]
}

export interface NotificationDraft {
  deliveryMode: '' | DeliveryMode
  secretId: string
  secretKey: string
  sdkAppId: string
  signName: string
  region: string
  events: NotificationEventDraft[]
}

export interface NotificationStatusCopy {
  tag: string
  alertType: 'success' | 'warning'
  title: string
}

export interface NotificationSaveReady {
  ok: true
  body: NotificationSettingsUpdate
}

export interface NotificationSaveRejected {
  ok: false
  message: string
}

const eventLabels: Record<string, string> = {
  refund_result: '退款结果',
  lucky_return_credited: '幸运返还到账',
  withdrawal_outcome: '提现受理/到账/失败',
  wallet_credit_withdrawable: '提现账户入账',
  wallet_credit_points: '积分账户入账',
  wallet_credit_consumption: '消费账户入账',
}

const fieldLabels: Record<string, string> = {
  amount: '金额',
  time: '时间',
  orderNo: '单号',
  status: '状态',
  pointsAmount: '积分金额',
  withdrawableAmount: '提现金额',
  payoutAmount: '打款金额',
  bizType: '业务类型',
}

const deliveryModeLabels: Record<DeliveryMode, string> = {
  wechat: '微信通知',
  sms: '短信',
  both: '两者',
}

export const deliveryModeOptions: { value: DeliveryMode; label: string }[] = [
  { value: 'wechat', label: deliveryModeLabels.wechat },
  { value: 'sms', label: deliveryModeLabels.sms },
  { value: 'both', label: deliveryModeLabels.both },
]

let slotKey = 0

export function eventLabel(event: string): string {
  return eventLabels[event] ?? event
}

export function fieldLabel(field: string): string {
  return fieldLabels[field] ?? field
}

export function deliveryModeLabel(mode: DeliveryMode): string {
  return deliveryModeLabels[mode]
}

/** 接口返回掩码时原样展示。若返回不含 * 的原文，只显示已配置。 */
export function secretKeyDisplay(value: string | null): string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return '未配置'
  if (trimmed.includes('*')) return trimmed
  return '已配置'
}

export function notificationStatusCopy(settings: NotificationSettings): NotificationStatusCopy {
  if (!settings.deliveryMode) {
    return {
      tag: '未选择',
      alertType: 'warning',
      title: '尚未选择推送方式。未选择时不会发送。',
    }
  }
  return {
    tag: deliveryModeLabel(settings.deliveryMode),
    alertType: 'success',
    title: '已选择推送方式。保存时只提交有改动的项。密钥留空则保持服务器上的原文。',
  }
}

export function smsStatusCopy(settings: NotificationSettings): NotificationStatusCopy {
  const sms = settings.sms
  if (sms.configured) {
    return {
      tag: '已配置',
      alertType: 'success',
      title: '短信 SecretId、密钥、应用 ID 和签名已保存。',
    }
  }
  if (sms.secretId || sms.secretKeyMasked || sms.sdkAppId || sms.signName) {
    return {
      tag: '未齐备',
      alertType: 'warning',
      title: '短信还缺 SecretId、密钥、应用 ID 或签名。可以先保存已填写的内容。',
    }
  }
  return {
    tag: '未配置',
    alertType: 'warning',
    title: '尚未配置腾讯云短信。',
  }
}

export function emptyNotificationDraft(): NotificationDraft {
  return {
    deliveryMode: '',
    secretId: '',
    secretKey: '',
    sdkAppId: '',
    signName: '',
    region: '',
    events: [],
  }
}

export function applyNotificationDraft(
  draft: NotificationDraft,
  settings: NotificationSettings,
): void {
  draft.deliveryMode = settings.deliveryMode ?? ''
  draft.secretId = settings.sms.secretId ?? ''
  draft.secretKey = ''
  draft.sdkAppId = settings.sms.sdkAppId ?? ''
  draft.signName = settings.sms.signName ?? ''
  draft.region = settings.sms.region ?? ''
  draft.events = settings.events.map((event) => toEventDraft(event))
}

export function blankSlot(
  channel: NotifyChannel,
  fields: readonly string[],
): NotificationSlotDraft | null {
  const field = fields[0]
  if (!field) return null
  return { key: nextSlotKey(), channel, slot: '', field }
}

/**
 * 只收集有改动的推送方式、短信字段和事件字段。
 * 密钥留空，或与当前掩码相同，则不提交。
 * 短信空位按当前顺序重编为 1..n。
 */
export function prepareNotificationSave(
  draft: NotificationDraft,
  loaded: NotificationSettings,
): NotificationSaveReady | NotificationSaveRejected {
  const body: NotificationSettingsUpdate = {}

  if (draft.deliveryMode) {
    if (!isDeliveryMode(draft.deliveryMode)) return reject('推送方式不正确')
    if (draft.deliveryMode !== loaded.deliveryMode) body.deliveryMode = draft.deliveryMode
  }

  const sms = smsUpdate(draft, loaded)
  if (!sms.ok) return sms
  if (sms.value) body.sms = sms.value

  const events: NotificationEventUpdate[] = []
  for (const event of draft.events) {
    const loadedEvent = loaded.events.find((item) => item.event === event.event)
    if (!loadedEvent) continue
    const built = eventUpdate(event, loadedEvent)
    if (!built.ok) return built
    if (built.value) events.push(built.value)
  }
  if (events.length > 0) body.events = events

  if (!body.deliveryMode && !body.sms && !body.events) {
    return reject('至少提供推送方式、短信配置或事件配置中的一项')
  }
  return { ok: true, body }
}

function toEventDraft(event: NotificationEventSettings): NotificationEventDraft {
  return {
    event: event.event,
    enabled: event.enabled,
    wechatTemplateId: event.wechatTemplateId ?? '',
    smsTemplateId: event.smsTemplateId ?? '',
    pagePath: event.pagePath ?? '',
    fields: [...event.fields],
    slots: event.slots.map((slot) => ({
      key: nextSlotKey(),
      channel: slot.channel,
      slot: slot.slot,
      field: slot.field,
    })),
  }
}

function nextSlotKey(): number {
  slotKey += 1
  return slotKey
}

function smsUpdate(
  draft: NotificationDraft,
  loaded: NotificationSettings,
): { ok: true; value: NotificationSmsUpdate | null } | NotificationSaveRejected {
  const sms: NotificationSmsUpdate = {}
  const secretId = textChange(draft.secretId, loaded.sms.secretId)
  if (secretId.changed) {
    if (!/^[A-Za-z0-9]{1,128}$/.test(secretId.value)) return reject('短信 SecretId 不正确')
    sms.secretId = secretId.value
  }

  const secretKey = draft.secretKey.trim()
  const masked = loaded.sms.secretKeyMasked?.trim() ?? ''
  if (secretKey && secretKey !== masked) {
    if (!/^\S{1,128}$/.test(secretKey) || secretKey.length > notifySecretMax) {
      return reject('短信密钥不正确')
    }
    sms.secretKey = secretKey
  }

  const sdkAppId = textChange(draft.sdkAppId, loaded.sms.sdkAppId)
  if (sdkAppId.changed) {
    if (!/^\d{1,20}$/.test(sdkAppId.value)) return reject('短信应用 ID 不正确')
    sms.sdkAppId = sdkAppId.value
  }

  const signName = textChange(draft.signName, loaded.sms.signName)
  if (signName.changed) {
    if (
      signName.value.length < 1 ||
      signName.value.length > notifySignNameMax ||
      /[\r\n]/.test(signName.value)
    ) {
      return reject('短信签名不正确')
    }
    sms.signName = signName.value
  }

  const region = textChange(draft.region, loaded.sms.region)
  if (region.changed) {
    if (region.value && !/^[a-z0-9-]{1,32}$/.test(region.value)) return reject('短信地域不正确')
    sms.region = region.value
  }

  if (
    sms.secretId === undefined &&
    sms.secretKey === undefined &&
    sms.sdkAppId === undefined &&
    sms.signName === undefined &&
    sms.region === undefined
  ) {
    return { ok: true, value: null }
  }
  return { ok: true, value: sms }
}

function eventUpdate(
  draft: NotificationEventDraft,
  loaded: NotificationEventSettings,
): { ok: true; value: NotificationEventUpdate | null } | NotificationSaveRejected {
  const update: NotificationEventUpdate = { event: draft.event }
  let changed = false

  if (draft.enabled !== loaded.enabled) {
    update.enabled = draft.enabled
    changed = true
  }

  const wechatTemplateId = textChange(draft.wechatTemplateId, loaded.wechatTemplateId)
  if (wechatTemplateId.changed) {
    if (wechatTemplateId.value && !/^[A-Za-z0-9_-]{1,64}$/.test(wechatTemplateId.value)) {
      return reject('微信模板 ID 不正确')
    }
    if (wechatTemplateId.value.length > notifyWechatTemplateMax) return reject('微信模板 ID 不正确')
    update.wechatTemplateId = wechatTemplateId.value
    changed = true
  }

  const smsTemplateId = textChange(draft.smsTemplateId, loaded.smsTemplateId)
  if (smsTemplateId.changed) {
    if (smsTemplateId.value && !/^\d{1,20}$/.test(smsTemplateId.value)) {
      return reject('短信模板 ID 不正确')
    }
    if (smsTemplateId.value.length > notifySmsTemplateMax) return reject('短信模板 ID 不正确')
    update.smsTemplateId = smsTemplateId.value
    changed = true
  }

  const pagePath = textChange(draft.pagePath, loaded.pagePath)
  if (pagePath.changed) {
    const message = pageProblem(pagePath.value)
    if (message) return reject(message)
    update.pagePath = pagePath.value
    changed = true
  }

  const slots = canonicalSlots(draft.slots)
  if (!sameSlots(slots, canonicalSlots(loaded.slots))) {
    const message = slotProblem(draft.fields, slots)
    if (message) return reject(message)
    update.slots = slots
    changed = true
  }

  return { ok: true, value: changed ? update : null }
}

function pageProblem(value: string): string {
  if (value.length > notifyPageMax || /\s/.test(value)) return '跳转页面不正确'
  if (/^https?:\/\//i.test(value)) return '跳转页面必须是小程序页面'
  return ''
}

function slotProblem(fields: readonly string[], slots: readonly NotifySlot[]): string {
  if (slots.length > notifySlotLimit) return '模板空位不正确'
  const wechatNames = new Set<string>()
  const smsIndexes: number[] = []
  for (const slot of slots) {
    if (!fields.includes(slot.field)) return '模板空位对应的业务数据不正确'
    if (slot.channel === 'wechat') {
      if (!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(slot.slot)) return '模板空位不正确'
      if (wechatNames.has(slot.slot)) return '模板空位重复'
      wechatNames.add(slot.slot)
    } else if (!/^([1-9]|1\d|20)$/.test(slot.slot)) {
      return '模板空位不正确'
    } else {
      smsIndexes.push(Number(slot.slot))
    }
  }
  smsIndexes.sort((left, right) => left - right)
  for (let index = 0; index < smsIndexes.length; index += 1) {
    if (smsIndexes[index] !== index + 1) return '短信模板空位必须从 1 连续编号'
  }
  return ''
}

function canonicalSlots(
  slots: readonly { channel: NotifyChannel; slot: string; field: string }[],
): NotifySlot[] {
  let smsIndex = 0
  const result: NotifySlot[] = []
  for (const slot of slots) {
    if (slot.channel === 'sms') {
      smsIndex += 1
      result.push({ channel: 'sms', slot: String(smsIndex), field: slot.field })
    } else {
      result.push({ channel: 'wechat', slot: slot.slot.trim(), field: slot.field })
    }
  }
  return result
}

function sameSlots(left: readonly NotifySlot[], right: readonly NotifySlot[]): boolean {
  if (left.length !== right.length) return false
  return left.every((slot, index) => {
    const other = right[index]
    return (
      other !== undefined &&
      slot.channel === other.channel &&
      slot.slot === other.slot &&
      slot.field === other.field
    )
  })
}

function textChange(next: string, previous: string | null): { changed: boolean; value: string } {
  const value = next.trim()
  return { changed: value !== (previous ?? ''), value }
}

function reject(message: string): NotificationSaveRejected {
  return { ok: false, message }
}
