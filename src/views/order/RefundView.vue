<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import { apiErrorMessage } from '@/api/http'
import { fetchRefunds, type AdminRefund, type RefundQuery } from '@/api/refunds'
import { routeQueryText } from '@/router/query'
import { formatShanghaiTime } from '@/utils/datetime'
import RefundReviewDrawer from './RefundReviewDrawer.vue'
import { fenText } from './order-labels'
import {
  optionalFenText,
  refundStatusLabel,
  refundStatusOptions,
  refundStatusTag,
} from './refund-labels'

const pageSize = 20
const loading = ref(false)
const loadError = ref('')
const refunds = ref<AdminRefund[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({
  status: '' as '' | NonNullable<RefundQuery['status']>,
  userId: '',
})
const detailOpen = ref(false)
const detailRefund = ref<AdminRefund | null>(null)
const route = useRoute()

onMounted(() => {
  const status = routeQueryText(route.query.status)
  const userId = routeQueryText(route.query.userId)
  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    filters.status = status
  }
  if (/^\d+$/.test(userId)) filters.userId = userId
  void load()
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const result = await fetchRefunds({
      status: filters.status || undefined,
      userId: filters.userId.trim() || undefined,
      page: page.value,
      pageSize,
    })
    refunds.value = result.items
    total.value = result.total
    page.value = result.page
    const openId = detailRefund.value?.id
    if (openId) {
      detailRefund.value = result.items.find((item) => item.id === openId) ?? detailRefund.value
    }
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取退款申请失败')
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

function openDetail(row: AdminRefund): void {
  detailRefund.value = row
  detailOpen.value = true
}

function onReviewed(next: AdminRefund): void {
  detailRefund.value = next
  const index = refunds.value.findIndex((item) => item.id === next.id)
  if (index >= 0) refunds.value.splice(index, 1, next)
  void load()
}
</script>

<template>
  <section class="page">
    <header class="page__header">
      <h1>商城退款</h1>
    </header>
    <p class="hint">
      可按状态和用户 ID
      筛选。只处理会员商城退款，创业专区订单不能退款。运费和其他应扣费用不会自动计入减扣，可以少于整单退款。审核时只填退款金额或减扣金额中的一项，另一项按应付（含运费）在页面上预览，提交时也只发送所填的那一项。重复处理会提示「退款申请已处理」。两项都填或都不填会提示「请只填写退款金额或减扣金额」。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <div class="toolbar">
      <el-select v-model="filters.status" placeholder="全部状态" clearable class="filter">
        <el-option
          v-for="item in refundStatusOptions"
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
      <el-table :data="refunds" empty-text="没有退款申请">
        <el-table-column prop="id" label="申请 ID" min-width="110" />
        <el-table-column prop="orderId" label="订单 ID" min-width="110" />
        <el-table-column prop="userId" label="用户 ID" min-width="110" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="refundStatusTag(row.status)">
              {{ refundStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="应付" min-width="110">
          <template #default="{ row }">{{ fenText(row.payAmountFen) }}</template>
        </el-table-column>
        <el-table-column label="运费" min-width="100">
          <template #default="{ row }">{{ fenText(row.freightFen) }}</template>
        </el-table-column>
        <el-table-column label="退款金额" min-width="110">
          <template #default="{ row }">{{ optionalFenText(row.refundFen) }}</template>
        </el-table-column>
        <el-table-column label="减扣金额" min-width="110">
          <template #default="{ row }">{{ optionalFenText(row.deductionFen) }}</template>
        </el-table-column>
        <el-table-column label="申请时间" min-width="170">
          <template #default="{ row }">{{ formatShanghaiTime(row.appliedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">审核</el-button>
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

    <RefundReviewDrawer v-model="detailOpen" :refund="detailRefund" @reviewed="onReviewed" />
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
