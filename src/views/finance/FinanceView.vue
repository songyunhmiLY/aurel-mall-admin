<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import {
  fetchCashLedger,
  fetchOverview,
  fetchReconciliation,
  type CashLedgerEntry,
  type CashLedgerPage,
  type FinanceOverview,
  type Reconciliation,
} from '@/api/finance'
import { apiErrorMessage } from '@/api/http'
import { formatDecimalFen } from '@/api/money'

type TabKey = 'overview' | 'ledger' | 'reconcile'

const activeTab = ref<TabKey>('overview')
const range = ref<[string, string] | null>(null)

const overview = ref<FinanceOverview | null>(null)
const overviewLoading = ref(false)

const ledger = ref<CashLedgerPage | null>(null)
const ledgerLoading = ref(false)
const ledgerQuery = reactive({
  direction: '',
  bizType: '',
  page: 1,
  pageSize: 20,
})

const reconciliation = ref<Reconciliation | null>(null)
const reconcileLoading = ref(false)

const dateParams = computed(() => {
  const value = range.value
  if (!value) return {}
  return { from: value[0], to: value[1] }
})

const BUSINESS_LABELS: Record<string, string> = {
  order_wechat: '商品订单微信实收',
  cofounder_activation: '联合创始人开通',
  wechat_refund: '微信退款',
  withdrawal_payout: '提现打款',
}

const WALLET_LABELS: Record<string, string> = {
  withdrawable: '可提现账户',
  points: '积分账户',
  consumption: '消费账户',
}

function businessLabel(code: string): string {
  return BUSINESS_LABELS[code] ?? code
}

function walletLabel(code: string): string {
  return WALLET_LABELS[code] ?? code
}

function yuan(fen: string | undefined): string {
  if (!fen) return '0.00'
  return formatDecimalFen(fen) || '0.00'
}

function signed(fen: string | undefined): string {
  return `${yuan(fen)} 元`
}

function timeText(iso: string): string {
  if (!iso) return '—'
  return iso.replace('T', ' ').slice(0, 19)
}

async function loadOverview(): Promise<void> {
  overviewLoading.value = true
  try {
    overview.value = await fetchOverview(dateParams.value)
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '财务概览加载失败'))
  } finally {
    overviewLoading.value = false
  }
}

async function loadLedger(): Promise<void> {
  ledgerLoading.value = true
  try {
    ledger.value = await fetchCashLedger({
      ...dateParams.value,
      direction: ledgerQuery.direction || undefined,
      bizType: ledgerQuery.bizType || undefined,
      page: ledgerQuery.page,
      pageSize: ledgerQuery.pageSize,
    })
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '现金流水加载失败'))
  } finally {
    ledgerLoading.value = false
  }
}

async function loadReconciliation(): Promise<void> {
  reconcileLoading.value = true
  try {
    reconciliation.value = await fetchReconciliation(dateParams.value)
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '对账结果加载失败'))
  } finally {
    reconcileLoading.value = false
  }
}

function reload(): void {
  if (activeTab.value === 'overview') void loadOverview()
  if (activeTab.value === 'ledger') void loadLedger()
  if (activeTab.value === 'reconcile') void loadReconciliation()
}

watch(activeTab, reload)
watch(range, () => {
  ledgerQuery.page = 1
  reload()
})

watch(
  () => [ledgerQuery.direction, ledgerQuery.bizType],
  () => {
    ledgerQuery.page = 1
    if (activeTab.value === 'ledger') void loadLedger()
  },
)

watch(
  () => ledgerQuery.page,
  () => {
    if (activeTab.value === 'ledger') void loadLedger()
  },
)

onMounted(() => {
  void loadOverview()
})
</script>

<template>
  <section class="ops-page finance">
    <header class="finance__header">
      <div>
        <h1>财务对账</h1>
        <p class="ops-hint">
          现金流入流出以资金流水表为准，订单侧微信实收取已支付与已发货订单。只读，不提供修改。
        </p>
      </div>
      <div class="ops-toolbar">
        <el-date-picker
          v-model="range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          unlink-panels
          class="finance__range"
        />
        <el-button :loading="overviewLoading || ledgerLoading || reconcileLoading" @click="reload">
          刷新
        </el-button>
      </div>
    </header>

    <el-tabs v-model="activeTab" class="finance__tabs">
      <el-tab-pane label="概览" name="overview">
        <div v-loading="overviewLoading" class="finance__pane">
          <div class="finance__kpis">
            <article class="finance__kpi">
              <span class="finance__kpi-label">现金流入</span>
              <strong class="finance__kpi-value">{{ signed(overview?.cash.inflowFen) }}</strong>
              <span class="ops-meta">商品实收与联创开通</span>
            </article>
            <article class="finance__kpi">
              <span class="finance__kpi-label">现金流出</span>
              <strong class="finance__kpi-value">{{ signed(overview?.cash.outflowFen) }}</strong>
              <span class="ops-meta">微信退款与提现打款</span>
            </article>
            <article class="finance__kpi">
              <span class="finance__kpi-label">净流入</span>
              <strong
                class="finance__kpi-value"
                :class="{ 'finance__kpi-value--down': Number(overview?.cash.netFen ?? 0) < 0 }"
              >
                {{ signed(overview?.cash.netFen) }}
              </strong>
              <span class="ops-meta">流入减流出</span>
            </article>
            <article class="finance__kpi">
              <span class="finance__kpi-label">待审提现</span>
              <strong class="finance__kpi-value">{{ signed(overview?.withdrawals.pendingFen) }}</strong>
              <span class="ops-meta">{{ overview?.withdrawals.pendingCount ?? 0 }} 笔待处理</span>
            </article>
          </div>

          <div class="finance__split">
            <div class="finance__block">
              <h2>按业务类型</h2>
              <el-empty v-if="!overview?.byBizType.length" description="本期没有资金流水" />
              <el-table v-else :data="overview.byBizType" size="small">
                <el-table-column label="业务类型">
                  <template #default="{ row }">{{ businessLabel(row.bizType) }}</template>
                </el-table-column>
                <el-table-column label="方向" width="90">
                  <template #default="{ row }">
                    <el-tag :type="row.direction === 'inflow' ? 'success' : 'warning'" size="small">
                      {{ row.direction === 'inflow' ? '流入' : '流出' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="金额" align="right">
                  <template #default="{ row }">{{ yuan(row.amountFen) }} 元</template>
                </el-table-column>
              </el-table>
            </div>

            <div class="finance__block">
              <h2>会员钱包负债</h2>
              <el-table :data="overview?.walletLiability ?? []" size="small">
                <el-table-column label="账户">
                  <template #default="{ row }">{{ walletLabel(row.walletType) }}</template>
                </el-table-column>
                <el-table-column label="可用" align="right">
                  <template #default="{ row }">{{ yuan(row.balanceFen) }} 元</template>
                </el-table-column>
                <el-table-column label="冻结" align="right">
                  <template #default="{ row }">{{ yuan(row.frozenFen) }} 元</template>
                </el-table-column>
              </el-table>
              <p class="finance__total">
                合计 <strong>{{ signed(overview?.walletLiabilityTotalFen) }}</strong>
              </p>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="现金流水" name="ledger">
        <div class="finance__pane">
          <div class="ops-toolbar">
            <el-select v-model="ledgerQuery.direction" class="ops-filter--narrow" placeholder="方向">
              <el-option label="全部方向" value="" />
              <el-option label="流入" value="inflow" />
              <el-option label="流出" value="outflow" />
            </el-select>
            <el-select v-model="ledgerQuery.bizType" class="ops-filter" placeholder="业务类型">
              <el-option label="全部业务" value="" />
              <el-option
                v-for="(label, code) in BUSINESS_LABELS"
                :key="code"
                :label="label"
                :value="code"
              />
            </el-select>
            <span class="ops-meta">共 {{ ledger?.total ?? 0 }} 条</span>
          </div>

          <el-table v-loading="ledgerLoading" :data="ledger?.rows ?? []" size="small">
            <el-table-column label="发生时间" width="180">
              <template #default="{ row }">{{ timeText(row.occurredAt) }}</template>
            </el-table-column>
            <el-table-column label="业务" width="170">
              <template #default="{ row }">{{ businessLabel(row.bizType) }}</template>
            </el-table-column>
            <el-table-column label="方向" width="80">
              <template #default="{ row }">
                <el-tag :type="row.direction === 'inflow' ? 'success' : 'warning'" size="small">
                  {{ row.direction === 'inflow' ? '流入' : '流出' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="金额" align="right" width="140">
              <template #default="{ row }">{{ yuan(row.amountFen) }} 元</template>
            </el-table-column>
            <el-table-column label="关联单号" min-width="140">
              <template #default="{ row }">
                <span class="finance__mono">{{ row.bizId || '—' }}</span>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="本期没有资金流水" />
            </template>
          </el-table>

          <el-pagination
            v-if="(ledger?.total ?? 0) > ledgerQuery.pageSize"
            v-model:current-page="ledgerQuery.page"
            :page-size="ledgerQuery.pageSize"
            :total="ledger?.total ?? 0"
            layout="prev, pager, next"
            class="finance__pager"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="对账差异" name="reconcile">
        <div v-loading="reconcileLoading" class="finance__pane">
          <div class="finance__kpis">
            <article class="finance__kpi">
              <span class="finance__kpi-label">订单侧微信实收</span>
              <strong class="finance__kpi-value">{{ signed(reconciliation?.orderWechatFen) }}</strong>
              <span class="ops-meta">已支付 + 已发货订单的微信金额</span>
            </article>
            <article class="finance__kpi">
              <span class="finance__kpi-label">资金流水侧</span>
              <strong class="finance__kpi-value">{{ signed(reconciliation?.ledgerWechatFen) }}</strong>
              <span class="ops-meta">order_wechat 流入合计</span>
            </article>
            <article class="finance__kpi">
              <span class="finance__kpi-label">差额</span>
              <strong
                class="finance__kpi-value"
                :class="{ 'finance__kpi-value--down': !reconciliation?.matched }"
              >
                {{ signed(reconciliation?.diffFen) }}
              </strong>
              <span class="ops-meta">
                {{ reconciliation?.matched ? '两侧一致' : '有订单未记账' }}
              </span>
            </article>
          </div>

          <el-alert
            v-if="reconciliation?.matched"
            type="success"
            :closable="false"
            title="本期订单微信实收与资金流水完全一致"
          />
          <template v-else>
            <el-alert
              type="warning"
              :closable="false"
              title="有订单的微信实收没有进入资金流水"
              description="差额不为 0 说明订单支付成功但没有记账，需要检查支付回调链路。下面列出最多 20 个缺记账的订单。"
            />
            <div class="finance__block">
              <h2>缺记账的订单</h2>
              <div class="finance__chips">
                <el-tag
                  v-for="id in reconciliation?.missingOrderIds ?? []"
                  :key="id"
                  type="danger"
                  effect="plain"
                >
                  #{{ id }}
                </el-tag>
                <span v-if="!reconciliation?.missingOrderIds.length" class="ops-meta">
                  抽样范围内未定位到具体订单，差额可能来自更早的订单
                </span>
              </div>
            </div>
          </template>
        </div>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<style scoped>
.finance__header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.finance__header p {
  max-width: 640px;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
}

.finance__range {
  width: 260px;
}

.finance__tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.finance__pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 240px;
}

.finance__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.finance__kpi {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: var(--aurel-paper);
  border: 1px solid var(--aurel-line);
  border-radius: 10px;
}

.finance__kpi-label {
  color: var(--aurel-muted);
  font-size: 13px;
}

.finance__kpi-value {
  color: var(--aurel-ink);
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.finance__kpi-value--down {
  color: #c4563a;
}

.finance__split {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.finance__block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.finance__block h2 {
  font-size: 15px;
  font-weight: 600;
}

.finance__total {
  color: var(--aurel-muted);
  font-size: 13px;
}

.finance__total strong {
  color: var(--aurel-ink);
  font-variant-numeric: tabular-nums;
}

.finance__pager {
  justify-content: flex-end;
}

.finance__mono {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 12px;
}

.finance__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
