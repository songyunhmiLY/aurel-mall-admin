<script setup lang="ts">
import { ref, watch } from 'vue'

import { apiErrorMessage } from '@/api/http'
import { productToWrite, updateProductStock, type Product } from '@/api/products'

const props = defineProps<{
  modelValue: boolean
  product: Product | null
  startupZoneUnitPriceFen: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  saved: []
}>()

const stock = ref<number | undefined>(0)
const saving = ref(false)
const actionError = ref('')

watch(
  () => [props.modelValue, props.product] as const,
  ([open, product]) => {
    if (!open || !product) return
    stock.value = product.stock ?? undefined
    actionError.value = ''
  },
)

function close(): void {
  emit('update:modelValue', false)
}

async function save(): Promise<void> {
  const product = props.product
  if (!product || saving.value) return
  if (stock.value == null || !Number.isSafeInteger(stock.value) || stock.value < 0) {
    actionError.value = '请填写不小于 0 的整数库存'
    return
  }
  const priceFen =
    product.zone === 'startup' && props.startupZoneUnitPriceFen != null
      ? props.startupZoneUnitPriceFen
      : product.priceFen
  const canFallback = product.zone !== 'startup' || priceFen != null

  saving.value = true
  actionError.value = ''
  try {
    const write = canFallback
      ? productToWrite(product, {
          stock: stock.value,
          ...(priceFen == null ? {} : { priceFen }),
        })
      : null
    await updateProductStock(product.id, stock.value, write)
    emit('saved')
    close()
  } catch (error) {
    actionError.value = apiErrorMessage(error, '调整库存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="调整库存"
    width="420px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="name">{{ product?.name }}</p>
    <p class="hint">填写调整后的库存数量。</p>
    <el-input-number v-model="stock" :min="0" :step="1" :precision="0" />
    <el-alert
      v-if="actionError"
      class="error"
      type="error"
      :title="actionError"
      show-icon
      :closable="false"
    />
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.name {
  font-weight: 600;
}

.hint {
  margin: 6px 0 12px;
  color: var(--aurel-muted);
}

.error {
  margin-top: 12px;
}
</style>
