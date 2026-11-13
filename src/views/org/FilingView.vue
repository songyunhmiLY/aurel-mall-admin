<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import {
  fetchFilings,
  fetchFilingSettlements,
  type AdminFiling,
  type FilingSettlement,
} from '@/api/filings'
import { apiErrorMessage } from '@/api/http'
import { decimalFenText, fenToYuan } from '@/api/money'
import { formatShanghaiTime } from '@/utils/datetime'
import { filingStatusLabel, isLuckySequence } from './filing-labels'

const pageSize = 20
const loading = ref(false)
const loadError = ref('')
const filings = ref<AdminFiling[]>([])
const total = ref(0)
const page = ref(1)
const settlements = ref<FilingSettlement[]>([])
const settlementTotal = ref(0)
const settlementPage = ref(1)
const settlementError = ref('')
const filters = reactive({
  userId: '',
  bizDate: '',
  sequence: '',
})

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  const sequence = filters.sequence.trim()
  if (sequence && !/^[1-9]\d*$/.test(sequence)) {
    loadError.value = '序号不正确'
    return
  }
  loading.value = true
  loadError.value = ''
  settlementError.value = ''
  const userId = filters.userId.trim() || undefined
  try {
    const result = await fetchFilings({
      userId,
      bizDate: filters.bizDate || undefined,
      sequence: sequence || undefined,
      page: page.value,
      pageSize,
    })
    filings.value = result.items
    total.value = result.total
    page.value = result.page
  } catch (error) {
    filings.value = []
    total.value = 0
    loadError.value = apiErrorMessage(error, '读取报单失败')
  }
  try {
    const result = await fetchFilingSettlements(userId, settlementPage.value, pageSize)
    settlements.value = result.items
    settlementTotal.value = result.total
    settlementPage.value = result.page
  } catch (error) {
    settlements.value = []
    settlementTotal.value = 0
    settlementError.value = apiErrorMessage(error, '读取幸运返还失败')
  } finally {
    loading.value = false
  }
}

function search(): void {
  page.value = 1
  settlementPage.value = 1
  void load()
}

function resetFilters(): void {
  filters.userId = ''
  filters.bizDate = ''
  filters.sequence = ''
  page.value = 1
  settlementPage.value = 1
  void load()
}

function onPage(next: number): void {
  page.value = next
  void load()
}

function onSettlementPage(next: number): void {
  settlementPage.value = next
  void load()
}

function orderAmount(fen: number): string {
  return `${fenToYuan(fen)} 元`
}

function moneyPair(settlement: FilingSettlement | null): string {
  if (!settlement) return '—'
  return `可提现 ${decimalFenText(settlement.withdrawableFen)}，积分 ${decimalFenText(settlement.pointsFen)}`
}

function rowClass({ row }: { row: AdminFiling }): string {
  return row.sequence != null && isLuckySequence(row.sequence) ? 'is-lucky' : ''
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header>
      <h1>报单与公排</h1>
    </header>
    <p class="ops-hint">
      全网公排：谁在哪个自然日为哪张订单报单，以及全局序号。序号是 5
      的倍数时，本行会带上当时发给序号 k
      的幸运返还。本人作为受益人领到的返还在「本人领取」。报单是内部用词。金额以接口返回为准。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <div class="ops-toolbar">
      <el-input
        v-model="filters.userId"
        placeholder="用户 ID"
        clearable
        class="ops-filter"
        @keyup.enter="search"
      />
      <el-date-picker
        v-model="filters.bizDate"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="自然日"
        clearable
        class="ops-filter"
      />
      <el-input
        v-model="filters.sequence"
        placeholder="全局序号"
        clearable
        class="ops-filter--narrow"
        @keyup.enter="search"
      />
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <el-table :data="filings" empty-text="没有报单" :row-class-name="rowClass">
      <el-table-column label="全局序号" width="100">
        <template #default="{ row }: { row: AdminFiling }">{{ row.sequence ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="幸运返还" width="110">
        <template #default="{ row }: { row: AdminFiling }">
          <el-tag
            v-if="row.sequence != null && isLuckySequence(row.sequence)"
            size="small"
            effect="plain"
            type="success"
          >
            幸运返还
          </el-tag>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="自然日" width="120">
        <template #default="{ row }: { row: AdminFiling }">{{ row.bizDate || '—' }}</template>
      </el-table-column>
      <el-table-column prop="userId" label="用户 ID" min-width="110" />
      <el-table-column label="昵称" min-width="120">
        <template #default="{ row }: { row: AdminFiling }">{{ row.nickname || '—' }}</template>
      </el-table-column>
      <el-table-column label="订单 ID" min-width="110">
        <template #default="{ row }: { row: AdminFiling }">{{ row.orderId || '—' }}</template>
      </el-table-column>
      <el-table-column label="报单金额" min-width="120">
        <template #default="{ row }: { row: AdminFiling }">
          {{ orderAmount(row.amountFen) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }: { row: AdminFiling }">
          {{ filingStatusLabel(row.status) }}
        </template>
      </el-table-column>
      <el-table-column label="本人领取" min-width="220">
        <template #default="{ row }: { row: AdminFiling }">
          {{ moneyPair(row.settlement) }}
        </template>
      </el-table-column>
      <el-table-column label="本序号触发" min-width="240">
        <template #default="{ row }: { row: AdminFiling }">
          <template v-if="row.triggeredSettlement">
            受益人 {{ row.triggeredSettlement.beneficiaryUserId }}，{{
              moneyPair(row.triggeredSettlement)
            }}
          </template>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="报单时间" min-width="170">
        <template #default="{ row }: { row: AdminFiling }">
          {{ formatShanghaiTime(row.filedAt) }}
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-if="total > 0"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="page"
      @current-change="onPage"
    />

    <h2>幸运返还</h2>
    <p class="ops-hint">按受益人筛选。自然日和序号只用于上面的报单列表。</p>
    <el-alert
      v-if="settlementError"
      type="error"
      :title="settlementError"
      show-icon
      :closable="false"
    />
    <el-table :data="settlements" empty-text="没有幸运返还">
      <el-table-column prop="triggerSequence" label="触发序号" width="100" />
      <el-table-column prop="beneficiaryUserId" label="受益人" min-width="110" />
      <el-table-column prop="beneficiaryFilingId" label="受益报单" min-width="110" />
      <el-table-column label="可提现" min-width="130">
        <template #default="{ row }: { row: FilingSettlement }">
          {{ decimalFenText(row.withdrawableFen) }}
        </template>
      </el-table-column>
      <el-table-column label="积分" min-width="120">
        <template #default="{ row }: { row: FilingSettlement }">
          {{ decimalFenText(row.pointsFen) }}
        </template>
      </el-table-column>
      <el-table-column label="单价" min-width="120">
        <template #default="{ row }: { row: FilingSettlement }">
          {{ orderAmount(row.unitPriceFen) }}
        </template>
      </el-table-column>
      <el-table-column prop="withdrawalRatioBps" label="可提现比例（万分比）" width="180" />
      <el-table-column label="结算时间" min-width="170">
        <template #default="{ row }: { row: FilingSettlement }">
          {{ formatShanghaiTime(row.settledAt) }}
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-if="settlementTotal > 0"
      layout="total, prev, pager, next"
      :total="settlementTotal"
      :page-size="pageSize"
      :current-page="settlementPage"
      @current-change="onSettlementPage"
    />
  </section>
</template>

<style scoped>
.ops-page :deep(.is-lucky) {
  --el-table-tr-bg-color: var(--el-color-success-light-9);
}
</style>
