<script setup lang="ts">
import { ref, watch } from 'vue'

import { apiErrorMessage } from '@/api/http'
import { fetchOrder, type AdminOrder } from '@/api/orders'
import {
  fenText,
  formatOrderTime,
  formatShippingAddress,
  orderStatusLabel,
  orderStatusTag,
  orderZoneLabel,
  pvText,
  shipBlockedMessage,
} from './order-labels'
import OrderShipForm from './OrderShipForm.vue'

const props = defineProps<{
  modelValue: boolean
  orderId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  changed: []
}>()

const loading = ref(false)
const loadError = ref('')
const shipError = ref('')
const justShipped = ref(false)
const order = ref<AdminOrder | null>(null)

watch(
  () => [props.modelValue, props.orderId] as const,
  ([open, id]) => {
    if (open && id) void load(id)
    if (!open) {
      order.value = null
      loadError.value = ''
      shipError.value = ''
      justShipped.value = false
    }
  },
)

async function load(id: string): Promise<void> {
  loading.value = true
  loadError.value = ''
  shipError.value = ''
  justShipped.value = false
  try {
    order.value = await fetchOrder(id)
  } catch (error) {
    order.value = null
    loadError.value = apiErrorMessage(error, '读取订单失败')
  } finally {
    loading.value = false
  }
}

function onShipped(next: AdminOrder): void {
  order.value = next
  shipError.value = ''
  loadError.value = ''
  justShipped.value = true
  emit('changed')
}

async function onShipFailed(message: string, refresh: boolean): Promise<void> {
  shipError.value = message
  if (!refresh) return
  emit('changed')
  const id = props.orderId
  if (!id) return
  try {
    order.value = await fetchOrder(id)
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取订单失败')
  }
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="订单详情"
    size="min(760px, 100%)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading" class="detail">
      <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
      <template v-if="order">
        <h2>订单</h2>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">{{ order.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="订单 ID">{{ order.id }}</el-descriptions-item>
          <el-descriptions-item label="用户 ID">{{ order.userId }}</el-descriptions-item>
          <el-descriptions-item label="专区">{{ orderZoneLabel(order.zone) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag size="small" effect="plain" :type="orderStatusTag(order.status)">
              {{ orderStatusLabel(order.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">
            {{ formatOrderTime(order.placedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="支付时间">
            {{ formatOrderTime(order.paidAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="发货时间">
            {{ formatOrderTime(order.shippedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="关闭时间">
            {{ formatOrderTime(order.closedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <h2>金额</h2>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="商品金额">
            {{ fenText(order.goodsTotalFen) }}
          </el-descriptions-item>
          <el-descriptions-item label="运费">{{ fenText(order.freightFen) }}</el-descriptions-item>
          <el-descriptions-item label="应付">
            {{ fenText(order.payAmountFen) }}
          </el-descriptions-item>
          <el-descriptions-item label="PV">{{ pvText(order.pvFen) }}</el-descriptions-item>
        </el-descriptions>

        <h2>支付拆分</h2>
        <p class="hint">未支付时四个来源都是 0。</p>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="积分">{{ fenText(order.pointsFen) }}</el-descriptions-item>
          <el-descriptions-item label="可提现">
            {{ fenText(order.withdrawableFen) }}
          </el-descriptions-item>
          <el-descriptions-item label="消费">
            {{ fenText(order.consumptionFen) }}
          </el-descriptions-item>
          <el-descriptions-item label="微信">{{ fenText(order.wechatFen) }}</el-descriptions-item>
        </el-descriptions>

        <h2>收货信息</h2>
        <p class="hint">下单时的地址快照。之后修改收货地址不影响此订单。</p>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="收货人">
            {{ order.shipping.contactName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="电话">
            {{ order.shipping.contactPhone || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="地址">
            {{ formatShippingAddress(order.shipping) }}
          </el-descriptions-item>
        </el-descriptions>

        <h2>物流</h2>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="快递公司">
            {{ order.courierName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="运单号">
            {{ order.trackingNumber || '—' }}
          </el-descriptions-item>
        </el-descriptions>

        <h2>商品</h2>
        <el-table :data="order.items" size="small" empty-text="没有商品">
          <el-table-column label="商品" min-width="160">
            <template #default="{ row }">
              <div>{{ row.productName || '—' }}</div>
              <div class="sub">SKU {{ row.skuId }}</div>
            </template>
          </el-table-column>
          <el-table-column label="规格" min-width="100">
            <template #default="{ row }">{{ row.skuName || '—' }}</template>
          </el-table-column>
          <el-table-column label="数量" width="72" prop="quantity" />
          <el-table-column label="单价" min-width="100">
            <template #default="{ row }">{{ fenText(row.unitPriceFen) }}</template>
          </el-table-column>
          <el-table-column label="单价 PV" min-width="90">
            <template #default="{ row }">{{ pvText(row.unitPvFen) }}</template>
          </el-table-column>
          <el-table-column label="单件运费" min-width="100">
            <template #default="{ row }">{{ fenText(row.unitFreightFen) }}</template>
          </el-table-column>
          <el-table-column label="行金额" min-width="100">
            <template #default="{ row }">{{ fenText(row.lineTotalFen) }}</template>
          </el-table-column>
          <el-table-column label="行 PV" min-width="90">
            <template #default="{ row }">{{ pvText(row.linePvFen) }}</template>
          </el-table-column>
          <el-table-column label="行运费" min-width="100">
            <template #default="{ row }">{{ fenText(row.lineFreightFen) }}</template>
          </el-table-column>
        </el-table>

        <h2>发货</h2>
        <el-alert
          v-if="shipError"
          class="notice"
          type="error"
          :title="shipError"
          show-icon
          :closable="false"
        />
        <el-alert
          v-else-if="!justShipped && order.status !== 'paid'"
          class="notice"
          type="error"
          :title="shipBlockedMessage(order.status)"
          show-icon
          :closable="false"
        />
        <OrderShipForm
          v-if="order.status === 'paid'"
          :order-id="order.id"
          @shipped="onShipped"
          @failed="onShipFailed"
          @clear-error="shipError = ''"
        />
      </template>
    </div>
  </el-drawer>
</template>

<style scoped>
.detail {
  min-height: 240px;
}

h2 {
  margin: 20px 0 8px;
  font-size: 16px;
  font-weight: 600;
}

h2:first-child {
  margin-top: 0;
}

.hint {
  margin-bottom: 12px;
  color: var(--aurel-muted);
}

.notice {
  margin-bottom: 12px;
}

.sub {
  color: var(--aurel-muted);
  font-size: 12px;
}
</style>
