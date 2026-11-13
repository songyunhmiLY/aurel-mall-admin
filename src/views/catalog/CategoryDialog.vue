<script setup lang="ts">
import { ref, watch } from 'vue'

import { apiErrorMessage } from '@/api/http'
import { createMallCategory, type MallCategory } from '@/api/products'

const props = defineProps<{
  modelValue: boolean
  categories: MallCategory[]
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  created: []
}>()

const name = ref('')
const sortOrder = ref<number | undefined>(0)
const saving = ref(false)
const actionError = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    name.value = ''
    sortOrder.value = 0
    actionError.value = ''
  },
)

function close(): void {
  emit('update:modelValue', false)
}

async function create(): Promise<void> {
  const trimmed = name.value.trim()
  if (!trimmed || trimmed.length > 64) {
    actionError.value = '请填写不超过 64 个字的分类名称'
    return
  }
  if (sortOrder.value == null || !Number.isSafeInteger(sortOrder.value)) {
    actionError.value = '请填写整数排序'
    return
  }
  saving.value = true
  actionError.value = ''
  try {
    await createMallCategory(trimmed, sortOrder.value)
    name.value = ''
    sortOrder.value = 0
    emit('created')
  } catch (error) {
    actionError.value = apiErrorMessage(error, '新建分类失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="会员商城分类"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-table :data="categories" empty-text="还没有分类" max-height="280">
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column prop="sortOrder" label="排序" width="90" />
    </el-table>
    <el-form class="create" label-position="top" @submit.prevent="create">
      <el-form-item label="新分类">
        <el-input v-model="name" maxlength="64" placeholder="分类名称" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="sortOrder" :step="1" :precision="0" />
      </el-form-item>
      <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />
    </el-form>
    <template #footer>
      <el-button @click="close">关闭</el-button>
      <el-button type="primary" :loading="saving" @click="create">新建</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.create {
  margin-top: 16px;
}
</style>
