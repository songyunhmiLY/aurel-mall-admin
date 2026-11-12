import { ApiError, http } from './http'

/** 与 GET/PUT /api/v1/admin/settings/wechat-pay 的 data 对应。 */
export interface WechatPaySettings {
  mchId: string
  /** 未配置时为空。已配置时应为掩码（含 *），客户端不展示不含 * 的原文。 */
  apiCertificate: string
  /** 未配置时为空。已配置时应为掩码（含 *）。 */
  apiV3Key: string
  /** 缺省时，仅当三项都非空才视为已配置。 */
  configured?: boolean
}

export interface WechatPayUpdate {
  mchId: string
  apiCertificate?: string
  apiV3Key?: string
}

const path = '/admin/settings/wechat-pay'

export async function fetchWechatPaySettings(): Promise<WechatPaySettings> {
  const { data } = await http.get<unknown>(path)
  return normalizeWechatPaySettings(data)
}

export async function saveWechatPaySettings(body: WechatPayUpdate): Promise<WechatPaySettings> {
  const { data } = await http.put<unknown>(path, body)
  if (data == null) throw new ApiError('保存响应无效', 500)
  return normalizeWechatPaySettings(data)
}

export function normalizeWechatPaySettings(data: unknown): WechatPaySettings {
  if (data == null) {
    return { mchId: '', apiCertificate: '', apiV3Key: '', configured: false }
  }
  if (typeof data !== 'object') {
    throw new ApiError('微信支付配置响应无效', 500)
  }
  const record = data as Record<string, unknown>
  const settings: WechatPaySettings = {
    mchId: asString(record.mchId),
    apiCertificate: asString(record.apiCertificate),
    apiV3Key: asString(record.apiV3Key),
  }
  if (typeof record.configured === 'boolean') settings.configured = record.configured
  return settings
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
