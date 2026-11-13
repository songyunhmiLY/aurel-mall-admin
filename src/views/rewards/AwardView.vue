<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { apiErrorMessage } from '@/api/http'
import { decimalFenText } from '@/api/money'
import { fetchRewardEntries, type AwardType, type RewardEntry } from '@/api/reward-entries'
import { formatShanghaiTime } from '@/utils/datetime'
import { walletTypeLabel } from './wallet-labels'
import { awardTypeLabel, awardTypeOptions } from './award-labels'

const pageSize = 20
const loading = ref(false)
const loadError = ref('')
const entries = ref<RewardEntry[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({
  rewardType: '' as '' | AwardType,
  orderId: '',
  userId: '',
  layer: '',
})

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  const layer = filters.layer.trim()
  if (layer && !/^\d+$/.test(layer)) {
    loadError.value = '层级必须是非负整数'
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const result = await fetchRewardEntries({
      rewardType: filters.rewardType || undefined,
      orderId: filters.orderId.trim() || undefined,
      userId: filters.userId.trim() || undefined,
      layer: layer || undefined,
      page: page.value,
      pageSize,
    })
    entries.value = result.items
    total.value = result.total
    page.value = result.page
  } catch (error) {
    entries.value = []
    total.value = 0
    loadError.value = apiErrorMessage(error, '读取奖励明细失败')
  } finally {
    loading.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function resetFilters(): void {
  filters.rewardType = ''
  filters.orderId = ''
  filters.userId = ''
  filters.layer = ''
  page.value = 1
  void load()
}

function onPage(next: number): void {
  page.value = next
  void load()
}

function layerText(layer: number | null): string {
  return layer == null ? '—' : String(layer)
}

function splitText(row: RewardEntry): string {
  if (row.wallets.length === 0) return '—'
  return row.wallets
    .map((line) => `${walletTypeLabel(line.walletType)} ${decimalFenText(line.amountFen)}`)
    .join('，')
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header>
      <h1>奖励明细</h1>
    </header>
    <p class="ops-hint">
      按订单、层级和收款人查询创业专区、会员商城的销售奖和见点奖，并看到拆进哪个钱包。销售奖的层级是
      1（直接邀请人）。这里是每一笔发放，不是钱包里的分类合计。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <div class="ops-toolbar">
      <el-select v-model="filters.rewardType" placeholder="全部奖项" clearable class="ops-filter">
        <el-option
          v-for="item in awardTypeOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-input
        v-model="filters.orderId"
        placeholder="订单 ID"
        clearable
        class="ops-filter"
        @keyup.enter="search"
      />
      <el-input
        v-model="filters.userId"
        placeholder="收款人 ID"
        clearable
        class="ops-filter"
        @keyup.enter="search"
      />
      <el-input
        v-model="filters.layer"
        placeholder="层级"
        clearable
        class="ops-filter--narrow"
        @keyup.enter="search"
      />
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <el-table :data="entries" empty-text="没有奖励明细">
      <el-table-column prop="id" label="明细 ID" min-width="110" />
      <el-table-column label="奖项" min-width="160">
        <template #default="{ row }">{{ awardTypeLabel(row.rewardType) }}</template>
      </el-table-column>
      <el-table-column label="订单 ID" min-width="110">
        <template #default="{ row }">{{ row.orderId || '—' }}</template>
      </el-table-column>
      <el-table-column label="层级" width="80">
        <template #default="{ row }">{{ layerText(row.layer) }}</template>
      </el-table-column>
      <el-table-column prop="userId" label="收款人 ID" min-width="110" />
      <el-table-column label="昵称" min-width="120">
        <template #default="{ row }">{{ row.nickname || '—' }}</template>
      </el-table-column>
      <el-table-column label="金额" min-width="120">
        <template #default="{ row }">{{ decimalFenText(row.amountFen) }}</template>
      </el-table-column>
      <el-table-column label="入账" min-width="220">
        <template #default="{ row }">{{ splitText(row) }}</template>
      </el-table-column>
      <el-table-column label="时间" min-width="170">
        <template #default="{ row }">{{ formatShanghaiTime(row.occurredAt) }}</template>
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
  </section>
</template>
