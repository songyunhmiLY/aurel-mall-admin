import { ApiError, http } from './http'
import { asRecord, readString } from './json'

export interface WithdrawalDisplayName {
  sourceCode: string
  displayName: string
}

const displayNamesPath = '/admin/settings/withdrawal-display-names'

export async function fetchWithdrawalDisplayNames(): Promise<WithdrawalDisplayName[]> {
  const { data } = await http.get<unknown>(displayNamesPath)
  return readItems(data)
}

export async function saveWithdrawalDisplayNames(
  items: WithdrawalDisplayName[],
): Promise<WithdrawalDisplayName[]> {
  const { data } = await http.put<unknown>(displayNamesPath, {
    items: items.map((item) => ({
      sourceCode: item.sourceCode,
      displayName: item.displayName,
    })),
  })
  return readItems(data)
}

function readItems(data: unknown): WithdrawalDisplayName[] {
  const record = asRecord(data)
  const items = record?.items
  if (!record || !Array.isArray(items)) throw new ApiError('提现分类响应无效', 500)
  return items.map((item) => readItem(item))
}

function readItem(data: unknown): WithdrawalDisplayName {
  const record = asRecord(data)
  const sourceCode = readString(record?.sourceCode).trim()
  if (!record || !sourceCode) throw new ApiError('提现分类响应无效', 500)
  return {
    sourceCode,
    displayName: readString(record.displayName),
  }
}
