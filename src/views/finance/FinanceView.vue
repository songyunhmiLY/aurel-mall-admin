<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  fetchCashLedger,
  fetchCompensations,
  fetchOverview,
  fetchReconciliation,
  fetchSkuSales,
  retryCompensation,
  type CashLedgerPage,
  type CompensationPage,
  type FinanceOverview,
  type Reconciliation,
  type SettlementCompensation,
  type SkuSalesPage,
} from '@/api/finance'
import { apiErrorMessage } from '@/api/http'
import { formatDecimalFen } from '@/api/money'
import { downloadCsv } from '@/utils/csv'

type TabKey = 'overview' | 'ledger' | 'reconcile' | 'compensation' | 'sku-sales'

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

const compensations = ref<CompensationPage | null>(null)
const compensationLoading = ref(false)
const compensationQuery = reactive({ status: '', page: 1, pageSize: 20 })

const skuSales = ref<SkuSalesPage | null>(null)
const skuSalesLoading = ref(false)
const skuSalesQuery = reactive({ zone: '', page: 1, pageSize: 20 })

const REASON_LABELS: Record<string, string> = {
  stock_insufficient: '库存不足',
  order_cancelled: '订单已被取消',
  seat_failure: '入座失败',
  wallet_shortfall: '钱包份额不足',
  transient: '临时故障',
}

const COMP_STATUS_LABELS: Record<string, string> = {
  auto_retry: '自动重试中',
  awaiting_operation: '待人工处理',
  completed: '已完成',
  refunded: '已退款（历史）',
}

function reasonLabel(code: string): string {
  return REASON_LABELS[code] ?? code
}

function compStatusLabel(code: string): string {
  return COMP_STATUS_LABELS[code] ?? code
}

function compStatusTag(code: string): 'warning' | 'primary' | 'success' | 'danger' {
  if (code === 'awaiting_operation') return 'warning'
  if (code === 'completed') return 'success'
  if (code === 'refunded') return 'danger'
  return 'primary'
}

/** 每行给操作员的待办提示。 */
function compHint(row: SettlementCompensation): string {
  if (row.status === 'completed') return '订单已按原样完成结算'
  if (row.status === 'refunded') return '微信实收已原路退回，冻结份额已解冻'
  if (row.failReason === 'wallet_shortfall')
    return '钱包份额不足：到订单页对带黄色「！」的订单点「手动完成结算」'
  if (row.failReason === 'order_cancelled') return '订单被超时取消，重试时会自动复活并完成'
  return '系统会自动重试，无需操作'
}

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

async function loadCompensations(): Promise<void> {
  compensationLoading.value = true
  try {
    compensations.value = await fetchCompensations({
      status: compensationQuery.status || undefined,
      page: compensationQuery.page,
      pageSize: compensationQuery.pageSize,
    })
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '结算补偿加载失败'))
  } finally {
    compensationLoading.value = false
  }
}

async function loadSkuSales(): Promise<void> {
  skuSalesLoading.value = true
  try {
    skuSales.value = await fetchSkuSales({
      ...dateParams.value,
      zone: skuSalesQuery.zone || undefined,
      page: skuSalesQuery.page,
      pageSize: skuSalesQuery.pageSize,
    })
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '单品销售汇总加载失败'))
  } finally {
    skuSalesLoading.value = false
  }
}

/** 前端拼 CSV（带 BOM，Excel 直接打开不乱码）。 */
function exportSkuSalesCsv(): void {
  const rows = skuSales.value?.rows ?? []
  if (!rows.length) {
    ElMessage.info('当前区间没有可导出的数据')
    return
  }
  downloadCsv(
    `单品销售汇总_${dateParams.value.from ?? ''}_${dateParams.value.to ?? ''}.csv`,
    [
      '商品',
      '规格',
      '销量',
      '销售金额(元)',
      '待发货件数',
      '待发货金额(元)',
      '已发货件数',
      '已发货金额(元)',
    ],
    rows.map((row) => [
      row.productName,
      row.skuName,
      row.quantity,
      yuan(row.salesAmountFen),
      row.pendingQuantity,
      yuan(row.pendingAmountFen),
      row.shippedQuantity,
      yuan(row.shippedAmountFen),
    ]),
  )
}

async function onRetry(row: SettlementCompensation): Promise<void> {
  try {
    await ElMessageBox.confirm(`继续结算订单 ${row.orderNo}？`, '继续结算', { type: 'warning' })
  } catch {
    return
  }
  try {
    await retryCompensation(row.id)
    ElMessage.success('已执行，结果见状态列')
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '继续结算失败'))
  }
  void loadCompensations()
}

function reload(): void {
  if (activeTab.value === 'overview') void loadOverview()
  if (activeTab.value === 'ledger') void loadLedger()
  if (activeTab.value === 'reconcile') void loadReconciliation()
  if (activeTab.value === 'compensation') void loadCompensations()
  if (activeTab.value === 'sku-sales') void loadSkuSales()
}

watch(activeTab, reload)
watch(range, () => {
  ledgerQuery.page = 1
  skuSalesQuery.page = 1
  reload()
})

watch(
  () => skuSalesQuery.zone,
  () => {
    skuSalesQuery.page = 1
    if (activeTab.value === 'sku-sales') void loadSkuSales()
  },
)

watch(
  () => skuSalesQuery.page,
  () => {
    if (activeTab.value === 'sku-sales') void loadSkuSales()
  },
)

watch(
  () => compensationQuery.status,
  () => {
    compensationQuery.page = 1
    if (activeTab.value === 'compensation') void loadCompensations()
  },
)

watch(
  () => compensationQuery.page,
  () => {
    if (activeTab.value === 'compensation') void loadCompensations()
  },
)

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

      <el-tab-pane label="结算补偿" name="compensation">
        <div class="finance__pane">
          <p class="ops-hint">
            微信已扣款但本地结算失败（库存不足、订单被取消、环境故障等）的订单在这里兜底。
            原则：只做「继续完成订单」，退款已整体下线。补货请到商品管理操作，这里不会自动改库存。
          </p>
          <div class="ops-toolbar">
            <el-select
              v-model="compensationQuery.status"
              class="ops-filter"
              placeholder="状态"
            >
              <el-option label="全部状态" value="" />
              <el-option
                v-for="(label, code) in COMP_STATUS_LABELS"
                :key="code"
                :label="label"
                :value="code"
              />
            </el-select>
            <span class="ops-meta">共 {{ compensations?.total ?? 0 }} 条</span>
          </div>

          <el-table v-loading="compensationLoading" :data="compensations?.items ?? []" size="small">
            <el-table-column label="订单号" min-width="150">
              <template #default="{ row }">
                <span class="finance__mono">{{ row.orderNo || `#${row.orderId}` }}</span>
              </template>
            </el-table-column>
            <el-table-column label="专区" width="90">
              <template #default="{ row }">
                {{ row.zone === 'startup' ? '创业专区' : '会员商城' }}
              </template>
            </el-table-column>
            <el-table-column label="微信实收" align="right" width="120">
              <template #default="{ row }">{{ yuan(row.amountFen) }} 元</template>
            </el-table-column>
            <el-table-column label="失败原因" width="110">
              <template #default="{ row }">
                <el-tag size="small" type="warning" effect="plain">
                  {{ reasonLabel(row.failReason) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag size="small" :type="compStatusTag(row.status)">
                  {{ compStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="重试" width="70" align="center">
              <template #default="{ row }">{{ row.retryCount }}</template>
            </el-table-column>
            <el-table-column label="待办提示" min-width="200">
              <template #default="{ row }">
                <span class="ops-meta">{{ compHint(row) }}</span>
                <div v-if="row.lastError" class="finance__mono finance__error">
                  {{ row.lastError }}
                </div>
              </template>
            </el-table-column>
            <el-table-column label="最后尝试" width="170">
              <template #default="{ row }">{{ timeText(row.lastTriedAt ?? '') }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'awaiting_operation' || row.status === 'auto_retry'"
                  size="small"
                  type="primary"
                  plain
                  @click="onRetry(row)"
                >
                  {{ row.status === 'awaiting_operation' ? '继续结算' : '立即重试' }}
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="没有待处理的结算补偿" />
            </template>
          </el-table>

          <el-pagination
            v-if="(compensations?.total ?? 0) > compensationQuery.pageSize"
            v-model:current-page="compensationQuery.page"
            :page-size="compensationQuery.pageSize"
            :total="compensations?.total ?? 0"
            layout="prev, pager, next"
            class="finance__pager"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="单品销售汇总" name="sku-sales">
        <div class="finance__pane">
          <p class="ops-hint">
            按时间段汇总每个单品的销售数量与金额，按订单状态拆出待发货（已支付未发货）与已发货。
            口径为下单完成付款的时间，不含未支付与已关闭订单。
          </p>
          <div class="ops-toolbar">
            <el-select v-model="skuSalesQuery.zone" class="ops-filter" placeholder="专区">
              <el-option label="全部专区" value="" />
              <el-option label="创业专区" value="startup" />
              <el-option label="会员商城" value="mall" />
            </el-select>
            <span class="ops-meta">共 {{ skuSales?.total ?? 0 }} 个单品</span>
            <el-button :disabled="!(skuSales?.rows ?? []).length" @click="exportSkuSalesCsv">
              导出 CSV
            </el-button>
          </div>

          <el-table v-loading="skuSalesLoading" :data="skuSales?.rows ?? []" size="small">
            <el-table-column label="商品" min-width="150">
              <template #default="{ row }">{{ row.productName }}</template>
            </el-table-column>
            <el-table-column label="销量" width="80" align="center">
              <template #default="{ row }">{{ row.quantity }}</template>
            </el-table-column>
            <el-table-column label="销售金额" align="right" width="120">
              <template #default="{ row }">{{ yuan(row.salesAmountFen) }} 元</template>
            </el-table-column>
            <el-table-column label="待发货" align="right" width="150">
              <template #default="{ row }">
                {{ row.pendingQuantity }} 件 / {{ yuan(row.pendingAmountFen) }} 元
              </template>
            </el-table-column>
            <el-table-column label="已发货" align="right" width="150">
              <template #default="{ row }">
                {{ row.shippedQuantity }} 件 / {{ yuan(row.shippedAmountFen) }} 元
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="该区间没有已支付/已发货的订单" />
            </template>
          </el-table>

          <el-pagination
            v-if="(skuSales?.total ?? 0) > skuSalesQuery.pageSize"
            v-model:current-page="skuSalesQuery.page"
            :page-size="skuSalesQuery.pageSize"
            :total="skuSales?.total ?? 0"
            layout="prev, pager, next"
            class="finance__pager"
          />
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

.finance__error {
  margin-top: 4px;
  color: #c4563a;
  word-break: break-all;
}
</style>
