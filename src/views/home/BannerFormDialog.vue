<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import { createBanner, fetchBanner, updateBanner, type AdminBanner } from '@/api/home'
import { bannerTitleMax, imageUrlMax, pagePathMax, sortMax, sortMin } from '@/api/home'
import { apiErrorMessage } from '@/api/http'
import { shelfStatusLabel } from './labels'
import {
  bannerCreateBody,
  bannerProblem,
  bannerUpdateBody,
  emptyBannerDraft,
  httpImageUrl,
  type BannerDraft,
} from './content-form'

const props = defineProps<{
  modelValue: boolean
  bannerId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  saved: [banner: AdminBanner, created: boolean]
}>()

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const currentStatus = ref('')
const draft = reactive<BannerDraft>(emptyBannerDraft())

const editing = computed(() => props.bannerId != null)
const title = computed(() => (editing.value ? '编辑轮播图' : '新建轮播图'))
const problem = computed(() => (loadError.value ? '' : bannerProblem(draft)))
const showProblem = computed(() => {
  if (!problem.value || editing.value) return Boolean(problem.value)
  const untouched =
    !draft.title.trim() &&
    !draft.imageUrl.trim() &&
    !draft.pagePath.trim() &&
    (draft.sortOrder === 0 || draft.sortOrder == null)
  return !untouched
})
const previewUrl = computed(() => httpImageUrl(draft.imageUrl))

watch(
  () => [props.modelValue, props.bannerId] as const,
  ([open]) => {
    if (open) void load()
  },
)

function close(): void {
  if (saving.value) return
  emit('update:modelValue', false)
}

function applyDraft(next: BannerDraft, status: string): void {
  draft.title = next.title
  draft.imageUrl = next.imageUrl
  draft.pagePath = next.pagePath
  draft.sortOrder = next.sortOrder
  draft.publishNow = next.publishNow
  currentStatus.value = status
}

async function load(): Promise<void> {
  actionError.value = ''
  loadError.value = ''
  if (!props.bannerId) {
    applyDraft(emptyBannerDraft(), '')
    return
  }
  loading.value = true
  try {
    const banner = await fetchBanner(props.bannerId)
    applyDraft(
      {
        title: banner.title,
        imageUrl: banner.imageUrl,
        pagePath: banner.pagePath,
        sortOrder: banner.sortOrder,
        publishNow: false,
      },
      banner.status,
    )
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取轮播图失败')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (saving.value || loading.value || loadError.value) return
  const message = bannerProblem(draft)
  if (message) {
    actionError.value = message
    return
  }
  saving.value = true
  actionError.value = ''
  try {
    const saved = props.bannerId
      ? await updateBanner(props.bannerId, bannerUpdateBody(draft))
      : await createBanner(bannerCreateBody(draft))
    emit('saved', saved, !props.bannerId)
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
        <el-form-item label="标题">
          <el-input
            v-model="draft.title"
            :maxlength="bannerTitleMax"
            show-word-limit
            placeholder="轮播图标题"
          />
        </el-form-item>
        <el-form-item label="图片地址">
          <el-input
            v-model="draft.imageUrl"
            :maxlength="imageUrlMax"
            show-word-limit
            placeholder="http 或 https 图片地址"
          />
          <p class="field-hint">
            填写图片的 http 或 https 地址，最多 {{ imageUrlMax }} 字。这里不上传文件。
          </p>
          <el-image v-if="previewUrl" class="preview" :src="previewUrl" fit="cover">
            <template #error>
              <span class="preview__fallback">图片无法预览</span>
            </template>
          </el-image>
        </el-form-item>
        <el-form-item label="跳转页面">
          <el-input
            v-model="draft.pagePath"
            :maxlength="pagePathMax"
            show-word-limit
            placeholder="小程序页面路径"
          />
          <p class="field-hint">点击轮播图后打开的小程序页面。不能填 http 或 https 网页地址。</p>
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
            选草稿时不传状态，接口写成草稿，首页不展示。选立即展示时状态为展示中。
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

.preview {
  width: 160px;
  height: 90px;
  margin-top: 8px;
  border-radius: 8px;
}

.preview__fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--aurel-muted);
  font-size: 12px;
  background: var(--aurel-paper);
}
</style>
