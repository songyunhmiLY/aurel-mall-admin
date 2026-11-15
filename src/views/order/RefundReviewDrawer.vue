<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import { approveRefund, rejectRefund, type AdminRefund } from '@/api/refunds'
import { formatShanghaiTime } from '@/utils/datetime'
import { fenText } from './order-labels'
import { approveBody, previewRefundAmounts, type RefundAmountMode } from './refund-amounts'
import {
  optionalFenText,
  refundStatusLabel,
  refundStatusTag,
  wechatRefundStatusLabel,
  wechatRefundStatusTag,
} from './refund-labels'

const props = defineProps<{
  modelValue: boolean
  refund: AdminRefund | null
  /** 退款能力已下线后的只读模式：只展示明细，不提供审核动作。 */
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  reviewed: [refund: AdminRefund]
}>()

const acting = ref(false)
const actionError = ref('')
const mode = ref<RefundAmountMode>('refund')
const yuan = ref('')
const current = ref<AdminRefund | null>(null)

const preview = computed(() => {
  const row = current.value
  if (!row) return null
  return previewRefundAmounts(row.payAmountFen, mode.value, yuan.value)
})

const readyPreview = computed(() => (preview.value?.ok ? preview.value.preview : null))
const previewMessage = computed(() =>
  preview.value && !preview.value.ok ? preview.value.message : '',
)

watch(
  () => [props.modelValue, props.refund?.id] as const,
  ([open]) => {
    if (!open) {
      current.value = null
      actionError.value = ''
      resetForm()
      return
    }
    current.value = props.refund
    actionError.value = ''
    resetForm()
  },
)

watch(
  () => props.refund,
  (row) => {
    if (props.modelValue && row && row.id === current.value?.id) current.value = row
  },
)

watch(mode, () => {
  yuan.value = ''
  actionError.value = ''
})

function resetForm(): void {
  mode.value = 'refund'
  yuan.value = ''
}

async function submitApprove(): Promise<void> {
  const row = current.value
  const result = preview.value
  if (!row || acting.value || row.status !== 'pending' || !result) return
  if (!result.ok) {
    actionError.value = result.message
    return
  }
  const body = approveBody(mode.value, result.preview)
  const enteredLabel = mode.value === 'refund' ? '退款金额' : '减扣金额'
  const otherLabel = mode.value === 'refund' ? '减扣金额' : '退款金额'
  try {
    await ElMessageBox.confirm(
      h('div', { class: 'refund-confirm' }, [
        h('p', `只提交${enteredLabel} ${fenText(result.preview.enteredFen)}。`),
        h(
          'p',
          `${otherLabel} ${fenText(result.preview.otherFen)} 只是预览，由接口按应付计算，不会随请求发送。`,
        ),
        h('p', `应付（含运费）${fenText(row.payAmountFen)}，运费 ${fenText(row.freightFen)}。`),
        h('p', row.deductionHint || '运费和其他应扣费用不会自动计入减扣。'),
      ]),
      '通过退款',
      {
        confirmButtonText: '通过',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }
  acting.value = true
  actionError.value = ''
  try {
    const next = await approveRefund(row.id, body)
    current.value = next
    ElMessage.success('已通过')
    emit('reviewed', next)
  } catch (error) {
    actionError.value = apiErrorMessage(error, '通过失败')
    emit('reviewed', row)
  } finally {
    acting.value = false
  }
}

async function submitReject(): Promise<void> {
  const row = current.value
  if (!row || acting.value || row.status !== 'pending') return
  try {
    await ElMessageBox.confirm('确定驳回这笔退款申请？驳回后不能再审核。', '驳回退款', {
      confirmButtonText: '驳回',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  acting.value = true
  actionError.value = ''
  try {
    const next = await rejectRefund(row.id)
    current.value = next
    ElMessage.success('已驳回')
    emit('reviewed', next)
  } catch (error) {
    actionError.value = apiErrorMessage(error, '驳回失败')
    emit('reviewed', row)
  } finally {
    acting.value = false
  }
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="退款审核"
    size="min(720px, 100%)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="current" class="detail">
      <h2>申请</h2>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="申请 ID">{{ current.id }}</el-descriptions-item>
        <el-descriptions-item label="订单 ID">{{ current.orderId }}</el-descriptions-item>
        <el-descriptions-item label="用户 ID">{{ current.userId }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" effect="plain" :type="refundStatusTag(current.status)">
            {{ refundStatusLabel(current.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">
          {{ formatShanghaiTime(current.appliedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="审核时间">
          {{ formatShanghaiTime(current.decidedAt) }}
        </el-descriptions-item>
      </el-descriptions>

      <h2>金额</h2>
      <p class="hint">
        应付含运费。{{ current.deductionHint || '运费和其他应扣费用不会自动计入减扣。' }}
        可以少于整单退款。创业专区订单不能退款。
      </p>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="应付">{{
          fenText(current.payAmountFen)
        }}</el-descriptions-item>
        <el-descriptions-item label="运费">{{ fenText(current.freightFen) }}</el-descriptions-item>
        <el-descriptions-item label="退款金额">
          {{ optionalFenText(current.refundFen) }}
        </el-descriptions-item>
        <el-descriptions-item label="减扣金额">
          {{ optionalFenText(current.deductionFen) }}
        </el-descriptions-item>
        <el-descriptions-item label="微信退款">
          {{ optionalFenText(current.wechatRefundFen) }}
        </el-descriptions-item>
        <el-descriptions-item label="可提现减扣">
          {{ optionalFenText(current.withdrawableDeductionFen) }}
        </el-descriptions-item>
        <el-descriptions-item label="消费入账">
          {{ optionalFenText(current.consumptionCreditFen) }}
        </el-descriptions-item>
        <el-descriptions-item label="微信退款状态">
          <el-tag
            v-if="current.wechatRefundStatus"
            size="small"
            effect="plain"
            :type="wechatRefundStatusTag(current.wechatRefundStatus)"
          >
            {{ wechatRefundStatusLabel(current.wechatRefundStatus) }}
          </el-tag>
          <span v-else>—</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-alert
        v-if="props.readonly && current.status === 'pending'"
        class="notice"
        type="info"
        title="退款功能已下线，这笔历史申请不再支持审核"
        show-icon
        :closable="false"
      />

      <template v-if="!props.readonly && current.status === 'pending'">
        <h2>审核</h2>
        <p class="hint">只填写下面一项。另一项按应付预览，请求里不会带上。</p>
        <el-form label-position="top" @submit.prevent="submitApprove">
          <el-form-item label="填写哪一项">
            <el-radio-group v-model="mode">
              <el-radio value="refund">退款金额</el-radio>
              <el-radio value="deduction">减扣金额</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item :label="mode === 'refund' ? '退款金额（元）' : '减扣金额（元）'">
            <el-input v-model="yuan" placeholder="0.00" />
          </el-form-item>
          <el-descriptions v-if="readyPreview" :column="1" border>
            <el-descriptions-item
              :label="mode === 'refund' ? '将提交的退款金额' : '将提交的减扣金额'"
            >
              {{ fenText(readyPreview.enteredFen) }}
            </el-descriptions-item>
            <el-descriptions-item :label="mode === 'refund' ? '减扣金额预览' : '退款金额预览'">
              {{ fenText(readyPreview.otherFen) }}
            </el-descriptions-item>
          </el-descriptions>
          <p v-else-if="yuan.trim()" class="field-error">{{ previewMessage }}</p>
          <el-alert
            v-if="actionError"
            class="notice"
            type="error"
            :title="actionError"
            show-icon
            :closable="false"
          />
          <div class="actions">
            <el-button
              type="primary"
              native-type="submit"
              :loading="acting"
              :disabled="!readyPreview"
            >
              通过
            </el-button>
            <el-button :disabled="acting" @click="submitReject">驳回</el-button>
          </div>
        </el-form>
      </template>
    </div>
  </el-drawer>
</template>

<style scoped>
.detail {
  min-height: 240px;
}

h2 {
  margin: 20px 0 8px;
  font-size: 16px;
  font-weight: 600;
}

h2:first-child {
  margin-top: 0;
}

.hint {
  margin-bottom: 12px;
  color: var(--aurel-muted);
}

.notice {
  margin-top: 12px;
}

.field-error {
  color: var(--el-color-danger);
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
</style>

<style>
.refund-confirm p {
  margin: 0 0 8px;
  line-height: 1.6;
}

.refund-confirm p:last-child {
  margin-bottom: 0;
}
</style>
