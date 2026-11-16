<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import { apiErrorMessage } from '@/api/http'
import { decimalFenText } from '@/api/money'
import { fetchWithdrawals, type AdminWithdrawal, type WithdrawalQuery } from '@/api/withdrawals'
import { routeQueryText } from '@/router/query'
import { formatShanghaiTime } from '@/utils/datetime'
import WithdrawalDetailDrawer from './WithdrawalDetailDrawer.vue'
import {
  withdrawalStatusLabel,
  withdrawalStatusOptions,
  withdrawalStatusTag,
} from './withdrawal-labels'

const pageSize = 20
const loading = ref(false)
const loadError = ref('')
const withdrawals = ref<AdminWithdrawal[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({
  status: '' as '' | NonNullable<WithdrawalQuery['status']>,
  userId: '',
})
const detailOpen = ref(false)
const detailId = ref<string | null>(null)
const route = useRoute()

onMounted(() => {
  const status = routeQueryText(route.query.status)
  const userId = routeQueryText(route.query.userId)
  if (status === 'pending' || status === 'rejected' || status === 'paid') filters.status = status
  if (/^\d+$/.test(userId)) filters.userId = userId
  void load()
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const result = await fetchWithdrawals({
      status: filters.status || undefined,
      userId: filters.userId.trim() || undefined,
      page: page.value,
      pageSize,
    })
    withdrawals.value = result.items
    total.value = result.total
    page.value = result.page
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取提现申请失败')
  } finally {
    loading.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function resetFilters(): void {
  filters.status = ''
  filters.userId = ''
  page.value = 1
  void load()
}

function onPage(next: number): void {
  page.value = next
  void load()
}

function openDetail(row: AdminWithdrawal): void {
  detailId.value = row.id
  detailOpen.value = true
}
</script>

<template>
  <section class="page">
    <header class="page__header">
      <h1>提现审核</h1>
    </header>
    <p class="hint">
      可按状态和用户 ID
      筛选。驳回会解冻申请金额。确认已打款表示财务已经按申请金额完成线下转账，系统不会自动打款。平台不收取提现手续费，账上按申请金额全额记支出；银行若另行扣费，由银行向用户收取。重复处理会提示「提现申请已处理」。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <div class="toolbar">
      <el-select v-model="filters.status" placeholder="全部状态" clearable class="filter">
        <el-option
          v-for="item in withdrawalStatusOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-input
        v-model="filters.userId"
        placeholder="用户 ID"
        clearable
        class="filter filter--id"
        @keyup.enter="search"
      />
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <div v-loading="loading" class="table">
      <el-table :data="withdrawals" empty-text="没有提现申请">
        <el-table-column prop="id" label="申请 ID" min-width="110" />
        <el-table-column prop="userId" label="用户 ID" min-width="110" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="withdrawalStatusTag(row.status)">
              {{ withdrawalStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请金额" min-width="120">
          <template #default="{ row }">{{ decimalFenText(row.amountFen) }}</template>
        </el-table-column>
        <el-table-column label="开户名" min-width="120">
          <template #default="{ row }">{{ row.accountName || '—' }}</template>
        </el-table-column>
        <el-table-column label="开户银行" min-width="140">
          <template #default="{ row }">{{ row.bankName || '—' }}</template>
        </el-table-column>
        <el-table-column label="申请时间" min-width="170">
          <template #default="{ row }">{{ formatShanghaiTime(row.appliedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-pagination
      v-if="total > 0"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="page"
      @current-change="onPage"
    />

    <WithdrawalDetailDrawer v-model="detailOpen" :withdrawal-id="detailId" @changed="load" />
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 360px;
  padding: 20px 24px;
  background: var(--aurel-surface);
  border: 1px solid var(--aurel-line);
  border-radius: 12px;
}

.page__header h1 {
  font-size: 20px;
  font-weight: 600;
}

.hint {
  color: var(--aurel-muted);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.filter {
  width: 140px;
}

.filter--id {
  width: 180px;
}

.table {
  min-height: 160px;
}
</style>
