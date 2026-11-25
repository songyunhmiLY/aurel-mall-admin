/** 入口文案是富文本 HTML，与后端 `WELFARE_ENTRY_COPY_MAX` 一致。 */
export const welfareEntryCopyMax = 20_000
export const welfareEntryImageMax = 512

export interface WelfareEntryDraft {
  copy: string
  imageUrl: string
}

export interface WelfareEntryPayload {
  copy: string
  imageUrl: string
}

export function welfareEntryProblem(draft: WelfareEntryDraft): string {
  if (draft.copy.trim().length > welfareEntryCopyMax) return '入口文案过长'
  if (draft.imageUrl.trim().length > welfareEntryImageMax) return '入口图片地址过长'
  return ''
}

/** 只提交文案和图片地址。空图片地址表示去掉图片。 */
export function welfareEntryPayload(draft: WelfareEntryDraft): WelfareEntryPayload {
  return {
    copy: draft.copy.trim(),
    imageUrl: draft.imageUrl.trim(),
  }
}

/** 仅用于预览 http(s) 图片。其他地址仍可保存，只是这里不加载。 */
export function welfareEntryPreviewUrl(imageUrl: string): string {
  const value = imageUrl.trim()
  if (!/^https?:\/\//i.test(value)) return ''
  return value
}
