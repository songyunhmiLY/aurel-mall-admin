<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import { shipOrder, type AdminOrder } from '@/api/orders'

const props = defineProps<{
  orderId: string
}>()

const emit = defineEmits<{
  shipped: [order: AdminOrder]
  failed: [message: string, refresh: boolean]
  clearError: []
}>()

const courierName = ref('')
const trackingNumber = ref('')
const saving = ref(false)

watch(
  () => props.orderId,
  () => {
    courierName.value = ''
    trackingNumber.value = ''
  },
)

function localProblem(): string {
  const courier = courierName.value.trim()
  const tracking = trackingNumber.value.trim()
  if (courier.length < 1 || courier.length > 64) return '快递公司不正确'
  if (tracking.length < 1 || tracking.length > 64) return '运单号不正确'
  return ''
}

async function submit(): Promise<void> {
  if (saving.value) return
  emit('clearError')
  const problem = localProblem()
  if (problem) {
    emit('failed', problem, false)
    return
  }
  try {
    await ElMessageBox.confirm('确定发货？发货后订单变为已发货，不能再次发货。', '发货', {
      confirmButtonText: '发货',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  saving.value = true
  try {
    const order = await shipOrder(props.orderId, {
      courierName: courierName.value.trim(),
      trackingNumber: trackingNumber.value.trim(),
    })
    courierName.value = ''
    trackingNumber.value = ''
    ElMessage.success('已发货')
    emit('shipped', order)
  } catch (error) {
    emit('failed', apiErrorMessage(error, '发货失败'), true)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-form label-width="88px" @submit.prevent="submit">
    <el-form-item label="快递公司">
      <el-input v-model="courierName" maxlength="64" placeholder="例如顺丰" />
    </el-form-item>
    <el-form-item label="运单号">
      <el-input v-model="trackingNumber" maxlength="64" placeholder="运单号" />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" native-type="submit" :loading="saving">发货</el-button>
    </el-form-item>
  </el-form>
</template>
