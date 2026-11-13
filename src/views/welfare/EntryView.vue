<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import { fetchWelfareEntry, saveWelfareEntry, type WelfareEntry } from '@/api/welfare'
import {
  welfareEntryCopyMax,
  welfareEntryImageMax,
  welfareEntryPayload,
  welfareEntryPreviewUrl,
  welfareEntryProblem,
  type WelfareEntryDraft,
} from './entry-form'

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const loaded = ref(false)
const draft = reactive<WelfareEntryDraft>({
  copy: '',
  imageUrl: '',
})

const problem = computed(() => welfareEntryProblem(draft))
const previewUrl = computed(() => welfareEntryPreviewUrl(draft.imageUrl))

onMounted(() => {
  void load()
})

function applyLoaded(entry: WelfareEntry): void {
  draft.copy = entry.copy
  draft.imageUrl = entry.imageUrl ?? ''
  loaded.value = true
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    applyLoaded(await fetchWelfareEntry())
    actionError.value = ''
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取入口配置失败')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!loaded.value || saving.value || loading.value) return
  const message = welfareEntryProblem(draft)
  if (message) {
    actionError.value = message
    return
  }
  saving.value = true
  actionError.value = ''
  try {
    applyLoaded(await saveWelfareEntry(welfareEntryPayload(draft)))
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
      <h1>入口配置</h1>
    </header>
    <p class="ops-hint">
      配置小程序首页福利专场入口的文案和图片。文案最多 {{ welfareEntryCopyMax }} 字，图片地址最多
      {{
        welfareEntryImageMax
      }}
      字。图片留空会去掉入口图。轮次门槛、单轮额度和每日计提不在这里修改。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <el-form
      class="entry-form"
      label-position="top"
      :disabled="loading || saving"
      @submit.prevent="save"
    >
      <el-form-item label="入口文案">
        <el-input
          v-model="draft.copy"
          type="textarea"
          :rows="4"
          :maxlength="welfareEntryCopyMax"
          show-word-limit
          :disabled="!loaded"
          placeholder="首页入口文案，可以留空"
        />
      </el-form-item>
      <el-form-item label="入口图片">
        <el-input
          v-model="draft.imageUrl"
          :maxlength="welfareEntryImageMax"
          show-word-limit
          clearable
          :disabled="!loaded"
          placeholder="图片地址，可以留空"
        />
        <el-image v-if="previewUrl" class="preview" :src="previewUrl" fit="cover">
          <template #error>
            <span class="preview__fallback">图片无法预览</span>
          </template>
        </el-image>
        <p v-else-if="draft.imageUrl.trim()" class="ops-hint">
          这个地址不会在这里预览，保存时仍会提交。
        </p>
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
.entry-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 640px;
}

.preview {
  width: 160px;
  height: 160px;
  margin-top: 12px;
  border: 1px solid var(--aurel-line);
  border-radius: 8px;
}

.preview__fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--aurel-muted);
  font-size: 13px;
}

.field-error {
  color: var(--el-color-danger);
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
