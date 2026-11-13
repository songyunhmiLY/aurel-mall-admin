import { ApiError, http } from './http'
import { asRecord, readDecimalFen, readString } from './json'

/**
 * 阶段 4 契约。`value` 仍是非负整数字符串，单位分。
 * 保存只写入下月，本月 `thresholdFen` 不变。
 */
export interface MarketThreshold {
  month: string
  thresholdFen: string
  nextMonth: string
  nextThresholdFen: string
}

const thresholdPath = '/admin/settings/marketing-manager-market-threshold'

export async function fetchMarketThreshold(): Promise<MarketThreshold> {
  const { data } = await http.get<unknown>(thresholdPath)
  return readThreshold(data)
}

export async function saveMarketThreshold(value: string): Promise<MarketThreshold> {
  const { data } = await http.put<unknown>(thresholdPath, { value })
  return readThreshold(data)
}

function readThreshold(data: unknown): MarketThreshold {
  const record = asRecord(data)
  const month = readString(record?.month)
  const nextMonth = readString(record?.nextMonth)
  const thresholdFen = readDecimalFen(record?.thresholdFen)
  const nextThresholdFen = readDecimalFen(record?.nextThresholdFen)
  if (!record || !month || !nextMonth || thresholdFen == null || nextThresholdFen == null) {
    throw new ApiError('门槛响应无效', 500)
  }
  return { month, thresholdFen, nextMonth, nextThresholdFen }
}
