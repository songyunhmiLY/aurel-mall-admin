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

export type SimulationAction =
  | 'set_clock'
  | 'clear_clock'
  | 'step'
  | 'advance'
  | 'register'
  | 'purchase'
  | 'role'
  | 'seed_tree'
  | 'reset'
  | 'reset_data'

export interface SimulationEvent {
  id: string
  at: string
  action: SimulationAction
  detail: {
    from?: string | null
    to?: string | null
    byMinutes?: number
    jobsAttempted?: boolean
    created?: number
    steps?: number
  }
  diff: SimulationDiff | null
}

export interface SimulationOverview {
  clock: { now: string; realNow: string; source: 'real' | 'override' }
  users: { total: number; members: number }
  orders: { total: number; paid: number; paidAmountFen: number }
  roles: { cofounders: number; studios: number; opsTeam: number }
  businessDate: string
}

export interface SimulatedPurchaseResult {
  userId: string
  nickname: string
  ok: boolean
  orderId: string | null
  orderNo: string | null
  quantity: number
  payAmountFen: number
  status: string | null
  filed: boolean
  error: string | null
}

export interface SimulatedRoleResult {
  userId: string
  nickname: string
  role: string
  ok: boolean
  payNo: string | null
  error: string | null
}

const ACTION_LABELS: Record<SimulationAction, string> = {
  set_clock: '设置时钟',
  clear_clock: '清除覆盖',
  step: '单步推进',
  advance: '逐日推进',
  register: '批量注册',
  purchase: '批量购买',
  role: '任命角色',
  seed_tree: '生成市场树',
  reset: '清空时间轴',
  reset_data: '重置业务数据',
}

export function simulationActionLabel(action: string): string {
  return ACTION_LABELS[action as SimulationAction] ?? action
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

export async function fetchSimulationOverview(): Promise<SimulationOverview> {
  const { data } = await http.get<unknown>('/admin/simulation/overview')
  const record = asRecord(data) ?? {}
  const clock = asRecord(record.clock) ?? {}
  const users = asRecord(record.users) ?? {}
  const orders = asRecord(record.orders) ?? {}
  const roles = asRecord(record.roles) ?? {}
  const num = (value: unknown): number => (typeof value === 'number' ? value : 0)
  return {
    clock: {
      now: readString(clock.now),
      realNow: readString(clock.realNow),
      source: readString(clock.source) === 'override' ? 'override' : 'real',
    },
    users: { total: num(users.total), members: num(users.members) },
    orders: {
      total: num(orders.total),
      paid: num(orders.paid),
      paidAmountFen: num(orders.paidAmountFen),
    },
    roles: {
      cofounders: num(roles.cofounders),
      studios: num(roles.studios),
      opsTeam: num(roles.opsTeam),
    },
    businessDate: readString(record.businessDate),
  }
}

/** 逐业务日推进：跨日公排、跨月核算按各自业务日执行。 */
export async function simulationAdvance(to: string): Promise<{
  status: SimulationStatus
  steps: number
}> {
  const { data } = await http.post<unknown>('/admin/simulation/advance', { to })
  const record = asRecord(data) ?? {}
  return {
    status: toStatus(record.status),
    steps: typeof record.steps === 'number' ? record.steps : 0,
  }
}

export async function simulationRegister(input: {
  count: number
  inviterUserId?: string
}): Promise<{
  created: { id: string; nickname: string; invitePath: string }[]
  inviterId: string
  inviterPath: string
}> {
  const { data } = await http.post<unknown>('/admin/simulation/register', input)
  const record = asRecord(data) ?? {}
  const rows = Array.isArray(record.created) ? record.created : []
  return {
    created: rows.map((item) => {
      const row = asRecord(item) ?? {}
      return {
        id: readString(row.id),
        nickname: readString(row.nickname),
        invitePath: readString(row.invitePath),
      }
    }),
    inviterId: readString(record.inviterId),
    inviterPath: readString(record.inviterPath),
  }
}

export interface SimulatedTreeNode {
  userId: string
  nickname: string
  treePath: string
  parentPath: string
  slot: number
  layer: number
  invitedBy: string
  orderNo: string | null
  ok: boolean
}

/** 生成演示市场树：默认清空后重建 3+9+27 三层满树。 */
export async function simulationSeedTree(input: {
  layers?: number[]
  reset?: boolean
  productId?: string
}): Promise<{
  reset: boolean
  layers: number[]
  product: { id: string; name: string }
  created: SimulatedTreeNode[]
}> {
  const { data } = await http.post<unknown>('/admin/simulation/seed-tree', input)
  const record = asRecord(data) ?? {}
  const product = asRecord(record.product) ?? {}
  const rows = Array.isArray(record.created) ? record.created : []
  return {
    reset: record.reset === true,
    layers: Array.isArray(record.layers)
      ? record.layers.filter((value): value is number => typeof value === 'number')
      : [],
    product: { id: readString(product.id), name: readString(product.name) },
    created: rows.map((item) => {
      const row = asRecord(item) ?? {}
      return {
        userId: readString(row.userId),
        nickname: readString(row.nickname),
        treePath: readString(row.treePath),
        parentPath: readString(row.parentPath),
        slot: typeof row.slot === 'number' ? row.slot : 0,
        layer: typeof row.layer === 'number' ? row.layer : 0,
        invitedBy: readString(row.invitedBy),
        orderNo: typeof row.orderNo === 'string' ? row.orderNo : null,
        ok: row.ok === true,
      }
    }),
  }
}

export async function simulationPurchase(input: {
  zone?: 'startup' | 'mall'
  userIds?: string[]
  count?: number
  productId?: string
  quantityMin?: number
  quantityMax?: number
}): Promise<{
  zone: 'startup' | 'mall'
  product: { id: string; name: string; priceFen: number }
  results: SimulatedPurchaseResult[]
}> {
  const { data } = await http.post<unknown>('/admin/simulation/purchase', input)
  const record = asRecord(data) ?? {}
  const product = asRecord(record.product) ?? {}
  const rows = Array.isArray(record.results) ? record.results : []
  return {
    zone: readString(record.zone) === 'mall' ? 'mall' : 'startup',
    product: {
      id: readString(product.id),
      name: readString(product.name),
      priceFen: typeof product.priceFen === 'number' ? product.priceFen : 0,
    },
    results: rows.map((item) => {
      const row = asRecord(item) ?? {}
      return {
        userId: readString(row.userId),
        nickname: readString(row.nickname),
        ok: row.ok === true,
        orderId: typeof row.orderId === 'string' ? row.orderId : null,
        orderNo: typeof row.orderNo === 'string' ? row.orderNo : null,
        quantity: typeof row.quantity === 'number' ? row.quantity : 0,
        payAmountFen: typeof row.payAmountFen === 'number' ? row.payAmountFen : 0,
        status: typeof row.status === 'string' ? row.status : null,
        filed: row.filed === true,
        error: typeof row.error === 'string' ? row.error : null,
      }
    }),
  }
}

export async function simulationRole(
  userId: string,
  role: 'cofounder' | 'studio' | 'ops_team',
): Promise<SimulatedRoleResult> {
  const { data } = await http.post<unknown>('/admin/simulation/role', { userId, role })
  const row = asRecord(data) ?? {}
  return {
    userId: readString(row.userId),
    nickname: readString(row.nickname),
    role: readString(row.role),
    ok: row.ok === true,
    payNo: typeof row.payNo === 'string' ? row.payNo : null,
    error: typeof row.error === 'string' ? row.error : null,
  }
}

/** 清空业务数据：订单、钱包、树、报单、分红、角色，保留商品与系统配置。 */
export async function resetSimulationData(): Promise<{ removedUsers: number }> {
  const { data } = await http.post<unknown>('/admin/simulation/reset-data')
  const record = asRecord(data) ?? {}
  return {
    removedUsers: typeof record.removedUsers === 'number' ? record.removedUsers : 0,
  }
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
