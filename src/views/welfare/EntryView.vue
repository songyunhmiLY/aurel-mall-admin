<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import { formatDecimalFen, yuanInputToFenString } from '@/api/money'
import RichTextWithSource from '@/components/RichTextWithSource.vue'
import PhonePreview from '@/components/PhonePreview.vue'
import {
  deleteWelfarePoolOverride,
  fetchWelfareEntry,
  fetchWelfarePoolOverrides,
  saveWelfareEntry,
  saveWelfarePoolOverride,
  type WelfareEntry,
  type WelfarePoolOverride,
} from '@/api/welfare'
import { formatShanghaiTime } from '@/utils/datetime'
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

const poolLoading = ref(false)
const poolSaving = ref(false)
const poolError = ref('')
const poolOverrides = ref<WelfarePoolOverride[]>([])
const poolForm = reactive({
  bizDate: '',
  amountYuan: '',
})
const poolSubmittingDate = ref('')

const problem = computed(() => welfareEntryProblem(draft))
const previewUrl = computed(() => welfareEntryPreviewUrl(draft.imageUrl))
const previewVisible = ref(false)

const poolAmountProblem = computed(() => {
  if (!poolForm.bizDate) return '请选择日期'
  if (poolForm.amountYuan.trim() === '') return '请输入金额'
  return ''
})

const poolSaveDisabled = computed(
  () => !loaded.value || poolSaving.value || Boolean(poolAmountProblem.value),
)

onMounted(() => {
  void load()
  void loadPoolOverrides()
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

async function loadPoolOverrides(): Promise<void> {
  poolLoading.value = true
  poolError.value = ''
  try {
    poolOverrides.value = await fetchWelfarePoolOverrides()
  } catch (error) {
    poolError.value = apiErrorMessage(error, '读取金额池设置失败')
  } finally {
    poolLoading.value = false
  }
}

async function savePoolOverride(): Promise<void> {
  if (poolSaveDisabled.value) return
  const bizDate = poolForm.bizDate
  const fen = yuanInputToFenString(poolForm.amountYuan)
  if (!bizDate || fen === null) {
    poolError.value = '日期或金额不正确'
    return
  }
  poolSaving.value = true
  poolError.value = ''
  try {
    const saved = await saveWelfarePoolOverride({ bizDate, amountFen: fen })
    const index = poolOverrides.value.findIndex((item) => item.bizDate === saved.bizDate)
    if (index >= 0) {
      poolOverrides.value.splice(index, 1, saved)
    } else {
      poolOverrides.value = [saved, ...poolOverrides.value].sort((a, b) =>
        a.bizDate < b.bizDate ? 1 : -1,
      )
    }
    poolForm.bizDate = ''
    poolForm.amountYuan = ''
    ElMessage.success(`已保存 ${saved.bizDate} 的红包金额池`)
  } catch (error) {
    poolError.value = apiErrorMessage(error, '保存金额池设置失败')
  } finally {
    poolSaving.value = false
  }
}

async function removePoolOverride(row: WelfarePoolOverride): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `删除后 ${row.bizDate} 将恢复按销售额计提的红包金额池（该日未结算才有效）。确定删除？`,
      '删除金额池设置',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  poolSubmittingDate.value = row.bizDate
  poolError.value = ''
  try {
    await deleteWelfarePoolOverride(row.bizDate)
    poolOverrides.value = poolOverrides.value.filter((item) => item.bizDate !== row.bizDate)
    ElMessage.success('已删除')
  } catch (error) {
    poolError.value = apiErrorMessage(error, '删除金额池设置失败')
  } finally {
    poolSubmittingDate.value = ''
  }
}

function editPoolOverride(row: WelfarePoolOverride): void {
  poolForm.bizDate = row.bizDate
  poolForm.amountYuan = formatDecimalFen(row.amountFen)
}

function poolAmountText(row: WelfarePoolOverride): string {
  return `${formatDecimalFen(row.amountFen)} 元`
}

function poolTimeText(row: WelfarePoolOverride): string {
  return row.updatedAt ? formatShanghaiTime(row.updatedAt) : '—'
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header>
      <h1>入口配置</h1>
    </header>
    <p class="ops-hint">
      配置小程序首页福利专场入口的文案和图片。文案支持图文混排（富文本 HTML，最多
      {{ welfareEntryCopyMax }} 字符），图片地址最多
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
        <RichTextWithSource
          v-model="draft.copy"
          placeholder="首页入口文案，支持图文混排"
          :height="300"
          :disabled="!loaded"
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
      <el-form-item label="手机端预览">
        <el-button :disabled="!loaded" @click="previewVisible = true">
          查看小程序 / H5 效果
        </el-button>
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

    <el-divider />

    <header>
      <h1>指定日期红包金额池</h1>
    </header>
    <p class="ops-hint">
      为指定日期（Asia/Shanghai 自然日）设置固定的红包发放金额池。该日结算时使用设置金额覆盖按销售额计提的奖池，
      报名人数均分、不足一分留在系统的规则不变；设置为 0 表示当日不发红包。
      未设置日期的仍按原红包金额池结算。设置必须在当天红包结算前完成，已结算的日期不能再设置。
    </p>
    <el-alert v-if="poolError" type="error" :title="poolError" show-icon :closable="false" />

    <el-form class="entry-form" label-position="top" @submit.prevent="savePoolOverride">
      <div class="pool-inputs">
        <el-form-item label="日期">
          <el-date-picker
            v-model="poolForm.bizDate"
            type="date"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            :clearable="false"
            placeholder="选择日期"
          />
        </el-form-item>
        <el-form-item label="金额池（元）">
          <el-input
            v-model="poolForm.amountYuan"
            placeholder="例如 5000 或 5000.50"
            class="pool-amount"
          />
        </el-form-item>
        <el-button
          type="primary"
          native-type="submit"
          :loading="poolSaving"
          :disabled="poolSaveDisabled"
        >
          保存设置
        </el-button>
      </div>
    </el-form>

    <el-table
      v-loading="poolLoading"
      class="pool-table"
      :data="poolOverrides"
      empty-text="还没有设置任何日期"
    >
      <el-table-column prop="bizDate" label="日期" width="130" />
      <el-table-column label="金额池" width="140">
        <template #default="{ row }">{{ poolAmountText(row) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="180">
        <template #default="{ row }">
          <el-tag v-if="row.settled" type="info">已结算（不再生效）</el-tag>
          <el-tag v-else type="success">待结算</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" min-width="170">
        <template #default="{ row }">{{ poolTimeText(row) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" :disabled="poolSaving" @click="editPoolOverride(row)">
            修改
          </el-button>
          <el-button
            link
            type="danger"
            :loading="poolSubmittingDate === row.bizDate"
            :disabled="poolSaving"
            @click="removePoolOverride(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 小程序 / H5 福利专场页预览 -->
    <el-drawer v-model="previewVisible" title="小程序 / H5 效果预览" size="460px">
      <PhonePreview title="福利专场">
        <div class="welfare-preview">
          <img v-if="previewUrl" class="welfare-preview__cover" :src="previewUrl" alt="入口图片" />
          <div class="welfare-preview__hero">
            <span class="welfare-preview__kicker">WELFARE</span>
            <span class="welfare-preview__title">福利专场</span>
            <div class="rich-body" v-html="draft.copy || ''" />
          </div>
        </div>
      </PhonePreview>
    </el-drawer>
  </section>
</template>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 640px;
}

/* 手机预览里的福利专场排版（对齐 uniapp welfare 页） */
.welfare-preview__cover {
  width: 100%;
  height: 170px;
  object-fit: cover;
  display: block;
}

.welfare-preview__hero {
  padding: 20px 16px;
  background: linear-gradient(180deg, #221a10 0%, #3a2c16 100%);
}

.welfare-preview__kicker {
  display: block;
  color: #d8b26e;
  font-size: 11px;
  letter-spacing: 3px;
}

.welfare-preview__title {
  display: block;
  margin-top: 4px;
  color: #f4e6c8;
  font-size: 24px;
  font-weight: 600;
}

.welfare-preview .rich-body {
  margin-top: 10px;
  color: #e8dcc2;
}

.pool-inputs {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.pool-inputs .el-form-item {
  margin-bottom: 0;
}

.pool-inputs .el-button {
  margin-top: 4px;
}

.pool-amount {
  width: 200px;
}

.pool-table {
  max-width: 860px;
  margin-top: 8px;
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
