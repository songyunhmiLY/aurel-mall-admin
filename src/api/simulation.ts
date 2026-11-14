import { http } from './http'
import { asRecord, readString } from './json'

/** 时间仿真台。后端在 SIMULATION_ENABLED=false 时对全部接口返回 403。 */

export interface SimulationStatus {
  clock: {
    allowed: boolean
    source: 'real' | 'override'
    now: string
    override: string | null
  }
  timelineCount: number
}

export interface SimulationDiff {
  wallet: {
    points: number
    withdrawable: number
    consumption: number
    withdrawableFrozen: number
    consumptionFrozen: number
    pointsFrozen: number
  }
  cash: { inflow: number; outflow: number }
  counts: { orders: number; pendingWithdrawals: number; pendingCompensations: number }
}

export interface SimulationEvent {
  id: string
  at: string
  action: 'set_clock' | 'clear_clock' | 'step' | 'reset'
  detail: {
    from?: string | null
    to?: string | null
    byMinutes?: number
    jobsAttempted?: boolean
  }
  diff: SimulationDiff | null
}

const ACTION_LABELS: Record<SimulationEvent['action'], string> = {
  set_clock: '设置时钟',
  clear_clock: '清除覆盖',
  step: '单步推进',
  reset: '清空时间轴',
}

export function simulationActionLabel(action: string): string {
  return ACTION_LABELS[action as SimulationEvent['action']] ?? action
}

export async function fetchSimulationStatus(): Promise<SimulationStatus> {
  const { data } = await http.get<unknown>('/admin/simulation/status')
  const record = asRecord(data) ?? {}
  const clock = asRecord(record.clock) ?? {}
  return {
    clock: {
      allowed: clock.allowed === true,
      source: readString(clock.source) === 'override' ? 'override' : 'real',
      now: readString(clock.now),
      override: typeof clock.override === 'string' ? clock.override : null,
    },
    timelineCount: typeof record.timelineCount === 'number' ? record.timelineCount : 0,
  }
}

export async function fetchSimulationTimeline(): Promise<SimulationEvent[]> {
  const { data } = await http.get<unknown>('/admin/simulation/timeline')
  const record = asRecord(data) ?? {}
  if (!Array.isArray(record.events)) {
    return []
  }
  return record.events.map((item): SimulationEvent => {
    const row = asRecord(item) ?? {}
    const detail = asRecord(row.detail) ?? {}
    return {
      id: readString(row.id),
      at: readString(row.at),
      action: (readString(row.action) as SimulationEvent['action']) ?? 'set_clock',
      detail: {
        from: typeof detail.from === 'string' ? detail.from : null,
        to: typeof detail.to === 'string' ? detail.to : null,
        byMinutes: typeof detail.byMinutes === 'number' ? detail.byMinutes : undefined,
        jobsAttempted: detail.jobsAttempted === true,
      },
      diff: readDiff(row.diff),
    }
  })
}

function readDiff(value: unknown): SimulationDiff | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }
  const wallet = asRecord(record.wallet) ?? {}
  const cash = asRecord(record.cash) ?? {}
  const counts = asRecord(record.counts) ?? {}
  const num = (input: unknown): number => (typeof input === 'number' ? input : 0)
  return {
    wallet: {
      points: num(wallet.points),
      withdrawable: num(wallet.withdrawable),
      consumption: num(wallet.consumption),
      withdrawableFrozen: num(wallet.withdrawableFrozen),
      consumptionFrozen: num(wallet.consumptionFrozen),
      pointsFrozen: num(wallet.pointsFrozen),
    },
    cash: { inflow: num(cash.inflow), outflow: num(cash.outflow) },
    counts: {
      orders: num(counts.orders),
      pendingWithdrawals: num(counts.pendingWithdrawals),
      pendingCompensations: num(counts.pendingCompensations),
    },
  }
}

export async function setSimulationClock(iso: string): Promise<SimulationStatus> {
  const { data } = await http.put<unknown>('/admin/simulation/clock', { iso })
  return toStatus(data)
}

export async function clearSimulationClock(): Promise<SimulationStatus> {
  const { data } = await http.delete<unknown>('/admin/simulation/clock')
  return toStatus(data)
}

export async function simulationStep(input: {
  to?: string
  byMinutes?: number
}): Promise<{ status: SimulationStatus; event: SimulationEvent | null }> {
  const { data } = await http.post<unknown>('/admin/simulation/step', input)
  const record = asRecord(data) ?? {}
  return { status: toStatus(record.status), event: null }
}

export async function resetSimulationTimeline(): Promise<SimulationStatus> {
  const { data } = await http.post<unknown>('/admin/simulation/reset')
  return toStatus(data)
}

function toStatus(value: unknown): SimulationStatus {
  const record = asRecord(value) ?? {}
  const clock = asRecord(record.clock) ?? {}
  return {
    clock: {
      allowed: clock.allowed === true,
      source: readString(clock.source) === 'override' ? 'override' : 'real',
      now: readString(clock.now),
      override: typeof clock.override === 'string' ? clock.override : null,
    },
    timelineCount: typeof record.timelineCount === 'number' ? record.timelineCount : 0,
  }
}
