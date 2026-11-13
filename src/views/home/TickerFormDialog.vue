<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import {
  createTicker,
  fetchTicker,
  sortMax,
  sortMin,
  tickerContentMax,
  updateTicker,
} from '@/api/home'
import type { AdminTicker } from '@/api/home'
import { apiErrorMessage } from '@/api/http'
import {
  emptyTickerDraft,
  tickerCreateBody,
  tickerProblem,
  tickerUpdateBody,
  type TickerDraft,
} from './content-form'
import { shelfStatusLabel } from './labels'

const props = defineProps<{
  modelValue: boolean
  tickerId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  saved: [ticker: AdminTicker, created: boolean]
}>()

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const currentStatus = ref('')
const draft = reactive<TickerDraft>(emptyTickerDraft())

const editing = computed(() => props.tickerId != null)
const title = computed(() => (editing.value ? '编辑滚动字幕' : '新建滚动字幕'))
const problem = computed(() => (loadError.value ? '' : tickerProblem(draft)))
const showProblem = computed(() => {
  if (!problem.value || editing.value) return Boolean(problem.value)
  const untouched = !draft.content.trim() && (draft.sortOrder === 0 || draft.sortOrder == null)
  return !untouched
})

watch(
  () => [props.modelValue, props.tickerId] as const,
  ([open]) => {
    if (open) void load()
  },
)

function close(): void {
  if (saving.value) return
  emit('update:modelValue', false)
}

function applyDraft(next: TickerDraft, status: string): void {
  draft.content = next.content
  draft.sortOrder = next.sortOrder
  draft.publishNow = next.publishNow
  currentStatus.value = status
}

async function load(): Promise<void> {
  actionError.value = ''
  loadError.value = ''
  if (!props.tickerId) {
    applyDraft(emptyTickerDraft(), '')
    return
  }
  loading.value = true
  try {
    const ticker = await fetchTicker(props.tickerId)
    applyDraft(
      { content: ticker.content, sortOrder: ticker.sortOrder, publishNow: false },
      ticker.status,
    )
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取滚动字幕失败')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (saving.value || loading.value || loadError.value) return
  const message = tickerProblem(draft)
  if (message) {
    actionError.value = message
    return
  }
  saving.value = true
  actionError.value = ''
  try {
    const saved = props.tickerId
      ? await updateTicker(props.tickerId, tickerUpdateBody(draft))
      : await createTicker(tickerCreateBody(draft))
    emit('saved', saved, !props.tickerId)
    emit('update:modelValue', false)
  } catch (error) {
    actionError.value = apiErrorMessage(error, '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="640px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading">
      <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
      <el-form v-else label-position="top" @submit.prevent="save">
        <el-form-item label="字幕">
          <el-input
            v-model="draft.content"
            type="textarea"
            :rows="3"
            :maxlength="tickerContentMax"
            show-word-limit
            placeholder="首页滚动展示的文字"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="draft.sortOrder"
            :min="sortMin"
            :max="sortMax"
            :step="1"
            :precision="0"
          />
          <p class="field-hint">整数。首页按数字从小到大排列，相同再按编号。</p>
        </el-form-item>
        <el-form-item v-if="editing" label="状态">
          <p class="field-hint">
            当前是{{ shelfStatusLabel(currentStatus) }}。这里只改内容，保存不会改状态。
          </p>
        </el-form-item>
        <el-form-item v-else label="保存后的状态">
          <el-radio-group v-model="draft.publishNow">
            <el-radio :value="false">草稿</el-radio>
            <el-radio :value="true">立即展示</el-radio>
          </el-radio-group>
          <p class="field-hint">
            选草稿时不传状态，接口写成草稿，首页不滚动。选立即展示时状态为展示中。
          </p>
        </el-form-item>
        <p v-if="showProblem" class="field-error">{{ problem }}</p>
        <el-alert
          v-if="actionError"
          type="error"
          :title="actionError"
          show-icon
          :closable="false"
        />
      </el-form>
    </div>
    <template #footer>
      <el-button :disabled="saving" @click="close">取消</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="loading || Boolean(loadError) || Boolean(problem)"
        @click="save"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.field-hint {
  margin-top: 6px;
  color: var(--aurel-muted);
  font-size: 12px;
}

.field-error {
  color: var(--el-color-danger);
  font-size: 13px;
}
</style>
