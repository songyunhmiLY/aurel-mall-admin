<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import {
  fetchWechatPaySettings,
  saveWechatPaySettings,
  type WechatPaySettings,
} from '@/api/wechat-pay'
import {
  buildWechatPayUpdate,
  secretDisplay,
  wechatPayStatusCopy,
  type WechatPayDraft,
} from './wechat-pay-form'

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const loaded = ref<WechatPaySettings | null>(null)
const certificateInput = ref<HTMLInputElement | null>(null)
const draft = reactive<WechatPayDraft>({
  mchId: '',
  apiCertificate: '',
  apiV3Key: '',
})

const status = computed(() => (loaded.value ? wechatPayStatusCopy(loaded.value) : null))

onMounted(() => {
  void load()
})

function applyLoaded(settings: WechatPaySettings): void {
  loaded.value = settings
  draft.mchId = settings.mchId
  draft.apiCertificate = ''
  draft.apiV3Key = ''
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    applyLoaded(await fetchWechatPaySettings())
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取微信支付配置失败')
    if (!loaded.value) {
      applyLoaded({ mchId: '', apiCertificate: '', apiV3Key: '', configured: false })
    }
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!loaded.value || saving.value) return
  saving.value = true
  actionError.value = ''
  try {
    const saved = await saveWechatPaySettings(buildWechatPayUpdate(draft, loaded.value))
    applyLoaded(saved)
    loadError.value = ''
    ElMessage.success('已保存')
  } catch (error) {
    actionError.value = apiErrorMessage(error, '保存失败')
  } finally {
    saving.value = false
  }
}

function chooseCertificate(): void {
  certificateInput.value?.click()
}

function onCertificateFile(event: Event): void {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 1024 * 1024) {
    actionError.value = '证书文件过大'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const text = typeof reader.result === 'string' ? reader.result : ''
    if (!text.trim()) {
      actionError.value = '证书文件是空的'
      return
    }
    if (text.includes('\u0000')) {
      actionError.value = '请选择 PEM 文本证书，不要选择二进制文件'
      return
    }
    draft.apiCertificate = text.trim()
    actionError.value = ''
  }
  reader.onerror = () => {
    actionError.value = '读取证书文件失败'
  }
  reader.readAsText(file)
}
</script>

<template>
  <section v-loading="loading" class="page">
    <header class="page__header">
      <h1>微信支付</h1>
      <el-tag v-if="status" effect="plain" :type="status.alertType">{{ status.tag }}</el-tag>
    </header>
    <p class="hint">
      商户号、API 证书和 APIv3 密钥通过接口保存到服务器，不写入前端环境变量或仓库。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
    <el-alert
      v-if="status"
      :type="status.alertType"
      :title="status.title"
      show-icon
      :closable="false"
    />
    <el-form label-position="top" :disabled="loading || saving" @submit.prevent="save">
      <el-form-item label="商户号">
        <el-input v-model="draft.mchId" autocomplete="off" placeholder="微信支付商户号" />
      </el-form-item>
      <el-form-item label="API 证书">
        <p class="current">当前：{{ secretDisplay(loaded?.apiCertificate ?? '') }}</p>
        <el-input
          v-model="draft.apiCertificate"
          type="textarea"
          :rows="6"
          spellcheck="false"
          autocomplete="off"
          placeholder="粘贴 PEM 文本。已配置时留空表示不修改"
        />
        <div class="file-row">
          <el-button @click="chooseCertificate">选择证书文件</el-button>
          <input
            ref="certificateInput"
            class="file-input"
            type="file"
            accept=".pem,.crt,.cer,.txt,text/plain"
            @change="onCertificateFile"
          />
        </div>
      </el-form-item>
      <el-form-item label="APIv3 密钥">
        <p class="current">当前：{{ secretDisplay(loaded?.apiV3Key ?? '') }}</p>
        <el-input
          v-model="draft.apiV3Key"
          type="password"
          show-password
          autocomplete="off"
          placeholder="填写新的 APIv3 密钥。已配置时留空表示不修改"
        />
      </el-form-item>
      <el-alert
        v-if="actionError"
        class="action-error"
        type="error"
        :title="actionError"
        show-icon
        :closable="false"
      />
      <div class="actions">
        <el-button type="primary" native-type="submit" :loading="saving">保存</el-button>
        <el-button :disabled="loading || saving" @click="load">重新读取</el-button>
      </div>
    </el-form>
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

.page__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page__header h1 {
  font-size: 20px;
  font-weight: 600;
}

.hint,
.current {
  color: var(--aurel-muted);
}

.current {
  margin-bottom: 8px;
  max-height: 120px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.file-row {
  margin-top: 8px;
}

.file-input {
  display: none;
}

.action-error {
  margin-bottom: 12px;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
