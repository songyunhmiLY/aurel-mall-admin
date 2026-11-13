<script setup lang="ts">
import { h, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import { decimalFenText } from '@/api/money'
import {
  fetchWithdrawal,
  payoutWithdrawal,
  rejectWithdrawal,
  type AdminWithdrawal,
} from '@/api/withdrawals'
import { formatShanghaiTime } from '@/utils/datetime'
import {
  settlementOutcomeLabel,
  withdrawalStatusLabel,
  withdrawalStatusTag,
} from './withdrawal-labels'

const props = defineProps<{
  modelValue: boolean
  withdrawalId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  changed: []
}>()

const loading = ref(false)
const acting = ref(false)
const loadError = ref('')
const actionError = ref('')
const withdrawal = ref<AdminWithdrawal | null>(null)

watch(
  () => [props.modelValue, props.withdrawalId] as const,
  ([open, id]) => {
    if (open && id) void load(id)
    if (!open) {
      withdrawal.value = null
      loadError.value = ''
      actionError.value = ''
    }
  },
)

async function load(id: string): Promise<void> {
  loading.value = true
  loadError.value = ''
  actionError.value = ''
  try {
    withdrawal.value = await fetchWithdrawal(id)
  } catch (error) {
    withdrawal.value = null
    loadError.value = apiErrorMessage(error, '读取提现申请失败')
  } finally {
    loading.value = false
  }
}

function payoutMessage(row: AdminWithdrawal) {
  return h('div', { class: 'payout-confirm' }, [
    h('p', '系统不会自动打款。请确认财务已经完成线下转账。'),
    h('p', `申请金额：${decimalFenText(row.amountFen)}`),
    h('p', '手续费：按本次确认时的锁定手续费计算，不是申请时的手续费。'),
    h(
      'p',
      `实际打款：${decimalFenText(row.amountFen)} − 手续费。转到银行卡的是这一金额，不是申请金额全额。`,
    ),
    h('p', `开户名：${row.accountName || '—'}`),
    h('p', `开户银行：${row.bankName || '—'}`),
    h('p', `银行卡号：${row.accountNo || '—'}`),
    h('p', `开户支行：${row.branchName || '—'}`),
    h('p', '若当前手续费高于申请金额，打款会被拒绝，冻结金额保持不变。'),
  ])
}

async function confirmPayout(): Promise<void> {
  const row = withdrawal.value
  if (!row || acting.value || row.status !== 'pending') return
  try {
    await ElMessageBox.confirm(payoutMessage(row), '确认已打款', {
      confirmButtonText: '已完成线下打款',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  acting.value = true
  actionError.value = ''
  try {
    const next = await payoutWithdrawal(row.id)
    withdrawal.value = next
    const fee = decimalFenText(next.settlement?.feeFen ?? null)
    const payout = decimalFenText(next.settlement?.payoutFen ?? null)
    ElMessage.success(`已记录打款。手续费 ${fee}，实际打款 ${payout}。`)
    emit('changed')
  } catch (error) {
    actionError.value = apiErrorMessage(error, '打款失败')
    emit('changed')
    await refreshQuietly(row.id)
  } finally {
    acting.value = false
  }
}

async function confirmReject(): Promise<void> {
  const row = withdrawal.value
  if (!row || acting.value || row.status !== 'pending') return
  try {
    await ElMessageBox.confirm('确定驳回？驳回后申请金额会解冻，不会打款。', '驳回提现', {
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
    withdrawal.value = await rejectWithdrawal(row.id)
    ElMessage.success('已驳回')
    emit('changed')
  } catch (error) {
    actionError.value = apiErrorMessage(error, '驳回失败')
    emit('changed')
    await refreshQuietly(row.id)
  } finally {
    acting.value = false
  }
}

async function refreshQuietly(id: string): Promise<void> {
  try {
    withdrawal.value = await fetchWithdrawal(id)
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取提现申请失败')
  }
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="提现详情"
    size="min(720px, 100%)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading" class="detail">
      <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
      <template v-if="withdrawal">
        <h2>申请</h2>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请 ID">{{ withdrawal.id }}</el-descriptions-item>
          <el-descriptions-item label="用户 ID">{{ withdrawal.userId }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag size="small" effect="plain" :type="withdrawalStatusTag(withdrawal.status)">
              {{ withdrawalStatusLabel(withdrawal.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="申请金额">
            {{ decimalFenText(withdrawal.amountFen) }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatShanghaiTime(withdrawal.appliedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <h2>收款账户</h2>
        <p class="hint">这是申请时复制的账户。之后用户修改收款账户，不会改这笔申请。</p>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="开户名">
            {{ withdrawal.accountName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="开户银行">
            {{ withdrawal.bankName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="银行卡号">
            <span class="account-no">{{ withdrawal.accountNo || '—' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="开户支行">
            {{ withdrawal.branchName || '—' }}
          </el-descriptions-item>
        </el-descriptions>

        <h2>打款</h2>
        <template v-if="withdrawal.status === 'pending'">
          <el-alert
            class="notice"
            type="warning"
            show-icon
            :closable="false"
            title="系统不会自动打款。请在财务已经完成线下转账后再确认。"
          />
          <el-descriptions :column="1" border>
            <el-descriptions-item label="申请金额">
              {{ decimalFenText(withdrawal.amountFen) }}
            </el-descriptions-item>
            <el-descriptions-item label="手续费">
              按本次确认时的锁定手续费计算，不是申请时的手续费
            </el-descriptions-item>
            <el-descriptions-item label="实际打款">
              {{ decimalFenText(withdrawal.amountFen) }} − 手续费。转到银行卡的是这一金额
            </el-descriptions-item>
          </el-descriptions>
          <el-alert
            v-if="actionError"
            class="notice"
            type="error"
            :title="actionError"
            show-icon
            :closable="false"
          />
          <div class="actions">
            <el-button type="primary" :loading="acting" @click="confirmPayout"
              >确认已打款</el-button
            >
            <el-button :disabled="acting" @click="confirmReject">驳回</el-button>
          </div>
        </template>
        <template v-else-if="withdrawal.settlement">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="结果">
              {{ settlementOutcomeLabel(withdrawal.settlement.outcome) }}
            </el-descriptions-item>
            <el-descriptions-item label="处理人">
              {{ withdrawal.settlement.adminId }}
            </el-descriptions-item>
            <el-descriptions-item label="申请金额">
              {{ decimalFenText(withdrawal.settlement.amountFen) }}
            </el-descriptions-item>
            <el-descriptions-item label="手续费">
              {{ decimalFenText(withdrawal.settlement.feeFen) }}
            </el-descriptions-item>
            <el-descriptions-item label="实际打款">
              {{ decimalFenText(withdrawal.settlement.payoutFen) }}
            </el-descriptions-item>
            <el-descriptions-item label="处理时间">
              {{ formatShanghaiTime(withdrawal.settlement.settledAt) }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
        <p v-else class="hint">还没有结算记录。</p>
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
  margin-bottom: 12px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.account-no {
  word-break: break-all;
}
</style>

<style>
.payout-confirm p {
  margin: 0 0 8px;
  line-height: 1.6;
}

.payout-confirm p:last-child {
  margin-bottom: 0;
}
</style>
