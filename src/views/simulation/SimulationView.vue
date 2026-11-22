<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import { fetchProducts, type Product } from '@/api/products'
import {
  fetchSimulationOverview,
  fetchSimulationStatus,
  fetchSimulationTimeline,
  fetchSimulationUserLedger,
  fetchSimulationUsersTree,
  resetSimulationData,
  resetSimulationTimeline,
  setSimulationClock,
  simulationActionLabel,
  simulationAdvance,
  simulationPurchase,
  simulationRedPacketSignup,
  simulationRegister,
  simulationRole,
  type SimulatedPurchaseResult,
  type SimulatedRedPacketSignupResult,
  type SimulationEvent,
  type SimulationFilingInfo,
  type SimulationLedgerEntry,
  type SimulationOverview,
  type SimulationStatus,
  type SimulationTreeEdge,
  type SimulationTreeUser,
  type SimulationUnfiledOrder,
} from '@/api/simulation'

const loading = ref(true)
const busy = ref(false)
const loadError = ref('')
const actionError = ref('')
const status = ref<SimulationStatus | null>(null)
const overview = ref<SimulationOverview | null>(null)
const events = ref<SimulationEvent[]>([])

const advanceTarget = ref<Date | null>(null)

const registerCount = ref(20)
const registerInviter = ref('')

const redPacketUserIds = ref('')
const redPacketResults = ref<SimulatedRedPacketSignupResult[]>([])

const buyUserIds = ref('')
const buyCount = ref<number | undefined>(undefined)
const buyProductId = ref('')
const buyMin = ref(1)
const buyMax = ref(1)
const buyResults = ref<SimulatedPurchaseResult[]>([])

const mallUserIds = ref('')
const mallProductId = ref('')
const mallMin = ref(1)
const mallMax = ref(1)
const mallResults = ref<SimulatedPurchaseResult[]>([])
const mallProducts = ref<Product[]>([])
const mallProductsLoading = ref(false)
const mallProductsError = ref('')

/** 商品列表接口单页上限 100，最多翻 5 页（500 件）足够演练使用。 */
const MALL_PRODUCT_PAGE_SIZE = 100
const MALL_PRODUCT_MAX_PAGES = 5

const roleUserId = ref('')
const roleName = ref<'cofounder' | 'studio' | 'ops_team'>('cofounder')
const roleMessage = ref('')

/* ---------- 用户树：邀请树 / 市场树 ---------- */

interface UserTreeNode {
  key: string
  user: SimulationTreeUser | null
  label: string
  filings: SimulationFilingInfo[]
  unfiled: SimulationUnfiledOrder[]
  children: UserTreeNode[]
}

const treeKind = ref<'invite' | 'market'>('invite')
const treeUsers = ref<SimulationTreeUser[]>([])
const inviteEdges = ref<SimulationTreeEdge[]>([])
const marketEdges = ref<SimulationTreeEdge[]>([])
const treeFilings = ref<Record<string, SimulationFilingInfo[]>>({})
const treeUnfiled = ref<Record<string, SimulationUnfiledOrder[]>>({})
const treeLoading = ref(false)
const treeError = ref('')
const treeLoaded = ref(false)

const detailVisible = ref(false)
const detailUser = ref<SimulationTreeUser | null>(null)
const detailFilings = ref<SimulationFilingInfo[]>([])
const detailUnfiled = ref<SimulationUnfiledOrder[]>([])
const detailEntries = ref<SimulationLedgerEntry[]>([])
const detailLoading = ref(false)
const detailError = ref('')

const IDENTITY_LABELS: Record<string, string> = {
  normal: '普通',
  member: '会员',
  cofounder: '联创',
  studio: '工作室',
  ops_team: '运营团队',
}

const WALLET_LABELS: Record<string, string> = {
  withdrawable: '可提现',
  points: '积分',
  consumption: '消费金',
}

const LEDGER_BIZ_LABELS: Record<string, string> = {
  order_payment: '订单支付',
  mall_refund: '商城退款',
  filing_settlement: '幸运返还',
  withdrawal_payout: '提现打款',
  consumption_transfer: '消费金划转',
  startup_sales: '创业销售奖励',
  startup_points: '创业积分奖励',
  mall_sales: '商城销售奖励',
  mall_points: '商城积分奖励',
  position_dividend: '职位分红',
  red_packet: '红包分红',
}

function identityLabel(value: string): string {
  return IDENTITY_LABELS[value] ?? value
}

function identityTagType(value: string): 'success' | 'warning' | 'info' | 'danger' {
  if (value === 'member') return 'success'
  if (value === 'cofounder') return 'danger'
  if (value === 'studio' || value === 'ops_team') return 'warning'
  return 'info'
}

function walletLabel(value: string): string {
  return WALLET_LABELS[value] ?? value
}

function ledgerBizLabel(value: string): string {
  return LEDGER_BIZ_LABELS[value] ?? value
}

/** 分转成 ¥x.xx，节点上空间小，不带「元」。 */
function money(value: number): string {
  return `¥${(value / 100).toFixed(2)}`
}

const overrideActive = computed(() => status.value?.clock.source === 'override')

/** 仿真起点：有覆盖值沿用上次仿真的时刻，否则取当前业务时间（即真实时间）。 */
const clockStartLabel = computed(() => {
  const iso = status.value?.clock.override ?? status.value?.clock.now
  return iso ? formatDateTime(iso) : '-'
})

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

onMounted(() => {
  void load()
  void loadMallProducts()
  // 用户树独立成卡、始终可见，进页面就拉一次；造数动作在 run() 里自动刷新。
  void reloadUsersTree()
})

/** 商城商品下拉：只列已上架商品，按管理端排序分页拉取（接口单页上限 100）。 */
async function loadMallProducts(): Promise<void> {
  mallProductsLoading.value = true
  mallProductsError.value = ''
  try {
    const collected: Product[] = []
    for (let page = 1; page <= MALL_PRODUCT_MAX_PAGES; page += 1) {
      const chunk = await fetchProducts({
        zone: 'mall',
        status: 'on',
        page,
        pageSize: MALL_PRODUCT_PAGE_SIZE,
      })
      collected.push(...chunk.items)
      if (chunk.items.length < MALL_PRODUCT_PAGE_SIZE || collected.length >= chunk.total) {
        break
      }
    }
    mallProducts.value = collected
    if (collected.length > 0 && !mallProductId.value) {
      mallProductId.value = collected[0]!.id
    }
  } catch (error) {
    mallProductsError.value = apiErrorMessage(error, '读取会员商城商品失败')
  } finally {
    mallProductsLoading.value = false
  }
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const [nextStatus, timeline, nextOverview] = await Promise.all([
      fetchSimulationStatus(),
      fetchSimulationTimeline(),
      fetchSimulationOverview(),
    ])
    status.value = nextStatus
    events.value = timeline
    overview.value = nextOverview
  } catch (error) {
    loadError.value = apiErrorMessage(
      error,
      '读取仿真状态失败（后端可能未开启 SIMULATION_ENABLED）',
    )
  } finally {
    loading.value = false
  }
}

async function run(action: () => Promise<void>): Promise<void> {
  if (busy.value) return
  busy.value = true
  actionError.value = ''
  try {
    await action()
    // 造数动作会改变树结构、钱包余额与报单，门面数据与节点详情都要跟着刷新。
    if (treeLoaded.value) {
      await reloadUsersTree()
    }
  } catch (error) {
    actionError.value = apiErrorMessage(error, '操作失败')
  } finally {
    busy.value = false
  }
}

async function reloadTimeline(): Promise<void> {
  try {
    const [timeline, nextOverview] = await Promise.all([
      fetchSimulationTimeline(),
      fetchSimulationOverview(),
    ])
    events.value = timeline
    overview.value = nextOverview
    if (status.value) {
      status.value.timelineCount = timeline.length
    }
  } catch {
    // 时间轴读取失败不阻塞主流程，下一次操作会再试。
  }
}

function applyClock(next: SimulationStatus): void {
  status.value = next
}

/* ---------- 用户树数据 ---------- */

/** 两棵树都按 parentId 组树；市场树里未入座的用户单列一组，避免“注册了却看不到”。 */
const treeData = computed<UserTreeNode[]>(() => {
  const usersById = new Map(treeUsers.value.map((item) => [item.userId, item]))
  const edges = treeKind.value === 'invite' ? inviteEdges.value : marketEdges.value
  const edgeUserIds = new Set(edges.map((edge) => edge.userId))
  const childrenByParent = new Map<string, string[]>()
  const roots: string[] = []
  for (const edge of edges) {
    if (edge.parentId === null || edge.parentId === edge.userId || !usersById.has(edge.parentId)) {
      roots.push(edge.userId)
      continue
    }
    const list = childrenByParent.get(edge.parentId) ?? []
    list.push(edge.userId)
    childrenByParent.set(edge.parentId, list)
  }
  const build = (userId: string, visiting: Set<string>, depth: number): UserTreeNode => {
    const user = usersById.get(userId) ?? null
    const blocked = depth >= 64 || visiting.has(userId)
    const childIds = blocked ? [] : (childrenByParent.get(userId) ?? [])
    const nextVisiting = new Set(visiting)
    nextVisiting.add(userId)
    return {
      key: `${treeKind.value}-${userId}`,
      user,
      label: user?.nickname ?? `#${userId}`,
      filings: treeFilings.value[userId] ?? [],
      unfiled: treeUnfiled.value[userId] ?? [],
      children: childIds.map((childId) => build(childId, nextVisiting, depth + 1)),
    }
  }
  const nodes = roots.map((userId) => build(userId, new Set(), 0))
  const orphans = treeUsers.value
    .filter((item) => !edgeUserIds.has(item.userId))
    .map((item) => build(item.userId, new Set(), 0))
  if (orphans.length > 0) {
    nodes.push({
      key: `${treeKind.value}-orphans`,
      user: null,
      label:
        treeKind.value === 'market'
          ? `未入座（${orphans.length} 人，尚未进入市场树）`
          : `未挂靠（${orphans.length} 人，没有邀请关系）`,
      filings: [],
      unfiled: [],
      children: orphans,
    })
  }
  return nodes
})

async function reloadUsersTree(): Promise<void> {
  treeLoading.value = true
  treeError.value = ''
  try {
    const tree = await fetchSimulationUsersTree()
    treeUsers.value = tree.users
    inviteEdges.value = tree.invite
    marketEdges.value = tree.market
    treeFilings.value = tree.filings
    treeUnfiled.value = tree.unfiled
    treeLoaded.value = true
    const openUserId = detailVisible.value ? detailUser.value?.userId : undefined
    if (openUserId) {
      const refreshed = tree.users.find((item) => item.userId === openUserId)
      if (refreshed) {
        detailUser.value = refreshed
        detailFilings.value = tree.filings[refreshed.userId] ?? []
        detailUnfiled.value = tree.unfiled[refreshed.userId] ?? []
      }
      await loadDetailEntries(openUserId)
    }
  } catch (error) {
    treeError.value = apiErrorMessage(error, '读取用户树失败')
  } finally {
    treeLoading.value = false
  }
}

async function loadDetailEntries(userId: string): Promise<void> {
  detailLoading.value = true
  detailError.value = ''
  try {
    detailEntries.value = await fetchSimulationUserLedger(userId)
  } catch (error) {
    detailError.value = apiErrorMessage(error, '读取账务明细失败')
  } finally {
    detailLoading.value = false
  }
}

function onTreeNodeClick(node: UserTreeNode): void {
  if (!node.user) return
  detailUser.value = node.user
  detailFilings.value = node.filings
  detailUnfiled.value = node.unfiled
  detailEntries.value = []
  detailVisible.value = true
  void loadDetailEntries(node.user.userId)
}

/** 快捷步长：点一次在编辑框时间上叠加，编辑框为空则以仿真起点为基准。 */
const ADVANCE_SHORTCUTS = [
  { label: '1 小时', minutes: 60 },
  { label: '1 天', minutes: 1440 },
] as const

/** 编辑框已有时间就往后叠加，没有就从仿真起点（覆盖值或当前业务时间）起算。 */
function bumpAdvanceTarget(minutes: number): void {
  const baseIso = advanceTarget.value?.toISOString() ?? status.value?.clock.override ?? status.value?.clock.now
  if (!baseIso) {
    actionError.value = '尚未取到仿真起点，请刷新页面后重试'
    return
  }
  const baseMs = Date.parse(baseIso)
  if (Number.isNaN(baseMs)) {
    actionError.value = '仿真起点时间无效，请刷新页面后重试'
    return
  }
  actionError.value = ''
  advanceTarget.value = new Date(baseMs + minutes * 60_000)
}

/**
 * 逐业务日推进：跨日公排、跨月核算按各自业务日执行。
 *
 * 起点自动确定：已有仿真记录时后端带覆盖值，直接往后推；从未仿真过则用当前
 * 业务时间（即真实时间）先落一个起点，再推进，避免把起点之前的空档算进来。
 */
function onAdvance(): void {
  if (!advanceTarget.value) {
    actionError.value = '请选择要推进到的时刻'
    return
  }
  const target = advanceTarget.value as Date
  const startIso = status.value?.clock.override ?? status.value?.clock.now
  if (startIso && target.getTime() <= Date.parse(startIso)) {
    actionError.value = '目标时刻必须晚于仿真起点'
    return
  }
  void run(async () => {
    if (!status.value?.clock.override) {
      const start = status.value?.clock.now ?? new Date().toISOString()
      applyClock(await setSimulationClock(start))
    }
    const result = await simulationAdvance(target.toISOString())
    applyClock(result.status)
    await reloadTimeline()
    ElMessage.success(`已推进到 ${target.toLocaleString()}，期间执行了 ${result.steps} 次到期任务`)
  })
}

function onRegister(): void {
  void run(async () => {
    const inviter = registerInviter.value.trim()
    const result = await simulationRegister({
      count: registerCount.value,
      ...(inviter ? { inviterUserId: inviter } : {}),
    })
    await reloadTimeline()
    ElMessage.success(
      `已注册 ${result.created.length} 人（昵称 ${result.created[0]?.nickname ?? ''} 等，挂在 ${result.inviterPath} 下）`,
    )
  })
}

/**
 * 红包报名演示：走真实报名接口（会员且红包额度未领满才报得上），报名时间就是
 * 当前仿真时刻。名单留空 = 对全部在籍会员一键报名。
 */
function onRedPacketSignup(all: boolean): void {
  const ids = parseUserIds(redPacketUserIds.value)
  if (!all && ids.length === 0) {
    actionError.value = '请填写要报名的用户编号，或点「全部会员报名」'
    return
  }
  void run(async () => {
    const result = await simulationRedPacketSignup(all ? {} : { userIds: ids })
    redPacketResults.value = result.results
    await reloadTimeline()
    ElMessage.success(
      `报名成功 ${result.signed} 人，已报过 ${result.alreadySigned} 人，未报上 ${result.skipped} 人`,
    )
  })
}

/** 逗号（中英文）或空白分隔的用户编号列表。 */
function parseUserIds(text: string): string[] {
  return text
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function onPurchase(): void {
  void run(async () => {
    const ids = parseUserIds(buyUserIds.value)
    const productId = buyProductId.value.trim()
    const result = await simulationPurchase({
      ...(ids.length > 0 ? { userIds: ids } : { count: buyCount.value ?? 1 }),
      ...(productId ? { productId } : {}),
      quantityMin: buyMin.value,
      quantityMax: buyMax.value,
    })
    buyResults.value = result.results
    await reloadTimeline()
    const ok = result.results.filter((item) => item.ok).length
    ElMessage.success(`已用「${result.product.name}」下了 ${ok} 单`)
  })
}

function onPurchaseMall(): void {
  const ids = parseUserIds(mallUserIds.value)
  if (ids.length === 0) {
    actionError.value = '请填写要下单的会员编号（逗号或换行分隔）'
    return
  }
  if (!mallProductId.value) {
    actionError.value = '请选择会员商城商品'
    return
  }
  void run(async () => {
    const result = await simulationPurchase({
      zone: 'mall',
      userIds: ids,
      productId: mallProductId.value,
      quantityMin: mallMin.value,
      quantityMax: mallMax.value,
    })
    mallResults.value = result.results
    await reloadTimeline()
    const ok = result.results.filter((item) => item.ok).length
    const failed = result.results.length - ok
    ElMessage.success(
      failed > 0
        ? `已用「${result.product.name}」下了 ${ok} 单，${failed} 单失败`
        : `已用「${result.product.name}」下了 ${ok} 单`,
    )
  })
}

function onRole(): void {
  const userId = roleUserId.value.trim()
  if (!/^\d+$/.test(userId)) {
    actionError.value = '请填写会员编号（数字）'
    return
  }
  void run(async () => {
    const result = await simulationRole(userId, roleName.value)
    roleMessage.value = result.ok
      ? `${result.nickname || result.userId} 已成为 ${roleLabel(result.role)}${
          result.payNo ? `，付款单号 ${result.payNo}` : ''
        }`
      : (result.error ?? '任命失败')
    await reloadTimeline()
    if (result.ok) ElMessage.success(roleMessage.value)
  })
}

function onResetTimeline(): void {
  void ElMessageBox.confirm('清空时间轴不会影响业务数据，确定继续？', '清空时间轴', {
    confirmButtonText: '清空',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      void run(async () => {
        applyClock(await resetSimulationTimeline())
        await reloadTimeline()
        ElMessage.success('时间轴已清空')
      })
    })
    .catch(() => {})
}

function onResetData(): void {
  void ElMessageBox.prompt(
    '会清空订单、支付、钱包、市场树、报单、分红、角色与全部会员（保留根账户），并清空时间轴。商品与系统配置不受影响。请输入「重置」确认。',
    '重置业务数据',
    {
      confirmButtonText: '重置',
      cancelButtonText: '取消',
      type: 'error',
      inputPlaceholder: '输入 重置',
      inputValidator: (value) => value === '重置' || '请输入「重置」',
    },
  )
    .then(() => {
      void run(async () => {
        const result = await resetSimulationData()
        applyClock(result.status)
        buyResults.value = []
        redPacketResults.value = []
        advanceTarget.value = null
        actionError.value = ''
        detailVisible.value = false
        await reloadTimeline()
        ElMessage.success(
          `已清空业务数据，删除 ${result.removedUsers} 个会员；时间轴已清空，仿真起点回到当前时间`,
        )
      })
    })
    .catch(() => {})
}

function roleLabel(role: string): string {
  if (role === 'cofounder') return '联合创始人'
  if (role === 'studio') return '工作室'
  if (role === 'ops_team') return '运营中心'
  return role
}

function fmt(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

function fen(value: number): string {
  return `${fmt(value)} 分（${(value / 100).toFixed(2)} 元）`
}

function yuan(value: number): string {
  return `${(value / 100).toFixed(2)} 元`
}

/** 已返现序号：卡片空间有限，超过 12 个只显示前 12 个并标注总数。 */
const settledSequenceText = computed(() => {
  const list = overview.value?.filings.settledSequences ?? []
  if (list.length === 0) return '—'
  const head = list.slice(0, 12).join(' / ')
  return list.length > 12 ? `${head} … 共 ${list.length} 个` : head
})

const walletDiffRows = computed(() => {
  const diff = [...events.value].reverse().find((item) => item.diff)?.diff
  if (!diff) return []
  return [
    { label: '积分余额', value: fen(diff.wallet.points) },
    { label: '可提现余额', value: fen(diff.wallet.withdrawable) },
    { label: '消费金余额', value: fen(diff.wallet.consumption) },
    { label: '可提现冻结', value: fen(diff.wallet.withdrawableFrozen) },
    { label: '消费金冻结', value: fen(diff.wallet.consumptionFrozen) },
    { label: '现金流入', value: fen(diff.cash.inflow) },
    { label: '现金流出', value: fen(diff.cash.outflow) },
    { label: '订单数', value: fmt(diff.counts.orders) },
    { label: '待审提现', value: fmt(diff.counts.pendingWithdrawals) },
    { label: '待处理补偿', value: fmt(diff.counts.pendingCompensations) },
  ]
})
</script>

<template>
  <div class="simulation-page">
    <el-alert
      class="page-alert"
      type="warning"
      :closable="false"
      title="仿真演练（仅非正式环境）"
      description="造数走真实下单、支付、报单、入座与角色开通，结果可在会员、订单、财务、分红页面直接查看。正式环境后端全部接口 403，前端也不注册本页。"
      show-icon
    />

    <el-alert
      v-if="loadError"
      type="error"
      :title="loadError"
      show-icon
      :closable="false"
      class="page-alert"
    />

    <el-card v-loading="loading" shadow="never" class="block">
      <template #header>
        仿真总览
        <span class="header-note">业务日 {{ overview?.businessDate ?? '-' }}</span>
      </template>
      <div class="stat-grid">
        <div class="stat">
          <div class="stat__label">注册用户</div>
          <div class="stat__value">{{ overview?.users.total ?? 0 }}</div>
        </div>
        <div class="stat">
          <div class="stat__label">会员（已入座）</div>
          <div class="stat__value">{{ overview?.users.members ?? 0 }}</div>
        </div>
        <div class="stat">
          <div class="stat__label">订单 / 已支付</div>
          <div class="stat__value">
            {{ overview?.orders.total ?? 0 }} / {{ overview?.orders.paid ?? 0 }}
          </div>
        </div>
        <div class="stat">
          <div class="stat__label">已支付金额</div>
          <div class="stat__value">{{ yuan(overview?.orders.paidAmountFen ?? 0) }}</div>
        </div>
        <div class="stat">
          <div class="stat__label">联创 / 工作室 / 运营中心</div>
          <div class="stat__value">
            {{ overview?.roles.cofounders ?? 0 }} / {{ overview?.roles.studios ?? 0 }} /
            {{ overview?.roles.opsTeam ?? 0 }}
          </div>
        </div>
        <div class="stat">
          <div class="stat__label">全网公排（已完成）</div>
          <div class="stat__value">{{ overview?.filings.completed ?? 0 }} 单</div>
        </div>
        <div class="stat">
          <div class="stat__label">已返现序号</div>
          <div class="stat__value stat__value--seq">
            {{ settledSequenceText }}
          </div>
        </div>
        <div class="stat">
          <div class="stat__label">未参与公排子单</div>
          <div class="stat__value">{{ overview?.filings.unfiledSubOrders ?? 0 }} 个</div>
        </div>
      </div>
    </el-card>

    <div class="clock-tree-row">
      <el-card v-loading="loading" shadow="never" class="block clock-card">
        <template #header>仿真时钟</template>
      <el-form label-width="110px" class="clock-form">
        <el-form-item label="仿真起点">
          <div>
            <div class="clock-value">
              {{ clockStartLabel }}
              <el-tag :type="overrideActive ? 'warning' : 'info'" size="small" class="ml-8">
                {{ overrideActive ? '上次仿真时间' : '当前时间' }}
              </el-tag>
            </div>
            <p class="tip">
              {{
                overrideActive
                  ? '已在上次仿真的时刻，继续往后推进即可。'
                  : '以当前时间作为起点；首次推进时自动设定。'
              }}
            </p>
          </div>
        </el-form-item>
        <el-form-item label="逐日推进到">
          <div class="advance-row">
            <el-date-picker
              v-model="advanceTarget"
              type="datetime"
              placeholder="选择目标时刻（只能往后）"
              class="step-input"
            />
            <div class="advance-quick">
              <el-button
                v-for="item in ADVANCE_SHORTCUTS"
                :key="item.label"
                size="small"
                plain
                :disabled="busy"
                @click="bumpAdvanceTarget(item.minutes)"
              >
                +{{ item.label }}
              </el-button>
              <el-button type="primary" :disabled="busy" @click="onAdvance">推进</el-button>
            </div>
          </div>
          <p class="tip">快捷按钮在当前编辑框时间上累加；编辑框为空时从仿真起点起算。</p>
        </el-form-item>
      </el-form>
      <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />
      <el-divider content-position="left">危险操作</el-divider>
      <el-button :disabled="busy" type="danger" plain @click="onResetTimeline">清空时间轴</el-button>
      <el-button :disabled="busy" type="danger" @click="onResetData">重置业务数据</el-button>
      <p class="tip">
        清空时间轴只清演练日志（最多 500 条）并把仿真起点拉回真实时间，不动业务数据。
        重置会清空订单、支付、钱包、市场树、报单、分红、角色与全部会员（根账户与商品保留），
        时间轴一并清空、仿真起点回到当前时间。操作不可恢复，请只在演练库使用。
      </p>
      </el-card>

      <el-card v-loading="treeLoading" shadow="never" class="block tree-card">
        <template #header>
          用户树
          <span class="header-note">造数动作后自动刷新；点击节点看账户变动明细</span>
        </template>
        <div class="tree-toolbar">
          <el-radio-group v-model="treeKind" size="small">
            <el-radio-button value="invite">邀请树</el-radio-button>
            <el-radio-button value="market">市场树</el-radio-button>
          </el-radio-group>
          <el-button size="small" :disabled="treeLoading" @click="reloadUsersTree">刷新</el-button>
          <span class="tip tree-toolbar__note">
            节点显示编号、昵称、身份与三个钱包余额；鼠标停留看公排报单。
          </span>
        </div>
        <el-alert
          v-if="treeError"
          type="error"
          :title="treeError"
          show-icon
          :closable="false"
          class="tree-error"
        />
        <div v-loading="treeLoading" class="tree-wrap">
          <el-tree
            v-if="treeData.length > 0"
            :data="treeData"
            node-key="key"
            default-expand-all
            :expand-on-click-node="false"
            :props="{ children: 'children', label: 'label' }"
            class="user-tree"
          >
            <template #default="{ data }">
              <el-tooltip
                v-if="data.user"
                placement="right-start"
                effect="light"
                :show-after="180"
              >
                <template #content>
                  <div class="tree-tip">
                    <div class="tree-tip__title">
                      #{{ data.user.userId }} {{ data.user.nickname }}
                    </div>
                    <div class="tree-tip__section">公排报单序号</div>
                    <div v-if="data.filings.length === 0" class="tree-tip__empty">
                      暂无已完成报单
                    </div>
                    <div v-for="item in data.filings" :key="item.filingNo" class="tree-tip__line">
                      第 {{ item.sequence }} 单 · {{ item.bizDate ?? '-' }} ·
                      {{ money(item.amountFen) }} ·
                      {{ item.status === 'settled' ? '已返现' : '已完成' }}
                    </div>
                    <div class="tree-tip__section">未参与公排的订单</div>
                    <div v-if="data.unfiled.length === 0" class="tree-tip__empty">无</div>
                    <div v-for="item in data.unfiled" :key="item.orderNo" class="tree-tip__line">
                      {{ item.orderNo }} · {{ item.units }} 件 · {{ money(item.amountFen) }} ·
                      {{ formatDateTime(item.paidAt) }}
                    </div>
                    <div class="tree-tip__hint">点击节点查看账户变动明细</div>
                  </div>
                </template>
                <div class="tree-user" @click="onTreeNodeClick(data)">
                  <span class="tree-user__id">#{{ data.user.userId }}</span>
                  <span class="tree-user__nick">{{ data.user.nickname }}</span>
                  <el-tag
                    v-for="identity in data.user.identities"
                    :key="identity"
                    size="small"
                    effect="plain"
                    :type="identityTagType(identity)"
                  >
                    {{ identityLabel(identity) }}
                  </el-tag>
                  <span class="tree-user__wallet">
                    提现 {{ money(data.user.wallets.withdrawable) }}
                  </span>
                  <span class="tree-user__wallet">
                    积分 {{ money(data.user.wallets.points) }}
                  </span>
                  <span class="tree-user__wallet">
                    消费 {{ money(data.user.wallets.consumption) }}
                  </span>
                </div>
              </el-tooltip>
              <div v-else class="tree-group">{{ data.label }}</div>
            </template>
          </el-tree>
          <p v-else-if="!treeLoading" class="tip">
            还没有用户。先在「批量注册」里造人，或在「批量购买创业专区」里让会员入座。
          </p>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="block">
      <template #header>造数动作</template>
      <el-tabs>
        <el-tab-pane label="批量注册">
          <el-form label-width="110px" class="action-form">
            <el-form-item label="人数">
              <el-input-number v-model="registerCount" :min="1" :max="200" />
            </el-form-item>
            <el-form-item label="邀请人编号">
              <el-input
                v-model="registerInviter"
                placeholder="留空挂到根账户；必须是已有邀请码的会员"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :disabled="busy" @click="onRegister">注册</el-button>
            </el-form-item>
          </el-form>
          <p class="tip">
            昵称按演练命名规则生成：L{层}·{邀请路径}{小写序号}·邀{邀请人路径}，如根账户下注册得到
            L1·a·邀R、L1·b·邀R。每人自带统一支付密码
            123456。新用户没有邀请码，下过创业专区订单并完成支付后才会入座成为会员。
          </p>
        </el-tab-pane>

        <el-tab-pane label="红包报名">
          <el-form label-width="110px" class="action-form">
            <el-form-item label="指定用户">
              <el-input
                v-model="redPacketUserIds"
                type="textarea"
                :rows="2"
                placeholder="会员编号，逗号或换行分隔；留空则用下面的全部报名"
              />
            </el-form-item>
            <el-form-item>
              <el-button :disabled="busy" @click="onRedPacketSignup(false)">按名单报名</el-button>
              <el-button type="primary" :disabled="busy" @click="onRedPacketSignup(true)">
                全部会员报名
              </el-button>
            </el-form-item>
          </el-form>
          <p class="tip">
            走真实报名接口：会员且红包额度未领满才报得上，报名时间为当前仿真时刻（推进到几点就记几点）。
            要演示红包结算：先批量购买创业专区 → 全部会员报名 → 逐日推进到次日报单钟点，红包按当日创业销售额计提分红。
          </p>
          <el-table
            v-if="redPacketResults.length"
            :data="redPacketResults"
            size="small"
            border
            class="result-table"
          >
            <el-table-column prop="userId" label="编号" width="90" />
            <el-table-column prop="nickname" label="昵称" min-width="160" />
            <el-table-column label="结果" min-width="200">
              <template #default="{ row }">
                <el-tag v-if="row.outcome === 'signed'" type="success" size="small">报名成功</el-tag>
                <el-tag v-else-if="row.outcome === 'already'" type="info" size="small">
                  当天已报名
                </el-tag>
                <template v-else>
                  <el-tag type="danger" size="small">未报上</el-tag>
                  <span class="error-text ml-4">{{ row.error }}</span>
                </template>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="批量购买创业专区">
          <el-form label-width="110px" class="action-form">
            <el-form-item label="指定用户">
              <el-input
                v-model="buyUserIds"
                type="textarea"
                :rows="2"
                placeholder="会员编号，逗号或换行分隔；留空则按下面的人数随机取已入座会员"
              />
            </el-form-item>
            <el-form-item label="随机人数">
              <el-input-number v-model="buyCount" :min="1" :max="200" placeholder="留空按 1 人" />
            </el-form-item>
            <el-form-item label="商品编号">
              <el-input v-model="buyProductId" placeholder="留空取创业专区第一件上架商品" />
            </el-form-item>
            <el-form-item label="数量区间">
              <el-input-number v-model="buyMin" :min="1" :max="99" />
              <span class="range-sep">至</span>
              <el-input-number v-model="buyMax" :min="1" :max="99" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :disabled="busy" @click="onPurchase">
                下单并模拟支付
              </el-button>
            </el-form-item>
          </el-form>
          <el-table
            v-if="buyResults.length"
            :data="buyResults"
            size="small"
            border
            class="result-table"
          >
            <el-table-column prop="nickname" label="用户" width="140" />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column label="实付" width="120">
              <template #default="{ row }">{{ yuan(row.payAmountFen) }}</template>
            </el-table-column>
            <el-table-column label="订单状态" width="120">
              <template #default="{ row }">{{ row.status ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="当场报单" width="100">
              <template #default="{ row }">
                <el-tag :type="row.filed ? 'success' : 'info'" size="small">
                  {{ row.filed ? '已报单' : '未报单' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="结果" min-width="200">
              <template #default="{ row }">
                <span v-if="row.ok">{{ row.orderNo }}</span>
                <span v-else class="error-text">{{ row.error }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="批量购买会员商城">
          <el-form label-width="110px" class="action-form">
            <el-form-item label="指定用户">
              <el-input
                v-model="mallUserIds"
                type="textarea"
                :rows="2"
                placeholder="会员编号，逗号或换行分隔，例如 69,70,71；只有已入座会员才能下商城单"
              />
            </el-form-item>
            <el-form-item label="商城商品">
              <div class="product-picker">
                <div class="product-picker__row">
                  <el-select
                    v-model="mallProductId"
                    filterable
                    placeholder="选择已上架的会员商城商品"
                    class="product-select"
                    :loading="mallProductsLoading"
                  >
                    <el-option
                      v-for="item in mallProducts"
                      :key="item.id"
                      :label="`${item.name}（${yuan(item.priceFen)}）`"
                      :value="item.id"
                    />
                  </el-select>
                  <el-button class="ml-4" :disabled="mallProductsLoading" @click="loadMallProducts">
                    刷新
                  </el-button>
                </div>
                <p v-if="mallProductsError" class="error-text tip">{{ mallProductsError }}</p>
              </div>
            </el-form-item>
            <el-form-item label="数量区间">
              <el-input-number v-model="mallMin" :min="1" :max="99" />
              <span class="range-sep">至</span>
              <el-input-number v-model="mallMax" :min="1" :max="99" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :disabled="busy" @click="onPurchaseMall">
                下单并模拟支付
              </el-button>
            </el-form-item>
          </el-form>
          <p v-if="mallProducts.length === 0" class="tip">
            还没有已上架的会员商城商品，请先到「商品」页创建并上架。
          </p>
          <p class="tip">
            商城单只有会员（已入座）可以下单：支付顺序为消费金 → 可提现余额 →
            微信，沙箱支付会把剩余金额置为已付。商城单不报单、不进市场树、不参与分红。
          </p>
          <el-table
            v-if="mallResults.length"
            :data="mallResults"
            size="small"
            border
            class="result-table"
          >
            <el-table-column prop="nickname" label="用户" min-width="140" />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column label="实付" width="120">
              <template #default="{ row }">{{ yuan(row.payAmountFen) }}</template>
            </el-table-column>
            <el-table-column label="订单状态" width="120">
              <template #default="{ row }">{{ row.status ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="结果" min-width="200">
              <template #default="{ row }">
                <span v-if="row.ok">{{ row.orderNo }}</span>
                <span v-else class="error-text">{{ row.error }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="任命角色">
          <el-form label-width="110px" class="action-form">
            <el-form-item label="会员编号">
              <el-input v-model="roleUserId" placeholder="必须是已入座会员" />
            </el-form-item>
            <el-form-item label="角色">
              <el-select v-model="roleName" class="role-select">
                <el-option label="联合创始人（付费开通）" value="cofounder" />
                <el-option label="工作室（管理端指定）" value="studio" />
                <el-option label="运营中心（管理端指定）" value="ops_team" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :disabled="busy" @click="onRole">任命</el-button>
            </el-form-item>
          </el-form>
          <p v-if="roleMessage" class="tip">{{ roleMessage }}</p>
          <p class="tip">
            联合创始人走付费开通并产生沙箱付款记录；工作室与运营中心按管理端指定入籍，不产生付款。
          </p>
        </el-tab-pane>


      </el-tabs>
    </el-card>

    <el-card shadow="never" class="block">
      <template #header>
        时间轴（最近一步的账务差分在下方汇总；共 {{ status?.timelineCount ?? 0 }} 条）
      </template>
      <el-table :data="events" size="small" border>
        <el-table-column label="记录时刻" width="200">
          <template #default="{ row }">{{ row.at }}</template>
        </el-table-column>
        <el-table-column label="动作" width="110">
          <template #default="{ row }">
            <el-tag
              :type="row.action === 'step' || row.action === 'advance' ? 'primary' : 'info'"
              size="small"
            >
              {{ simulationActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="详情" min-width="260">
          <template #default="{ row }">
            <span v-if="row.action === 'set_clock'"
              >{{ row.detail.from }} → {{ row.detail.to }}</span
            >
            <span v-else-if="row.action === 'step'">
              {{ row.detail.from }} → {{ row.detail.to }}
              <el-tag v-if="row.detail.byMinutes" size="small" type="info" class="ml-4">
                +{{ row.detail.byMinutes }} 分钟
              </el-tag>
            </span>
            <span v-else-if="row.action === 'advance'">
              {{ row.detail.from }} → {{ row.detail.to }}（{{ row.detail.steps }} 次到期任务）
            </span>
            <span v-else-if="row.action === 'register'">新增 {{ row.detail.created }} 个用户</span>
            <span v-else-if="row.action === 'purchase'">成功下单 {{ row.detail.created }} 笔</span>
            <span v-else-if="row.action === 'role'">任命 {{ row.detail.created }} 次</span>
            <span v-else-if="row.action === 'clear_clock'"
              >从 {{ row.detail.from }} 恢复真实时间</span
            >
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="到期任务" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.detail.jobsAttempted" size="small" type="success">已触发</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="差分摘要" min-width="240">
          <template #default="{ row }">
            <span v-if="row.diff">
              积分 {{ fmt(row.diff.wallet.points) }} / 可提现
              {{ fmt(row.diff.wallet.withdrawable) }} / 消费金
              {{ fmt(row.diff.wallet.consumption) }} / 现金入 {{ fmt(row.diff.cash.inflow) }} /
              现金出 {{ fmt(row.diff.cash.outflow) }} / 订单 {{ fmt(row.diff.counts.orders) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="walletDiffRows.length > 0" shadow="never" class="block">
      <template #header>最近一次推进的账务差分</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item v-for="row in walletDiffRows" :key="row.label" :label="row.label">
          {{ row.value }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-drawer
      v-model="detailVisible"
      :title="detailUser ? `#${detailUser.userId} ${detailUser.nickname}` : '用户详情'"
      size="760px"
    >
      <div v-if="detailUser" class="user-detail">
        <div class="user-detail__identities">
          <el-tag
            v-for="identity in detailUser.identities"
            :key="identity"
            size="small"
            effect="plain"
            :type="identityTagType(identity)"
          >
            {{ identityLabel(identity) }}
          </el-tag>
        </div>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="可提现">
            {{ money(detailUser.wallets.withdrawable) }}
          </el-descriptions-item>
          <el-descriptions-item label="积分">
            {{ money(detailUser.wallets.points) }}
          </el-descriptions-item>
          <el-descriptions-item label="消费金">
            {{ money(detailUser.wallets.consumption) }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="user-detail__block">
          <div class="user-detail__title">公排报单（{{ detailFilings.length }} 单）</div>
          <el-table :data="detailFilings" size="small" border empty-text="暂无已完成报单">
            <el-table-column prop="sequence" label="序号" width="70" />
            <el-table-column prop="bizDate" label="业务日" width="110" />
            <el-table-column label="金额" width="100">
              <template #default="{ row }">{{ money(row.amountFen) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                {{ row.status === 'settled' ? '已返现' : '已完成' }}
              </template>
            </el-table-column>
            <el-table-column prop="filingNo" label="报单号" min-width="150" />
          </el-table>
        </div>

        <div class="user-detail__block">
          <div class="user-detail__title">
            未参与公排的订单（{{ detailUnfiled.length }} 单）
          </div>
          <el-table :data="detailUnfiled" size="small" border empty-text="无">
            <el-table-column prop="orderNo" label="订单号" min-width="160" />
            <el-table-column prop="units" label="件数" width="70" />
            <el-table-column label="金额" width="100">
              <template #default="{ row }">{{ money(row.amountFen) }}</template>
            </el-table-column>
            <el-table-column label="支付时间" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.paidAt) }}</template>
            </el-table-column>
          </el-table>
        </div>

        <div class="user-detail__block">
          <div class="user-detail__title">账户变动明细（最近 100 条）</div>
          <el-alert
            v-if="detailError"
            type="error"
            :title="detailError"
            show-icon
            :closable="false"
            class="tree-error"
          />
          <el-table
            v-loading="detailLoading"
            :data="detailEntries"
            size="small"
            border
            empty-text="暂无流水"
          >
            <el-table-column label="时间" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.occurredAt) }}</template>
            </el-table-column>
            <el-table-column label="账户" width="90">
              <template #default="{ row }">{{ walletLabel(row.walletType) }}</template>
            </el-table-column>
            <el-table-column label="类型" min-width="100">
              <template #default="{ row }">{{ ledgerBizLabel(row.bizType) }}</template>
            </el-table-column>
            <el-table-column label="收支" width="110">
              <template #default="{ row }">
                <span :class="row.direction === 'credit' ? 'amount-in' : 'amount-out'">
                  {{ row.direction === 'credit' ? '+' : '-' }}{{ money(row.amountFen) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="变动后余额" width="110">
              <template #default="{ row }">{{ money(row.balanceAfterFen) }}</template>
            </el-table-column>
            <el-table-column label="关联单号" min-width="130">
              <template #default="{ row }">
                {{ row.bizId }}
                <span v-if="row.sourceCode" class="muted"> · {{ row.sourceCode }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.simulation-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-alert,
.block {
  width: 100%;
}

/* 仿真时钟与用户树并排：左侧时钟较窄，右侧树撑满剩余宽度；窄屏时自动上下排列。 */
.clock-tree-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
}

.clock-tree-row .clock-card {
  width: auto;
  flex: 0 1 460px;
  min-width: 420px;
}

.clock-tree-row .tree-card {
  width: auto;
  flex: 1 1 320px;
  min-width: 0;
}

.header-note {
  margin-left: 12px;
  color: var(--aurel-muted);
  font-size: 12px;
  font-weight: 400;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.stat {
  padding: 12px 16px;
  background: var(--aurel-surface);
  border: 1px solid var(--aurel-line);
  border-radius: 10px;
}

.stat__label {
  color: var(--aurel-muted);
  font-size: 12px;
}

.stat__value {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 600;
}

.clock-form {
  margin-top: 16px;
  max-width: 900px;
}

.step-input {
  width: 280px;
  margin-right: 12px;
}

/* 逐日推进行：第一行时间框，第二行快捷步进 + 推进按钮。 */
.advance-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.advance-row .step-input {
  margin-right: 0;
}

.advance-quick {
  display: flex;
  align-items: center;
  flex-basis: 100%;
  gap: 8px;
}

.advance-row > .el-button,
.advance-quick .el-button + .el-button {
  margin-left: 0;
}

.advance-row + .tip {
  width: 100%;
}

.action-form {
  max-width: 760px;
}

.range-sep {
  margin: 0 8px;
  color: var(--aurel-muted);
}

.role-select {
  width: 260px;
}

.product-select {
  width: 380px;
}

.product-picker__row {
  display: flex;
  align-items: center;
}

.result-table {
  margin-top: 12px;
}

.tip {
  margin-top: 8px;
  color: var(--aurel-muted);
  font-size: 12px;
}

.error-text {
  color: #d14343;
}

.clock-value {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
}

.ml-8 {
  margin-left: 8px;
  font-weight: 400;
}

.ml-4 {
  margin-left: 4px;
}

.stat__value--seq {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-all;
}

.tree-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.tree-toolbar__note {
  margin-top: 0;
}

.tree-error {
  margin-bottom: 8px;
}

.tree-wrap {
  min-height: 80px;
  max-height: 620px;
  overflow: auto;
  padding: 4px 0;
}

.user-tree {
  background: transparent;
}

.user-tree :deep(.el-tree-node__content) {
  height: auto;
  padding: 2px 0;
}

.tree-user {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border: 1px solid var(--aurel-line);
  border-radius: 8px;
  background: var(--aurel-surface);
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.tree-user:hover {
  border-color: var(--el-color-primary);
}

.tree-user__id {
  color: var(--aurel-muted);
  font-size: 12px;
}

.tree-user__nick {
  font-weight: 600;
}

.tree-user__wallet {
  color: var(--aurel-muted);
  font-size: 12px;
}

.tree-group {
  color: var(--aurel-muted);
  font-size: 12px;
}

.tree-tip {
  max-width: 360px;
  line-height: 1.6;
}

.tree-tip__title {
  margin-bottom: 4px;
  font-weight: 600;
}

.tree-tip__section {
  margin-top: 6px;
  color: var(--aurel-muted);
  font-size: 12px;
}

.tree-tip__line {
  font-size: 12px;
}

.tree-tip__empty {
  color: var(--aurel-muted);
  font-size: 12px;
}

.tree-tip__hint {
  margin-top: 8px;
  color: var(--el-color-primary);
  font-size: 12px;
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-detail__identities {
  display: flex;
  gap: 8px;
}

.user-detail__block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-detail__title {
  font-weight: 600;
}

.amount-in {
  color: #d14343;
}

.amount-out {
  color: #2f8f5b;
}

.muted {
  color: var(--aurel-muted);
}
</style>
