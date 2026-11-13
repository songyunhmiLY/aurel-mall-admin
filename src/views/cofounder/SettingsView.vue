<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import {
  fetchCofounderSettings,
  saveCofounderSettings,
  type CofounderSettings,
} from '@/api/cofounder'
import { apiErrorMessage } from '@/api/http'
import { decimalFenText } from '@/api/money'
import { lockedRatioText, payoutModeOptions, scheduleCycleOptions, weekdayOptions } from './labels'
import {
  applySettingsDraft,
  cofounderSeatCapMax,
  emptySettingsDraft,
  settingsPayload,
  settingsProblem,
} from './settings-form'

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const loaded = ref<CofounderSettings | null>(null)
const draft = reactive(emptySettingsDraft())

const problem = computed(() => (loaded.value ? settingsProblem(draft) : ''))

onMounted(() => {
  void load()
})

function applyLoaded(settings: CofounderSettings): void {
  loaded.value = settings
  applySettingsDraft(draft, settings)
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    applyLoaded(await fetchCofounderSettings())
    actionError.value = ''
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取名额与分配失败')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!loaded.value || saving.value || loading.value) return
  const message = settingsProblem(draft)
  if (message) {
    actionError.value = message
    return
  }
  saving.value = true
  actionError.value = ''
  try {
    applyLoaded(await saveCofounderSettings(settingsPayload(draft)))
    loadError.value = ''
    ElMessage.success('已保存')
  } catch (error) {
    actionError.value = apiErrorMessage(error, '保存失败')
  } finally {
    saving.value = false
  }
}

function onAnchorDate(value: unknown): void {
  draft.schedule.anchorDate = typeof value === 'string' ? value : ''
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header>
      <h1>名额与分配</h1>
    </header>
    <p class="ops-hint">
      名额上限、用户端开通按钮、微信支付开通金额，以及四种互斥的分配方式。金额按元填写，提交的是分。分红比例来自运行配置，这里不能改，保存时也不会提交。改分配方式，或在定期分配下改周期、时刻、星期、每月日期、间隔天数或起始日期后，由服务端先处理当前池子。把池子总额或人均门槛改低，且当前池子已经达到新门槛时，保存也会由服务端分掉当前池子。这里没有单独的清池操作。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <div v-if="loaded" class="ops-grid">
      <article class="ops-card">
        <h2>当前</h2>
        <p>在籍 {{ loaded.enrolledCount }} 人</p>
        <p>池子余额 {{ decimalFenText(loaded.poolFen) }}</p>
        <p class="ops-hint">
          在籍人数可以高于名额上限。上限只拦住用户付款开通，管理员指定不受这个上限约束。池子余额在保存成功后按接口返回值更新。
        </p>
      </article>
      <article class="ops-card">
        <h2>锁定比例</h2>
        <p>创业专区 {{ lockedRatioText(loaded.lockedRates.startupDividendRatioBps) }}</p>
        <p>会员商城 {{ lockedRatioText(loaded.lockedRates.mallDividendRatioBps) }}</p>
        <p class="ops-hint">这两项只读。每日报单检查时间也不在这里修改。</p>
      </article>
    </div>

    <el-form
      v-if="loaded"
      class="settings-form"
      label-position="top"
      :disabled="loading || saving"
      @submit.prevent="save"
    >
      <h2>名额与开通</h2>
      <el-form-item label="名额上限">
        <el-input-number
          v-model="draft.seatCap"
          :min="0"
          :max="cofounderSeatCapMax"
          :step="1"
          :precision="0"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="用户端开通按钮">
        <el-switch v-model="draft.userButtonOpen" active-text="开放" inactive-text="关闭" />
        <p class="ops-hint">
          关闭后用户不能付款开通。取消某位联合创始人时，接口也会把这个按钮关掉。要重新开放，在这里打开并保存。开通金额为
          0 时，即使用户按钮开着，用户也不能下单。
        </p>
      </el-form-item>
      <el-form-item label="微信支付开通金额">
        <el-input v-model="draft.activationYuan" placeholder="0.00" class="money">
          <template #append>元</template>
        </el-input>
        <p class="ops-hint">0 表示尚未设置开通金额。页面按接口返回的金额显示，不另写默认值。</p>
      </el-form-item>

      <h2>分配方式</h2>
      <el-radio-group v-model="draft.payoutMode" class="modes">
        <div v-for="item in payoutModeOptions" :key="item.value" class="mode">
          <el-radio :value="item.value">{{ item.label }}</el-radio>
          <p class="ops-hint">{{ item.detail }}</p>
        </div>
      </el-radio-group>

      <h2>定期发放</h2>
      <p class="ops-hint">
        定期分配才会按这个周期发放。其他方式下这些值仍会随保存提交。发放时刻使用
        Asia/Shanghai，格式为 HH:mm。按间隔是从起始日期起，每隔设定天数发放一次。
      </p>
      <div class="schedule">
        <el-form-item label="发放周期">
          <el-select v-model="draft.schedule.cycle" class="field">
            <el-option
              v-for="item in scheduleCycleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="发放时刻">
          <el-input v-model="draft.schedule.time" maxlength="5" placeholder="00:00" class="field" />
        </el-form-item>
        <el-form-item label="每周发放日">
          <el-select v-model="draft.schedule.weekday" class="field">
            <el-option
              v-for="item in weekdayOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="每月发放日">
          <el-input-number
            v-model="draft.schedule.monthDay"
            :min="1"
            :max="31"
            :step="1"
            :precision="0"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="间隔天数">
          <el-input-number
            v-model="draft.schedule.intervalDays"
            :min="1"
            :max="366"
            :step="1"
            :precision="0"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="起始日期">
          <el-date-picker
            :model-value="draft.schedule.anchorDate || null"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="起始日期"
            class="field"
            @update:model-value="onAnchorDate"
          />
        </el-form-item>
      </div>

      <h2>门槛</h2>
      <el-form-item label="池子总额">
        <el-input v-model="draft.poolThresholdYuan" placeholder="0.00" class="money">
          <template #append>元</template>
        </el-input>
        <p class="ops-hint">按池子总额分配时必须大于 0。其他方式下仍会保存这个值，可以为 0。</p>
      </el-form-item>
      <el-form-item label="人均额度">
        <el-input v-model="draft.perPersonThresholdYuan" placeholder="0.00" class="money">
          <template #append>元</template>
        </el-input>
        <p class="ops-hint">按人均额度分配时必须大于 0。其他方式下仍会保存这个值，可以为 0。</p>
      </el-form-item>

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
  max-width: 760px;
}

.settings-form h2 {
  margin-top: 8px;
}

.money,
.field {
  width: 220px;
}

.modes {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.mode {
  padding: 8px 12px;
  border: 1px solid var(--aurel-line);
  border-radius: 8px;
}

.schedule {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px 16px;
}

.field-error {
  color: var(--el-color-danger);
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
