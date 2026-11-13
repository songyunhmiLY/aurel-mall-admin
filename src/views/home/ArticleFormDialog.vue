<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import {
  articleBodyMax,
  articleSummaryMax,
  articleTitleMax,
  createArticle,
  fetchArticle,
  imageUrlMax,
  updateArticle,
  type AdminArticle,
} from '@/api/home'
import { apiErrorMessage } from '@/api/http'
import { formatShanghaiTime } from '@/utils/datetime'
import {
  articleCreateBody,
  articleProblem,
  articleUpdateBody,
  emptyArticleDraft,
  httpImageUrl,
  type ArticleDraft,
} from './content-form'
import { articleKindChoices, articleStatusLabel } from './labels'

const props = defineProps<{
  modelValue: boolean
  articleId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  saved: [article: AdminArticle, created: boolean]
}>()

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const currentStatus = ref('')
const publishedAt = ref<string | null>(null)
const draft = reactive<ArticleDraft>(emptyArticleDraft())

const editing = computed(() => props.articleId != null)
const title = computed(() => (editing.value ? '编辑资讯和知识' : '新建资讯和知识'))
const problem = computed(() => (loadError.value ? '' : articleProblem(draft)))
const showProblem = computed(() => {
  if (!problem.value || editing.value) return Boolean(problem.value)
  const untouched =
    draft.kind === 'article' &&
    !draft.title.trim() &&
    !draft.summary.trim() &&
    !draft.body.trim() &&
    !draft.coverUrl.trim()
  return !untouched
})
const previewUrl = computed(() => httpImageUrl(draft.coverUrl))
const publishedText = computed(() =>
  publishedAt.value ? formatShanghaiTime(publishedAt.value) : '尚未发布',
)

watch(
  () => [props.modelValue, props.articleId] as const,
  ([open]) => {
    if (open) void load()
  },
)

function close(): void {
  if (saving.value) return
  emit('update:modelValue', false)
}

function applyDraft(next: ArticleDraft, status: string, published: string | null): void {
  draft.kind = next.kind
  draft.title = next.title
  draft.summary = next.summary
  draft.body = next.body
  draft.coverUrl = next.coverUrl
  draft.publishNow = next.publishNow
  currentStatus.value = status
  publishedAt.value = published
}

async function load(): Promise<void> {
  actionError.value = ''
  loadError.value = ''
  if (!props.articleId) {
    applyDraft(emptyArticleDraft(), '', null)
    return
  }
  loading.value = true
  try {
    const article = await fetchArticle(props.articleId)
    const kind = article.kind
    applyDraft(
      {
        kind: kind === 'article' || kind === 'news' || kind === 'notice' ? kind : '',
        title: article.title,
        summary: article.summary,
        body: article.body,
        coverUrl: article.coverUrl ?? '',
        publishNow: false,
      },
      article.status,
      article.publishedAt,
    )
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取资讯失败')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (saving.value || loading.value || loadError.value) return
  const message = articleProblem(draft)
  if (message) {
    actionError.value = message
    return
  }
  saving.value = true
  actionError.value = ''
  try {
    const saved = props.articleId
      ? await updateArticle(props.articleId, articleUpdateBody(draft))
      : await createArticle(articleCreateBody(draft))
    emit('saved', saved, !props.articleId)
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
    width="720px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading">
      <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
      <el-form v-else label-position="top" @submit.prevent="save">
        <el-form-item label="类型">
          <el-radio-group v-model="draft.kind">
            <el-radio v-for="item in articleKindChoices" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="标题">
          <el-input
            v-model="draft.title"
            :maxlength="articleTitleMax"
            show-word-limit
            placeholder="标题"
          />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input
            v-model="draft.summary"
            type="textarea"
            :rows="3"
            :maxlength="articleSummaryMax"
            show-word-limit
            placeholder="摘要"
          />
        </el-form-item>
        <el-form-item label="正文">
          <el-input
            v-model="draft.body"
            type="textarea"
            :rows="8"
            :maxlength="articleBodyMax"
            show-word-limit
            placeholder="正文"
          />
        </el-form-item>
        <el-form-item label="封面">
          <el-input
            v-model="draft.coverUrl"
            :maxlength="imageUrlMax"
            show-word-limit
            clearable
            placeholder="http 或 https，可以留空"
          />
          <p class="field-hint">
            可以留空。填写时须是 http 或 https，最多 {{ imageUrlMax }} 字。这里不上传文件。
          </p>
          <el-image v-if="previewUrl" class="preview" :src="previewUrl" fit="cover">
            <template #error>
              <span class="preview__fallback">图片无法预览</span>
            </template>
          </el-image>
        </el-form-item>
        <el-form-item v-if="editing" label="状态与发布时间">
          <p class="field-hint">
            当前是{{ articleStatusLabel(currentStatus) }}，发布时间：{{
              publishedText
            }}。这里只改内容。保存不会改状态，也不会改发布时间。
          </p>
        </el-form-item>
        <el-form-item v-else label="保存后的状态">
          <el-radio-group v-model="draft.publishNow">
            <el-radio :value="false">草稿</el-radio>
            <el-radio :value="true">立即发布</el-radio>
          </el-radio-group>
          <p class="field-hint">
            选草稿时不传状态，接口写成草稿，首页不展示。选立即发布时状态为已发布，并写入当前业务时间作为发布时间。
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
