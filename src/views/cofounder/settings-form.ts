import type {
  CofounderPayoutMode,
  CofounderSchedule,
  CofounderScheduleCycle,
  CofounderSettings,
  CofounderSettingsUpdate,
} from '@/api/cofounder'
import { formatDecimalFen, yuanInputToFenString } from '@/api/money'

export const cofounderSeatCapMax = 1_000_000
const activationFenMax = 2_147_483_647n
const thresholdFenMax = 9_223_372_036_854_775_807n

export interface CofounderScheduleDraft {
  cycle: CofounderScheduleCycle
  time: string
  weekday: number | null
  monthDay: number | null
  intervalDays: number | null
  anchorDate: string
}

export interface CofounderSettingsDraft {
  seatCap: number | null
  userButtonOpen: boolean
  activationYuan: string
  payoutMode: CofounderPayoutMode
  schedule: CofounderScheduleDraft
  poolThresholdYuan: string
  perPersonThresholdYuan: string
}

export function emptySettingsDraft(): CofounderSettingsDraft {
  return {
    seatCap: null,
    userButtonOpen: false,
    activationYuan: '',
    payoutMode: 'immediate',
    schedule: {
      cycle: 'daily',
      time: '',
      weekday: 1,
      monthDay: 1,
      intervalDays: 7,
      anchorDate: '',
    },
    poolThresholdYuan: '',
    perPersonThresholdYuan: '',
  }
}

export function applySettingsDraft(
  draft: CofounderSettingsDraft,
  settings: CofounderSettings,
): void {
  draft.seatCap = settings.seatCap
  draft.userButtonOpen = settings.userButtonOpen
  draft.activationYuan = formatDecimalFen(settings.activationAmountFen)
  draft.payoutMode = settings.payoutMode
  draft.schedule.cycle = settings.schedule.cycle
  draft.schedule.time = settings.schedule.time
  draft.schedule.weekday = settings.schedule.weekday
  draft.schedule.monthDay = settings.schedule.monthDay
  draft.schedule.intervalDays = settings.schedule.intervalDays
  draft.schedule.anchorDate = settings.schedule.anchorDate
  draft.poolThresholdYuan = formatDecimalFen(settings.poolThresholdFen)
  draft.perPersonThresholdYuan = formatDecimalFen(settings.perPersonThresholdFen)
}

export function settingsProblem(draft: CofounderSettingsDraft): string {
  if (!isSeatCap(draft.seatCap)) return '名额上限不正确'
  const activation = readFen(draft.activationYuan, activationFenMax)
  if (activation == null) return '开通金额不正确'
  if (!isPayoutMode(draft.payoutMode)) return '分配方式不正确'
  const scheduleProblem = scheduleIssue(draft.schedule)
  if (scheduleProblem) return scheduleProblem
  const pool = readFen(draft.poolThresholdYuan, thresholdFenMax)
  if (pool == null) return '池子总额不正确'
  const perPerson = readFen(draft.perPersonThresholdYuan, thresholdFenMax)
  if (perPerson == null) return '人均额度不正确'
  if (draft.payoutMode === 'pool_total' && pool === '0') return '按池子总额分配需要大于 0 的门槛'
  if (draft.payoutMode === 'per_person' && perPerson === '0') {
    return '按人均额度分配需要大于 0 的门槛'
  }
  return ''
}

export function settingsPayload(draft: CofounderSettingsDraft): CofounderSettingsUpdate {
  const problem = settingsProblem(draft)
  if (problem) throw new Error(problem)
  const activationAmountFen = readFen(draft.activationYuan, activationFenMax)
  const poolThresholdFen = readFen(draft.poolThresholdYuan, thresholdFenMax)
  const perPersonThresholdFen = readFen(draft.perPersonThresholdYuan, thresholdFenMax)
  const schedule = schedulePayload(draft.schedule)
  if (
    !isSeatCap(draft.seatCap) ||
    activationAmountFen == null ||
    poolThresholdFen == null ||
    perPersonThresholdFen == null ||
    !schedule
  ) {
    throw new Error(problem || '配置不正确')
  }
  return {
    seatCap: draft.seatCap,
    userButtonOpen: draft.userButtonOpen,
    activationAmountFen,
    payoutMode: draft.payoutMode,
    schedule,
    poolThresholdFen,
    perPersonThresholdFen,
  }
}

function scheduleIssue(schedule: CofounderScheduleDraft): string {
  if (!isScheduleCycle(schedule.cycle)) return '发放周期不正确'
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time.trim())) return '发放时刻不正确'
  if (!isInRange(schedule.weekday, 1, 7)) return '每周发放日不正确'
  if (!isInRange(schedule.monthDay, 1, 31)) return '每月发放日不正确'
  if (!isInRange(schedule.intervalDays, 1, 366)) return '间隔天数不正确'
  if (!isCalendarDate(schedule.anchorDate.trim())) return '起始日期不正确'
  return ''
}

function schedulePayload(schedule: CofounderScheduleDraft): CofounderSchedule | null {
  if (scheduleIssue(schedule)) return null
  if (
    !isScheduleCycle(schedule.cycle) ||
    !isInRange(schedule.weekday, 1, 7) ||
    !isInRange(schedule.monthDay, 1, 31) ||
    !isInRange(schedule.intervalDays, 1, 366)
  ) {
    return null
  }
  return {
    cycle: schedule.cycle,
    time: schedule.time.trim(),
    weekday: schedule.weekday,
    monthDay: schedule.monthDay,
    intervalDays: schedule.intervalDays,
    anchorDate: schedule.anchorDate.trim(),
  }
}

function readFen(yuan: string, max: bigint): string | null {
  const fen = yuanInputToFenString(yuan)
  if (fen == null) return null
  if (BigInt(fen) > max) return null
  return fen
}

function isSeatCap(value: number | null): value is number {
  return value != null && Number.isInteger(value) && value >= 0 && value <= cofounderSeatCapMax
}

function isInRange(value: number | null, min: number, max: number): value is number {
  return value != null && Number.isInteger(value) && value >= min && value <= max
}

function isPayoutMode(value: string): value is CofounderPayoutMode {
  return (
    value === 'immediate' ||
    value === 'periodic' ||
    value === 'pool_total' ||
    value === 'per_person'
  )
}

function isScheduleCycle(value: string): value is CofounderScheduleCycle {
  return value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'interval'
}

/** 与接口的上海业务日相同：不存在的月日不通过。 */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}
