<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { appointOpsTeam, type OpsTeamEnrollment } from '@/api/ops-team'
import { apiErrorMessage } from '@/api/http'
import { opsTeamPerson } from './labels'

const props = defineProps<{
  modelValue: boolean
  holder: OpsTeamEnrollment | null
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  appointed: []
}>()

const saving = ref(false)
const actionError = ref('')
const userId = ref('')
const reassigning = computed(() => props.holder != null)

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
  const current = props.holder
  if (current?.userId === id) {
    actionError.value = '该会员已是运营团队'
    return
  }
  actionError.value = ''
  if (current) {
    try {
      await ElMessageBox.confirm(
        `改派后${opsTeamPerson(current)}立刻不再领取之后的分红，已经入账的留在原账户。不会退款，也不会把余额转给新持有人。不会取消联合创始人或工作室身份。`,
        '改派运营团队',
        {
          confirmButtonText: '改派',
          cancelButtonText: '返回',
          type: 'warning',
        },
      )
    } catch {
      return
    }
  }
  saving.value = true
  actionError.value = ''
  try {
    const enrolled = await appointOpsTeam(id)
    const who = enrolled.nickname ? ` ${enrolled.nickname}` : ''
    ElMessage.success(
      current ? `已改派${who}。上一任不再领取之后的分红，已经入账的留在原账户。` : `已指定${who}`,
    )
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
    :title="reassigning ? '改派运营团队' : '指定运营团队'"
    width="460px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p v-if="reassigning" class="ops-hint">
      对方必须已经是会员，且不能是当前持有人。这次请求会改派：上一任立刻不再领取之后的分红，已经入账的留在原账户。不退款，也不把余额转给新持有人。不会取消联合创始人或工作室身份。
    </p>
    <p v-else class="ops-hint">
      对方必须已经是会员。全网同时只有一名运营团队。不收款，用户也不能自己付款开通。指定不会取消联合创始人或工作室身份。
    </p>
    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="会员编号">
        <el-input
          v-model="userId"
          placeholder="用户 ID"
          clearable
          @input="actionError = ''"
          @keyup.enter="submit"
        />
      </el-form-item>
      <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">
        {{ reassigning ? '改派' : '指定' }}
      </el-button>
    </template>
  </el-dialog>
</template>
