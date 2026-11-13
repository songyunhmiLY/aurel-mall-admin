import { studioExternalNameMax, type StudioSettingsUpdate } from '@/api/studio'

export interface StudioNameDraft {
  externalName: string
}

export function studioNameProblem(draft: StudioNameDraft): string {
  const name = draft.externalName.trim()
  if (name.length < 1 || name.length > studioExternalNameMax) return '名称不正确'
  return ''
}

/** 只提交对外名称。 */
export function studioNamePayload(draft: StudioNameDraft): StudioSettingsUpdate {
  return { externalName: draft.externalName.trim() }
}
