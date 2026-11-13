<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import {
  fetchStudioSettings,
  saveStudioSettings,
  studioExternalNameDefault,
  studioExternalNameMax,
  type StudioSettings,
} from '@/api/studio'
import { studioNamePayload, studioNameProblem, type StudioNameDraft } from './settings-form'

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const loaded = ref<StudioSettings | null>(null)
const draft = reactive<StudioNameDraft>({
  externalName: '',
})

const problem = computed(() => (loaded.value ? studioNameProblem(draft) : ''))

onMounted(() => {
  void load()
})

function applyLoaded(settings: StudioSettings): void {
  loaded.value = settings
  draft.externalName = settings.externalName
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    applyLoaded(await fetchStudioSettings())
    actionError.value = ''
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取对外名称失败')
  } finally {
    loading.value = false
  }
}

function restoreDefault(): void {
  draft.externalName = studioExternalNameDefault
}

async function save(): Promise<void> {
  if (!loaded.value || saving.value || loading.value) return
  const message = studioNameProblem(draft)
  if (message) {
    actionError.value = message
    return
  }
  saving.value = true
  actionError.value = ''
  try {
    applyLoaded(await saveStudioSettings(studioNamePayload(draft)))
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
      <h1>对外名称</h1>
    </header>
    <p class="ops-hint">
      对外名称默认是「{{ studioExternalNameDefault }}」，最长 {{ studioExternalNameMax }}
      字。保存只提交这个名称。改名称不会改奖励流水和可提现的显示分类，默认仍是「系统激励」。补贴比例在启动时锁定，这里不能修改，也不会随保存提交。每日报单检查时间也不在这里修改。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <el-form
      v-if="loaded"
      class="settings-form"
      label-position="top"
      :disabled="loading || saving"
      @submit.prevent="save"
    >
      <el-form-item label="对外名称">
        <el-input
          v-model="draft.externalName"
          :maxlength="studioExternalNameMax"
          show-word-limit
          clearable
          placeholder="补贴"
        />
      </el-form-item>
      <p class="ops-hint">
        恢复默认只把输入改回「{{ studioExternalNameDefault }}」，要点保存才会提交。
      </p>
      <p v-if="problem" class="field-error">{{ problem }}</p>
      <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />
      <div class="actions">
        <el-button
          type="primary"
          native-type="submit"
          :loading="saving"
          :disabled="Boolean(problem)"
        >
          保存
        </el-button>
        <el-button
          :disabled="draft.externalName.trim() === studioExternalNameDefault"
          @click="restoreDefault"
        >
          恢复默认
        </el-button>
        <el-button :disabled="loading || saving" @click="load">重新读取</el-button>
      </div>
    </el-form>
  </section>
</template>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 640px;
}

.field-error {
  color: var(--el-color-danger);
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
