<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import { fetchCofounderContent, saveCofounderContent, type CofounderContent } from '@/api/cofounder'
import { apiErrorMessage } from '@/api/http'
import {
  cofounderEntryCopyMax,
  cofounderImageCountMax,
  cofounderImageMax,
  cofounderIntroBodyMax,
  cofounderIntroTitleMax,
  contentDraftFrom,
  contentPayload,
  contentProblem,
  emptyContentDraft,
  imagePreviewUrls,
} from './content-form'

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const loaded = ref(false)
const draft = reactive(emptyContentDraft())

const problem = computed(() => (loaded.value ? contentProblem(draft) : ''))
const entryPreviews = computed(() => imagePreviewUrls(draft.entryImageUrlsText))
const introPreviews = computed(() => imagePreviewUrls(draft.introImageUrlsText))

onMounted(() => {
  void load()
})

function applyLoaded(content: CofounderContent): void {
  Object.assign(draft, contentDraftFrom(content))
  loaded.value = true
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    applyLoaded(await fetchCofounderContent())
    actionError.value = ''
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取入口与介绍失败')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!loaded.value || saving.value || loading.value) return
  const message = contentProblem(draft)
  if (message) {
    actionError.value = message
    return
  }
  saving.value = true
  actionError.value = ''
  try {
    applyLoaded(await saveCofounderContent(contentPayload(draft)))
    loadError.value = ''
    ElMessage.success('已保存')
  } catch (error) {
    actionError.value = apiErrorMessage(error, '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header>
      <h1>入口与介绍</h1>
    </header>
    <p class="ops-hint">
      配置小程序首页联合创始人入口，以及介绍页的标题、正文和图片。入口文案最多
      {{ cofounderEntryCopyMax }} 字，介绍标题最多 {{ cofounderIntroTitleMax }} 字，介绍正文最多
      {{ cofounderIntroBodyMax }} 字。图片每组最多 {{ cofounderImageCountMax }} 个，每个地址最多
      {{ cofounderImageMax }} 字。一行一个地址，留空会清空这一组图片。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <el-form
      class="content-form"
      label-position="top"
      :disabled="loading || saving"
      @submit.prevent="save"
    >
      <h2>首页入口</h2>
      <el-form-item label="入口文案">
        <el-input
          v-model="draft.entryCopy"
          type="textarea"
          :rows="4"
          :maxlength="cofounderEntryCopyMax"
          show-word-limit
          :disabled="!loaded"
          placeholder="首页入口文案，可以留空"
        />
      </el-form-item>
      <el-form-item label="入口图片">
        <el-input
          v-model="draft.entryImageUrlsText"
          type="textarea"
          :rows="4"
          :disabled="!loaded"
          placeholder="每行一个图片地址，可以留空"
        />
        <div v-if="entryPreviews.length" class="previews">
          <el-image v-for="url in entryPreviews" :key="url" class="preview" :src="url" fit="cover">
            <template #error>
              <span class="preview__fallback">图片无法预览</span>
            </template>
          </el-image>
        </div>
      </el-form-item>

      <h2>介绍页</h2>
      <el-form-item label="标题">
        <el-input
          v-model="draft.introTitle"
          :maxlength="cofounderIntroTitleMax"
          show-word-limit
          :disabled="!loaded"
          placeholder="介绍页标题，可以留空"
        />
      </el-form-item>
      <el-form-item label="正文">
        <el-input
          v-model="draft.introBody"
          type="textarea"
          :rows="8"
          :maxlength="cofounderIntroBodyMax"
          show-word-limit
          :disabled="!loaded"
          placeholder="介绍页正文，可以留空"
        />
      </el-form-item>
      <el-form-item label="介绍图片">
        <el-input
          v-model="draft.introImageUrlsText"
          type="textarea"
          :rows="4"
          :disabled="!loaded"
          placeholder="每行一个图片地址，可以留空"
        />
        <div v-if="introPreviews.length" class="previews">
          <el-image v-for="url in introPreviews" :key="url" class="preview" :src="url" fit="cover">
            <template #error>
              <span class="preview__fallback">图片无法预览</span>
            </template>
          </el-image>
        </div>
      </el-form-item>

      <p v-if="loaded && problem" class="field-error">{{ problem }}</p>
      <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />
      <div class="actions">
        <el-button
          type="primary"
          native-type="submit"
          :loading="saving"
          :disabled="!loaded || Boolean(problem)"
        >
          保存
        </el-button>
        <el-button :disabled="loading || saving" @click="load">重新读取</el-button>
      </div>
    </el-form>
  </section>
</template>

<style scoped>
.content-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 720px;
}

.content-form h2 {
  margin-top: 8px;
}

.previews {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.preview {
  width: 96px;
  height: 96px;
  border: 1px solid var(--aurel-line);
  border-radius: 8px;
}

.preview__fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--aurel-muted);
  font-size: 12px;
  text-align: center;
}

.field-error {
  color: var(--el-color-danger);
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
