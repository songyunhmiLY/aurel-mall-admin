<script setup lang="ts">
export interface StatusChoice {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: boolean
  title: string
  current: string
  selected: string
  choices: StatusChoice[]
  hint: string
  error: string
  saving: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  'update:selected': [status: string]
  confirm: []
}>()

function close(): void {
  if (props.saving) return
  emit('update:modelValue', false)
}

function onVisible(open: boolean): void {
  if (!open) {
    close()
    return
  }
  emit('update:modelValue', true)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="480px"
    :close-on-click-modal="false"
    @update:model-value="onVisible"
  >
    <el-radio-group
      :model-value="selected"
      class="choices"
      :disabled="saving"
      @update:model-value="emit('update:selected', String($event))"
    >
      <el-radio v-for="item in choices" :key="item.value" :value="item.value">
        {{ item.label }}
      </el-radio>
    </el-radio-group>
    <p class="hint">{{ hint }}</p>
    <el-alert
      v-if="error"
      class="status-error"
      type="error"
      :title="error"
      show-icon
      :closable="false"
    />
    <template #footer>
      <el-button :disabled="saving" @click="close">取消</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="!selected || selected === current"
        @click="emit('confirm')"
      >
        保存状态
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.choices {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.hint {
  margin-top: 12px;
  color: var(--aurel-muted);
  font-size: 13px;
}

.status-error {
  margin-top: 12px;
}
</style>
