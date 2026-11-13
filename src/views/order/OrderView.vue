<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import { apiErrorMessage } from '@/api/http'
import { fetchOrders, type AdminOrder, type OrderStatus, type OrderZone } from '@/api/orders'
import { routeQueryText } from '@/router/query'
import OrderDetailDrawer from './OrderDetailDrawer.vue'
import {
  fenText,
  formatOrderTime,
  orderStatusLabel,
  orderStatusOptions,
  orderStatusTag,
  orderZoneLabel,
  orderZoneOptions,
} from './order-labels'

const pageSize = 20
const loading = ref(false)
const loadError = ref('')
const orders = ref<AdminOrder[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({
  zone: '' as '' | OrderZone,
  status: '' as '' | OrderStatus,
  userId: '',
})
const detailOpen = ref(false)
const detailId = ref<string | null>(null)
const route = useRoute()

onMounted(() => {
  const zone = routeQueryText(route.query.zone)
  const status = routeQueryText(route.query.status)
  const userId = routeQueryText(route.query.userId)
  if (zone === 'startup' || zone === 'mall') filters.zone = zone
  if (
    status === 'pending_payment' ||
    status === 'paid' ||
    status === 'shipped' ||
    status === 'closed'
  ) {
    filters.status = status
  }
  if (/^\d+$/.test(userId)) filters.userId = userId
  void load()
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const result = await fetchOrders({
      zone: filters.zone || undefined,
      status: filters.status || undefined,
      userId: filters.userId.trim() || undefined,
      page: page.value,
      pageSize,
    })
    orders.value = result.items
    total.value = result.total
    page.value = result.page
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取订单失败')
  } finally {
    loading.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function resetFilters(): void {
  filters.zone = ''
  filters.status = ''
  filters.userId = ''
  page.value = 1
  void load()
}

function onPage(next: number): void {
  page.value = next
  void load()
}

function openDetail(row: AdminOrder): void {
  detailId.value = row.id
  detailOpen.value = true
}
</script>

<template>
  <section class="page">
    <header class="page__header">
      <h1>订单</h1>
    </header>
    <p class="hint">
      可按专区、状态和用户 ID
      筛选。只有已支付的订单可以发货。未支付会提示「只有已支付的订单可以发货」，重复发货会提示「订单已发货」。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <div class="toolbar">
      <el-select v-model="filters.zone" placeholder="全部专区" clearable class="filter">
        <el-option
          v-for="item in orderZoneOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-select v-model="filters.status" placeholder="全部状态" clearable class="filter">
        <el-option
          v-for="item in orderStatusOptions"
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
      <el-table :data="orders" empty-text="没有订单">
        <el-table-column label="订单号" min-width="200">
          <template #default="{ row }">
            <div class="order-no">{{ row.orderNo }}</div>
            <div class="sub">ID {{ row.id }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="userId" label="用户 ID" min-width="100" />
        <el-table-column label="专区" width="110">
          <template #default="{ row }">{{ orderZoneLabel(row.zone) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="orderStatusTag(row.status)">
              {{ orderStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="应付" min-width="110">
          <template #default="{ row }">{{ fenText(row.payAmountFen) }}</template>
        </el-table-column>
        <el-table-column label="下单时间" min-width="170">
          <template #default="{ row }">{{ formatOrderTime(row.placedAt) }}</template>
        </el-table-column>
        <el-table-column label="运单" min-width="140">
          <template #default="{ row }">
            <template v-if="row.trackingNumber || row.courierName">
              <div>{{ row.courierName || '—' }}</div>
              <div class="sub">{{ row.trackingNumber || '—' }}</div>
            </template>
            <span v-else>—</span>
          </template>
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

    <OrderDetailDrawer v-model="detailOpen" :order-id="detailId" @changed="load" />
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

.order-no {
  font-weight: 600;
  word-break: break-all;
}

.sub {
  color: var(--aurel-muted);
  font-size: 12px;
  word-break: break-all;
}
</style>
