<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import { fenToYuan } from '@/api/money'
import { fetchOrders, type AdminOrder, type OrderStatus, type OrderZone } from '@/api/orders'
import { routeQueryText } from '@/router/query'
import { csvTimestamp, downloadCsv } from '@/utils/csv'
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
const exportPageSize = 200
const loading = ref(false)
const exporting = ref(false)
const loadError = ref('')
const orders = ref<AdminOrder[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({
  zone: '' as '' | OrderZone,
  status: '' as '' | OrderStatus,
  userId: '',
})
const range = ref<[string, string] | null>(null)
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
      from: range.value?.[0] || undefined,
      to: range.value?.[1] || undefined,
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
  range.value = null
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

function currentQuery() {
  return {
    zone: filters.zone || undefined,
    status: filters.status || undefined,
    userId: filters.userId.trim() || undefined,
    from: range.value?.[0] || undefined,
    to: range.value?.[1] || undefined,
  }
}

/** 按当前筛选把订单分页拉尽后拼 CSV 导出。 */
async function onExport(): Promise<void> {
  if (exporting.value) return
  exporting.value = true
  try {
    const rows: AdminOrder[] = []
    for (let current = 1; ; current += 1) {
      const result = await fetchOrders({ ...currentQuery(), page: current, pageSize: exportPageSize })
      rows.push(...result.items)
      if (rows.length >= result.total || result.items.length === 0) break
    }
    if (!rows.length) {
      ElMessage.info('当前筛选没有可导出的订单')
      return
    }
    downloadCsv(`订单_${csvTimestamp()}.csv`, ORDER_CSV_HEADER, rows.map(orderCsvRow))
    ElMessage.success(`已导出 ${rows.length} 条订单`)
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '订单导出失败'))
  } finally {
    exporting.value = false
  }
}

const ORDER_CSV_HEADER = [
  '订单号',
  '订单ID',
  '用户ID',
  '专区',
  '状态',
  '商品明细',
  '商品金额(元)',
  '运费(元)',
  '应付(元)',
  'PV',
  '积分抵扣(元)',
  '可提现抵扣(元)',
  '消费金抵扣(元)',
  '微信实收(元)',
  '收货人',
  '联系电话',
  '收货地址',
  '快递公司',
  '运单号',
  '下单时间',
  '付款时间',
  '发货时间',
  '关闭时间',
  '结算异常',
  '备注',
]

function orderCsvRow(order: AdminOrder): string[] {
  const items = order.items
    .map((item) => `${item.productName} ${item.skuName}×${item.quantity}`)
    .join('；')
  const address = [
    order.shipping.province,
    order.shipping.city,
    order.shipping.district,
    order.shipping.detail,
  ]
    .join('')
    .trim()
  return [
    order.orderNo,
    order.id,
    order.userId,
    orderZoneLabel(order.zone),
    orderStatusLabel(order.status),
    items,
    fenToYuan(order.goodsTotalFen),
    fenToYuan(order.freightFen),
    fenToYuan(order.payAmountFen),
    fenToYuan(order.pvFen),
    fenToYuan(order.pointsFen),
    fenToYuan(order.withdrawableFen),
    fenToYuan(order.consumptionFen),
    fenToYuan(order.wechatFen),
    order.shipping.contactName,
    order.shipping.contactPhone,
    address,
    order.courierName ?? '',
    order.trackingNumber ?? '',
    formatOrderTime(order.placedAt),
    formatOrderTime(order.paidAt),
    formatOrderTime(order.shippedAt),
    formatOrderTime(order.closedAt),
    order.settlementPending ? '是' : '',
    order.remark ?? '',
  ]
}
</script>

<template>
  <section class="page">
    <header class="page__header">
      <h1>订单</h1>
    </header>
    <p class="hint">
      可按专区、状态和用户 ID
      筛选。只有已支付的订单可以发货。未支付会提示「只有已支付的订单可以发货」，重复发货会提示「订单已发货」。「导出
      CSV」按当前筛选条件下载全部命中订单。
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
      <el-date-picker
        v-model="range"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="下单开始日"
        end-placeholder="下单结束日"
        class="range"
      />
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
      <el-button :loading="exporting" @click="onExport">导出 CSV</el-button>
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
        <el-table-column label="状态" width="150">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="orderStatusTag(row.status)">
              {{ orderStatusLabel(row.status) }}
            </el-tag>
            <el-tooltip
              v-if="row.settlementPending"
              content="微信已支付但结算未完成，进入详情人工处理"
              placement="top"
            >
              <el-tag size="small" effect="dark" type="warning" class="flag">！</el-tag>
            </el-tooltip>
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

.range {
  width: 240px;
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
