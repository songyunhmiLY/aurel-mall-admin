<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import {
  fetchNotificationSettings,
  notifyPageMax,
  notifyRegionMax,
  notifySdkAppIdMax,
  notifySecretMax,
  notifySignNameMax,
  notifySlotLimit,
  notifySlotNameMax,
  notifySmsTemplateMax,
  notifyWechatTemplateMax,
  saveNotificationSettings,
  type NotificationSettings,
  type NotifyChannel,
} from '@/api/notifications'
import { formatShanghaiTime } from '@/utils/datetime'
import {
  applyNotificationDraft,
  blankSlot,
  deliveryModeOptions,
  emptyNotificationDraft,
  eventLabel,
  fieldLabel,
  notificationStatusCopy,
  prepareNotificationSave,
  secretKeyDisplay,
  smsStatusCopy,
  type NotificationEventDraft,
  type NotificationSlotDraft,
} from './notification-form'

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const loaded = ref<NotificationSettings | null>(null)
const draft = reactive(emptyNotificationDraft())

const status = computed(() => (loaded.value ? notificationStatusCopy(loaded.value) : null))
const smsStatus = computed(() => (loaded.value ? smsStatusCopy(loaded.value) : null))

onMounted(() => {
  void load()
})

function applyLoaded(settings: NotificationSettings): void {
  loaded.value = settings
  applyNotificationDraft(draft, settings)
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    applyLoaded(await fetchNotificationSettings())
    actionError.value = ''
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取消息推送配置失败')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!loaded.value || saving.value || loading.value) return
  const prepared = prepareNotificationSave(draft, loaded.value)
  if (!prepared.ok) {
    actionError.value = prepared.message
    return
  }
  saving.value = true
  actionError.value = ''
  try {
    applyLoaded(await saveNotificationSettings(prepared.body))
    loadError.value = ''
    ElMessage.success('已保存')
  } catch (error) {
    actionError.value = apiErrorMessage(error, '保存失败')
  } finally {
    saving.value = false
  }
}

function slotsFor(event: NotificationEventDraft, channel: NotifyChannel): NotificationSlotDraft[] {
  return event.slots.filter((slot) => slot.channel === channel)
}

function addSlot(event: NotificationEventDraft, channel: NotifyChannel): void {
  if (saving.value || event.slots.length >= notifySlotLimit) return
  const slot = blankSlot(channel, event.fields)
  if (!slot) return
  event.slots.push(slot)
}

function removeSlot(event: NotificationEventDraft, key: number): void {
  const index = event.slots.findIndex((slot) => slot.key === key)
  if (index >= 0) event.slots.splice(index, 1)
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header class="page-head">
      <h1>消息推送</h1>
      <el-tag v-if="status" effect="plain" :type="status.alertType">{{ status.tag }}</el-tag>
    </header>
    <p class="ops-hint">
      各事件单独开关。推送方式对所有已开启的事件一起生效，可选微信通知、短信，或两者。微信通知通过小程序服务通知送达，短信采用腾讯云短信。这里填写各事件的模板
      ID，并把金额、时间、单号等业务数据填入模板空位，不撰写正文。未指定跳转页面时打开「我的」。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
    <el-alert
      v-if="status && loaded"
      :type="status.alertType"
      :title="status.title"
      show-icon
      :closable="false"
    />
    <p v-if="loaded?.updatedAt" class="ops-meta">
      最近保存 {{ formatShanghaiTime(loaded.updatedAt) }}
    </p>

    <el-form
      v-if="loaded"
      class="form"
      label-position="top"
      :disabled="loading || saving"
      @submit.prevent="save"
    >
      <div class="settings-block">
        <el-form-item label="推送方式">
          <el-radio-group v-model="draft.deliveryMode">
            <el-radio v-for="item in deliveryModeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <div class="section-head">
          <h2>短信</h2>
          <el-tag v-if="smsStatus" effect="plain" :type="smsStatus.alertType">
            {{ smsStatus.tag }}
          </el-tag>
        </div>
        <p class="ops-hint">{{ smsStatus?.title }}</p>
        <el-form-item label="SecretId">
          <el-input
            v-model="draft.secretId"
            :maxlength="notifySecretMax"
            autocomplete="off"
            spellcheck="false"
            placeholder="腾讯云 SecretId"
          />
        </el-form-item>
        <el-form-item label="密钥">
          <p class="ops-hint">当前：{{ secretKeyDisplay(loaded.sms.secretKeyMasked) }}</p>
          <el-input
            v-model="draft.secretKey"
            type="password"
            show-password
            :maxlength="notifySecretMax"
            autocomplete="off"
            spellcheck="false"
            placeholder="已配置时留空表示不修改"
          />
        </el-form-item>
        <el-form-item label="应用 ID">
          <el-input
            v-model="draft.sdkAppId"
            :maxlength="notifySdkAppIdMax"
            autocomplete="off"
            spellcheck="false"
            placeholder="短信应用 ID"
          />
        </el-form-item>
        <el-form-item label="签名">
          <el-input
            v-model="draft.signName"
            :maxlength="notifySignNameMax"
            autocomplete="off"
            placeholder="短信签名"
          />
        </el-form-item>
        <el-form-item label="地域">
          <el-input
            v-model="draft.region"
            :maxlength="notifyRegionMax"
            autocomplete="off"
            spellcheck="false"
            placeholder="ap-guangzhou"
          />
          <p class="ops-hint">留空表示清空。未保存地域时，发送使用 ap-guangzhou。</p>
        </el-form-item>
      </div>

      <article v-for="event in draft.events" :key="event.event" class="ops-card">
        <header class="event-head">
          <div>
            <h2>{{ eventLabel(event.event) }}</h2>
            <p class="ops-meta">{{ event.event }}</p>
          </div>
          <el-switch v-model="event.enabled" active-text="开启" inactive-text="关闭" />
        </header>
        <el-form-item label="微信模板 ID">
          <el-input
            v-model="event.wechatTemplateId"
            :maxlength="notifyWechatTemplateMax"
            autocomplete="off"
            spellcheck="false"
            placeholder="留空表示清空"
          />
        </el-form-item>
        <el-form-item label="短信模板 ID">
          <el-input
            v-model="event.smsTemplateId"
            :maxlength="notifySmsTemplateMax"
            autocomplete="off"
            spellcheck="false"
            placeholder="数字模板 ID，留空表示清空"
          />
        </el-form-item>
        <el-form-item label="跳转页面">
          <el-input
            v-model="event.pagePath"
            :maxlength="notifyPageMax"
            autocomplete="off"
            spellcheck="false"
            :placeholder="loaded.defaultPagePath"
          />
          <p class="ops-hint">留空时打开「我的」。填写小程序页面，不能填 http 或 https。</p>
        </el-form-item>

        <div class="slot-group">
          <p class="ops-meta">微信模板空位。关键词与模板一致，例如 amount1。</p>
          <div v-for="slot in slotsFor(event, 'wechat')" :key="slot.key" class="slot-row">
            <el-input
              v-model="slot.slot"
              class="slot-name"
              :maxlength="notifySlotNameMax"
              spellcheck="false"
              placeholder="amount1"
            />
            <el-select v-model="slot.field" class="slot-field">
              <el-option
                v-for="field in event.fields"
                :key="field"
                :label="fieldLabel(field)"
                :value="field"
              />
            </el-select>
            <el-button link type="primary" @click="removeSlot(event, slot.key)">删除</el-button>
          </div>
          <el-button
            :disabled="event.slots.length >= notifySlotLimit || event.fields.length === 0"
            @click="addSlot(event, 'wechat')"
          >
            添加空位
          </el-button>
        </div>

        <div class="slot-group">
          <p class="ops-meta">短信模板空位。按顺序对应 1、2、3，不能跳号。</p>
          <div v-for="(slot, index) in slotsFor(event, 'sms')" :key="slot.key" class="slot-row">
            <span class="slot-index">{{ index + 1 }}</span>
            <el-select v-model="slot.field" class="slot-field">
              <el-option
                v-for="field in event.fields"
                :key="field"
                :label="fieldLabel(field)"
                :value="field"
              />
            </el-select>
            <el-button link type="primary" @click="removeSlot(event, slot.key)">删除</el-button>
          </div>
          <el-button
            :disabled="event.slots.length >= notifySlotLimit || event.fields.length === 0"
            @click="addSlot(event, 'sms')"
          >
            添加空位
          </el-button>
        </div>
      </article>

      <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />
      <div class="actions">
        <el-button type="primary" native-type="submit" :loading="saving">保存</el-button>
        <el-button :disabled="loading || saving" @click="load">重新读取</el-button>
      </div>
    </el-form>
    <div v-else class="actions">
      <el-button :disabled="loading" @click="load">重新读取</el-button>
    </div>
  </section>
</template>

<style scoped>
.page-head,
.section-head,
.event-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.event-head {
  justify-content: space-between;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-block {
  max-width: 640px;
}

.slot-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slot-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.slot-name,
.slot-field {
  width: 180px;
}

.slot-index {
  width: 2em;
  color: var(--aurel-muted);
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
