import type { CofounderContent } from '@/api/cofounder'

export const cofounderEntryCopyMax = 500
export const cofounderIntroTitleMax = 200
export const cofounderIntroBodyMax = 20_000
export const cofounderImageMax = 512
export const cofounderImageCountMax = 20

export interface CofounderContentDraft {
  entryCopy: string
  entryImageUrlsText: string
  introTitle: string
  introBody: string
  introImageUrlsText: string
}

export function emptyContentDraft(): CofounderContentDraft {
  return {
    entryCopy: '',
    entryImageUrlsText: '',
    introTitle: '',
    introBody: '',
    introImageUrlsText: '',
  }
}

export function contentDraftFrom(content: CofounderContent): CofounderContentDraft {
  return {
    entryCopy: content.entryCopy,
    entryImageUrlsText: content.entryImageUrls.join('\n'),
    introTitle: content.introTitle,
    introBody: content.introBody,
    introImageUrlsText: content.introImageUrls.join('\n'),
  }
}

export function contentProblem(draft: CofounderContentDraft): string {
  if (draft.entryCopy.trim().length > cofounderEntryCopyMax) return '入口文案过长'
  if (draft.introTitle.trim().length > cofounderIntroTitleMax) return '介绍标题过长'
  if (draft.introBody.trim().length > cofounderIntroBodyMax) return '介绍正文过长'
  const entryImages = imageProblem(draft.entryImageUrlsText)
  if (entryImages) return entryImages
  return imageProblem(draft.introImageUrlsText)
}

export function contentPayload(draft: CofounderContentDraft): CofounderContent {
  const problem = contentProblem(draft)
  if (problem) throw new Error(problem)
  return {
    entryCopy: draft.entryCopy.trim(),
    entryImageUrls: imageLines(draft.entryImageUrlsText),
    introTitle: draft.introTitle.trim(),
    introBody: draft.introBody.trim(),
    introImageUrls: imageLines(draft.introImageUrlsText),
  }
}

export function imageLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/** 只预览 http(s) 图片。其他地址仍可保存。 */
export function imagePreviewUrls(text: string): string[] {
  return imageLines(text).filter((line) => /^https?:\/\//i.test(line))
}

function imageProblem(text: string): string {
  const lines = imageLines(text)
  if (lines.length > cofounderImageCountMax) return '图片数量过多'
  if (lines.some((line) => line.length > cofounderImageMax)) return '图片地址不正确'
  return ''
}
