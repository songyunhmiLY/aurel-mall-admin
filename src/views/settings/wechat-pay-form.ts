import type { WechatPaySettings, WechatPayUpdate } from '@/api/wechat-pay'

export interface WechatPayDraft {
  mchId: string
  apiCertificate: string
  apiV3Key: string
}

export interface WechatPayStatusCopy {
  tag: string
  alertType: 'success' | 'warning'
  title: string
}

const sandboxNote = '商户与证书未齐备前，后端可使用沙箱或模拟成功。'

export function isMaskedSecret(value: string): boolean {
  return value.includes('*')
}

/** 接口返回掩码时原样展示；返回原文时不渲染密钥，只显示已配置。 */
export function secretDisplay(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '未配置'
  if (isMaskedSecret(trimmed)) return trimmed
  return '已配置'
}

export function missingWechatPayFields(settings: WechatPaySettings): string[] {
  const missing: string[] = []
  if (!settings.mchId.trim()) missing.push('商户号')
  if (!settings.apiCertificate.trim()) missing.push('API 证书')
  if (!settings.apiV3Key.trim()) missing.push('APIv3 密钥')
  return missing
}

export function wechatPayStatusCopy(settings: WechatPaySettings): WechatPayStatusCopy {
  const missing = missingWechatPayFields(settings)
  const ready =
    settings.configured === true || (settings.configured === undefined && missing.length === 0)
  if (ready) {
    return {
      tag: '已配置',
      alertType: 'success',
      title: '已配置。证书和 APIv3 密钥按接口返回值展示；留空保存不会用掩码覆盖服务器上的原文。',
    }
  }
  if (missing.length === 3) {
    return {
      tag: '未配置',
      alertType: 'warning',
      title: `尚未配置。填写商户号、API 证书和 APIv3 密钥后保存到服务器。${sandboxNote}`,
    }
  }
  const lack = missing.length ? `还缺${missing.join('、')}。` : '服务器仍标记为未配置完成。'
  return {
    tag: '未齐备',
    alertType: 'warning',
    title: `${lack}可以先保存已填写的内容。${sandboxNote}`,
  }
}

/**
 * 商户号始终提交，空字符串表示清空。
 * 证书和密钥留空，或与当前掩码相同，则不提交，避免把掩码写回服务器。
 */
export function buildWechatPayUpdate(
  draft: WechatPayDraft,
  loaded: WechatPaySettings,
): WechatPayUpdate {
  const update: WechatPayUpdate = { mchId: draft.mchId.trim() }
  const certificate = draft.apiCertificate.trim()
  const apiV3Key = draft.apiV3Key.trim()
  if (certificate && certificate !== loaded.apiCertificate.trim()) {
    update.apiCertificate = certificate
  }
  if (apiV3Key && apiV3Key !== loaded.apiV3Key.trim()) {
    update.apiV3Key = apiV3Key
  }
  return update
}
