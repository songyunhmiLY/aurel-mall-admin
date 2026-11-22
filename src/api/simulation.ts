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
  | 'red_packet_signup'
  | 'reset'

export interface SimulationEvent {
  id: string
  at: string
  action: SimulationAction
  detail: {
    from?: string | null
    to?: string | null
    byMinutes?: number
    jobsAttempted?: boolean
    /** 本次造了多少人 / 多少单 / 任命几个角色。 */
    created?: number
    /** 推进时实际跑过 job 的时点数。 */
    steps?: number
    /** 红包报名：当天已报过的人数 / 没报上的人数。 */
    already?: number
    skipped?: number
  }
  diff: SimulationDiff | null
}

export interface SimulationOverview {
  clock: { now: string; realNow: string; source: 'real' | 'override' }
  users: { total: number; members: number }
  orders: { total: number; paid: number; paidAmountFen: number }
  roles: { cofounders: number; studios: number; opsTeam: number }
  /** 全网公排：已完成报单数、已返现的序号、尚未参与公排的创业子单数。 */
  filings: { completed: number; settledSequences: number[]; unfiledSubOrders: number }
  businessDate: string
}

/** 用户树节点上的用户信息。 */
export interface SimulationTreeUser {
  userId: string
  nickname: string
  identities: string[]
  wallets: { withdrawable: number; points: number; consumption: number }
}

export interface SimulationTreeEdge {
  userId: string
  parentId: string | null
}

export interface SimulationFilingInfo {
  filingNo: string
  sequence: number | null
  bizDate: string | null
  status: string
  amountFen: number
}

export interface SimulationUnfiledOrder {
  orderNo: string
  paidAt: string
  units: number
  amountFen: number
}

/** 演练用户树：两棵树的边 + 用户信息 + 节点提示用的报单数据。 */
export interface SimulationUsersTree {
  users: SimulationTreeUser[]
  invite: SimulationTreeEdge[]
  market: SimulationTreeEdge[]
  filings: Record<string, SimulationFilingInfo[]>
  unfiled: Record<string, SimulationUnfiledOrder[]>
}

/** 账务变动明细（三钱包流水合并，按发生时间倒序）。 */
export interface SimulationLedgerEntry {
  id: string
  occurredAt: string
  walletType: string
  direction: string
  amountFen: number
  balanceAfterFen: number
  bizType: string
  bizId: string
  sourceCode: string | null
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
  red_packet_signup: '红包报名',
  reset: '清空时间轴',
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
        // 造数数量与到期任务次数：时间轴「详情」列要靠这几个数字，漏解析就只剩「新增 个用户」。
        created: typeof detail.created === 'number' ? detail.created : undefined,
        steps: typeof detail.steps === 'number' ? detail.steps : undefined,
        already: typeof detail.already === 'number' ? detail.already : undefined,
        skipped: typeof detail.skipped === 'number' ? detail.skipped : undefined,
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
  const filingStats = asRecord(record.filings) ?? {}
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
    filings: {
      completed: num(filingStats.completed),
      settledSequences: readNumberList(filingStats.settledSequences),
      unfiledSubOrders: num(filingStats.unfiledSubOrders),
    },
    businessDate: readString(record.businessDate),
  }
}

function readNumberList(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is number => typeof item === 'number')
}

/** 演练用户树：邀请树/市场树 + 用户信息 + 提示用报单数据。 */
export async function fetchSimulationUsersTree(): Promise<SimulationUsersTree> {
  const { data } = await http.get<unknown>('/admin/simulation/users-tree')
  const record = asRecord(data) ?? {}
  const users = Array.isArray(record.users) ? record.users : []
  const filings = asRecord(record.filings) ?? {}
  const unfiled = asRecord(record.unfiled) ?? {}
  const num = (value: unknown): number => (typeof value === 'number' ? value : 0)
  const toEdges = (value: unknown): SimulationTreeEdge[] =>
    (Array.isArray(value) ? value : []).map((item) => {
      const row = asRecord(item) ?? {}
      return {
        userId: readString(row.userId),
        parentId: typeof row.parentId === 'string' ? row.parentId : null,
      }
    })
  return {
    users: users.map((item) => {
      const row = asRecord(item) ?? {}
      const wallets = asRecord(row.wallets) ?? {}
      return {
        userId: readString(row.userId),
        nickname: readString(row.nickname),
        identities: Array.isArray(row.identities)
          ? row.identities.filter((value): value is string => typeof value === 'string')
          : [],
        wallets: {
          withdrawable: num(wallets.withdrawable),
          points: num(wallets.points),
          consumption: num(wallets.consumption),
        },
      }
    }),
    invite: toEdges(record.invite),
    market: toEdges(record.market),
    filings: mapRecordList(filings, (row) => ({
      filingNo: readString(row.filingNo),
      sequence: typeof row.sequence === 'number' ? row.sequence : null,
      bizDate: typeof row.bizDate === 'string' ? row.bizDate : null,
      status: readString(row.status),
      amountFen: num(row.amountFen),
    })),
    unfiled: mapRecordList(unfiled, (row) => ({
      orderNo: readString(row.orderNo),
      paidAt: readString(row.paidAt),
      units: num(row.units),
      amountFen: num(row.amountFen),
    })),
  }
}

function mapRecordList<T>(input: Record<string, unknown>, map: (row: Record<string, unknown>) => T): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const [key, value] of Object.entries(input)) {
    const rows = Array.isArray(value) ? value : []
    result[key] = rows.map((item) => map(asRecord(item) ?? {}))
  }
  return result
}

/** 节点点击后的账务变动明细。 */
export async function fetchSimulationUserLedger(
  userId: string,
  limit = 100,
): Promise<SimulationLedgerEntry[]> {
  const { data } = await http.get<unknown>(`/admin/simulation/users/${userId}/ledger`, {
    params: { limit },
  })
  const record = asRecord(data) ?? {}
  const rows = Array.isArray(record.entries) ? record.entries : []
  const num = (value: unknown): number => (typeof value === 'number' ? value : 0)
  return rows.map((item) => {
    const row = asRecord(item) ?? {}
    return {
      id: readString(row.id),
      occurredAt: readString(row.occurredAt),
      walletType: readString(row.walletType),
      direction: readString(row.direction),
      amountFen: num(row.amountFen),
      balanceAfterFen: num(row.balanceAfterFen),
      bizType: readString(row.bizType),
      bizId: readString(row.bizId),
      sourceCode: typeof row.sourceCode === 'string' ? row.sourceCode : null,
    }
  })
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

export interface SimulatedRedPacketSignupResult {
  userId: string
  nickname: string
  /** signed=本次报名成功；already=当天已报过；skipped=没报上。 */
  outcome: 'signed' | 'already' | 'skipped'
  error: string | null
}

/** 红包报名演示：userIds 为空时全部在籍会员报名，报名时间取当前仿真时刻。 */
export async function simulationRedPacketSignup(input: {
  userIds?: string[]
} = {}): Promise<{
  total: number
  signed: number
  alreadySigned: number
  skipped: number
  results: SimulatedRedPacketSignupResult[]
}> {
  const { data } = await http.post<unknown>('/admin/simulation/red-packet-signup', input)
  const record = asRecord(data) ?? {}
  const rows = Array.isArray(record.results) ? record.results : []
  const num = (value: unknown): number => (typeof value === 'number' ? value : 0)
  return {
    total: num(record.total),
    signed: num(record.signed),
    alreadySigned: num(record.alreadySigned),
    skipped: num(record.skipped),
    results: rows.map((item) => {
      const row = asRecord(item) ?? {}
      const outcome = readString(row.outcome)
      return {
        userId: readString(row.userId),
        nickname: readString(row.nickname),
        outcome:
          outcome === 'already' ? 'already' : outcome === 'skipped' ? 'skipped' : 'signed',
        error: typeof row.error === 'string' ? row.error : null,
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

/** 清空业务数据：订单、钱包、树、报单、分红、角色，保留商品与系统配置。时钟一并回到真实时间。 */
export async function resetSimulationData(): Promise<{
  removedUsers: number
  status: SimulationStatus
}> {
  const { data } = await http.post<unknown>('/admin/simulation/reset-data')
  const record = asRecord(data) ?? {}
  return {
    removedUsers: typeof record.removedUsers === 'number' ? record.removedUsers : 0,
    status: toStatus(record.status),
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
