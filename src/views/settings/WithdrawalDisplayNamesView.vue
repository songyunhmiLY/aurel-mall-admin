<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import {
  fetchWithdrawalDisplayNames,
  saveWithdrawalDisplayNames,
  type WithdrawalDisplayName,
} from '@/api/withdrawal-display-names'
import {
  displayNamePayload,
  displayNameProblem,
  groupDisplayNames,
  officialDefaultName,
  type DisplayNameDraft,
} from './withdrawal-display-form'

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const drafts = ref<DisplayNameDraft[]>([])

const groups = computed(() => groupDisplayNames(drafts.value))
const problem = computed(() => displayNameProblem(drafts.value))

onMounted(() => {
  void load()
})

function applyLoaded(items: WithdrawalDisplayName[]): void {
  drafts.value = items.map((item) => ({
    sourceCode: item.sourceCode,
    displayName: item.displayName,
  }))
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    applyLoaded(await fetchWithdrawalDisplayNames())
    actionError.value = ''
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取提现分类失败')
  } finally {
    loading.value = false
  }
}

function restoreDefault(row: DisplayNameDraft): void {
  const name = officialDefaultName(row.sourceCode)
  if (!name) return
  row.displayName = name
}

async function save(): Promise<void> {
  if (saving.value || loading.value) return
  const message = displayNameProblem(drafts.value)
  if (message) {
    actionError.value = message
    return
  }
  saving.value = true
  actionError.value = ''
  try {
    applyLoaded(await saveWithdrawalDisplayNames(displayNamePayload(drafts.value)))
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
  <section v-loading="loading" class="page">
    <header class="page__header">
      <h1>提现分类</h1>
    </header>
    <p class="hint">
      每个来源有一个显示名。显示名相同的来源会合并成一个分类。可以改名，不能新增或删除来源。默认是：系统奖励、系统激励、平台分红、系统红包、销售激励、幸运返还、业绩奖。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <el-table :data="drafts" empty-text="没有提现分类">
      <el-table-column label="来源" min-width="180">
        <template #default="{ row }">
          <code>{{ row.sourceCode }}</code>
        </template>
      </el-table-column>
      <el-table-column label="默认显示名" min-width="120">
        <template #default="{ row }">{{ officialDefaultName(row.sourceCode) || '—' }}</template>
      </el-table-column>
      <el-table-column label="显示名" min-width="220">
        <template #default="{ row }">
          <el-input v-model="row.displayName" maxlength="64" :disabled="saving" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110">
        <template #default="{ row }">
          <el-button
            v-if="officialDefaultName(row.sourceCode)"
            link
            type="primary"
            :disabled="saving"
            @click="restoreDefault(row)"
          >
            恢复默认
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="groups.length" class="groups">
      <h2>合并预览</h2>
      <p class="hint">保存后，会员看到的是显示名。同名来源会计入同一个分类。</p>
      <ul>
        <li v-for="group in groups" :key="group.displayName">
          <strong>{{ group.displayName }}</strong>
          <span>{{ group.sourceCodes.join('、') }}</span>
        </li>
      </ul>
    </div>

    <p v-if="!loading && drafts.length && problem" class="field-error">{{ problem }}</p>
    <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />

    <div class="actions">
      <el-button
        type="primary"
        :loading="saving"
        :disabled="loading || Boolean(problem)"
        @click="save"
      >
        保存
      </el-button>
      <el-button :disabled="loading || saving" @click="load">重新读取</el-button>
    </div>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 360px;
  padding: 20px 24px;
  background: var(--aurel-surface);
  border: 1px solid var(--aurel-line);
  border-radius: 12px;
}

.page__header h1,
.groups h2 {
  font-size: 20px;
  font-weight: 600;
}

.groups h2 {
  font-size: 16px;
}

.hint {
  color: var(--aurel-muted);
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.groups ul {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.groups li {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
}

.groups span {
  color: var(--aurel-muted);
}

.field-error {
  color: var(--el-color-danger);
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
