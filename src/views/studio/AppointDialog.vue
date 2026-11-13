<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import { appointStudio } from '@/api/studio'
import { apiErrorMessage } from '@/api/http'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  appointed: []
}>()

const saving = ref(false)
const actionError = ref('')
const userId = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    userId.value = ''
    actionError.value = ''
  },
)

function close(): void {
  emit('update:modelValue', false)
}

async function submit(): Promise<void> {
  if (saving.value) return
  const id = userId.value.trim()
  if (!/^[1-9]\d{0,18}$/.test(id)) {
    actionError.value = '会员编号不正确'
    return
  }
  saving.value = true
  actionError.value = ''
  try {
    const enrolled = await appointStudio(id)
    ElMessage.success(`已指定${enrolled.nickname ? ` ${enrolled.nickname}` : ''}`)
    emit('appointed')
    close()
  } catch (error) {
    actionError.value = apiErrorMessage(error, '指定失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="指定工作室"
    width="420px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="ops-hint">
      对方必须已经是会员，且当前不是工作室。没有人数上限，也不收款。指定不会取消联合创始人身份。
    </p>
    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="会员编号">
        <el-input v-model="userId" placeholder="用户 ID" clearable @keyup.enter="submit" />
      </el-form-item>
      <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">指定</el-button>
    </template>
  </el-dialog>
</template>
