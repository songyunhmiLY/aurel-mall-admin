<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  cancelCofounder,
  fetchCofounderCancellation,
  type CofounderAwardTotal,
  type CofounderCancellation,
  type CofounderWithdrawalDetail,
} from '@/api/cofounder'
import { apiErrorMessage } from '@/api/http'
import { decimalFenText } from '@/api/money'
import { memberFlagLabel } from '@/api/members'
import { formatShanghaiTime } from '@/utils/datetime'
import {
  settlementOutcomeLabel,
  withdrawalStatusLabel,
  withdrawalStatusTag,
} from '@/views/finance/withdrawal-labels'
import { cofounderSourceLabel } from './labels'

const props = defineProps<{
  modelValue: boolean
  userId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  changed: []
}>()

const loading = ref(false)
const acting = ref(false)
const loadError = ref('')
const actionError = ref('')
const review = ref<CofounderCancellation | null>(null)

watch(
  () => [props.modelValue, props.userId] as const,
  ([open, userId]) => {
    if (open && userId) void load(userId)
    if (!open) {
      review.value = null
      loadError.value = ''
      actionError.value = ''
    }
  },
)

async function load(userId: string): Promise<void> {
  loading.value = true
  loadError.value = ''
  actionError.value = ''
  try {
    review.value = await fetchCofounderCancellation(userId)
  } catch (error) {
    review.value = null
    loadError.value = apiErrorMessage(error, '读取取消审核失败')
  } finally {
    loading.value = false
  }
}

async function confirmCancel(): Promise<void> {
  const current = review.value
  if (!current || !current.enrolled || acting.value) return
  try {
    await ElMessageBox.confirm(
      '只取消联合创始人身份。不会退款，也不会改动钱包。退款请在这个流程之外手工处理。取消后，用户端开通按钮会被关掉，可以在「名额与分配」里重新打开。',
      '取消联合创始人身份',
      {
        confirmButtonText: '取消身份',
        cancelButtonText: '返回',
        type: 'warning',
      },
    )
  } catch {
    return
  }
  acting.value = true
  actionError.value = ''
  try {
    await cancelCofounder(current.userId)
    ElMessage.success('已取消身份。没有退款，钱包未改动。')
    emit('changed')
    await load(current.userId)
  } catch (error) {
    actionError.value = apiErrorMessage(error, '取消失败')
    emit('changed')
  } finally {
    acting.value = false
  }
}

function awardLabel(row: CofounderAwardTotal): string {
  return row.label || row.rewardType
}

function settlementText(row: CofounderWithdrawalDetail): string {
  if (!row.settlement) return '—'
  return settlementOutcomeLabel(row.settlement.outcome)
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="取消审核"
    size="min(760px, 100%)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading" class="detail">
      <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
      <template v-if="review">
        <h2>身份</h2>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户 ID">{{ review.userId }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ review.nickname || '—' }}</el-descriptions-item>
          <el-descriptions-item label="是否会员">
            {{ memberFlagLabel(review.member) }}
          </el-descriptions-item>
          <el-descriptions-item label="在籍">
            {{ review.enrolled ? '在籍' : '已取消' }}
          </el-descriptions-item>
          <el-descriptions-item label="来源">
            {{ cofounderSourceLabel(review.source) }}
          </el-descriptions-item>
          <el-descriptions-item label="入籍时间">
            {{ review.enrolledAt ? formatShanghaiTime(review.enrolledAt) : '—' }}
          </el-descriptions-item>
        </el-descriptions>

        <h2>已入账奖励</h2>
        <p class="hint">按奖励类型列出已经入账的累计金额。没有入账的类型显示 0.00 元。</p>
        <el-table :data="review.awards" empty-text="没有奖励记录">
          <el-table-column label="类型" min-width="160">
            <template #default="{ row }: { row: CofounderAwardTotal }">
              {{ awardLabel(row) }}
            </template>
          </el-table-column>
          <el-table-column label="累计金额" min-width="140">
            <template #default="{ row }: { row: CofounderAwardTotal }">
              {{ decimalFenText(row.amountFen) }}
            </template>
          </el-table-column>
        </el-table>

        <h2>联合创始人分红</h2>
        <p class="amount">{{ decimalFenText(review.cofounderDividendFen) }}</p>
        <p class="hint">
          这是此人已经拿到的联合创始人分红。已提现合计混有其他来源，不能当成这一项。
        </p>

        <h2>当前可提现账户</h2>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="余额">
            {{ decimalFenText(review.withdrawable.balanceFen) }}
          </el-descriptions-item>
          <el-descriptions-item label="冻结">
            {{ decimalFenText(review.withdrawable.frozenFen) }}
          </el-descriptions-item>
          <el-descriptions-item label="可用">
            {{ decimalFenText(review.withdrawable.availableFen) }}
          </el-descriptions-item>
        </el-descriptions>

        <h2>已完成提现</h2>
        <p class="hint">下面三项只统计已打款，而且包含各类来源，不是联合创始人分红。</p>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="笔数">
            {{ review.withdrawals.completedCount }}
          </el-descriptions-item>
          <el-descriptions-item label="申请金额合计">
            {{ decimalFenText(review.withdrawals.completedAmountFen) }}
          </el-descriptions-item>
          <el-descriptions-item label="实付合计">
            {{ decimalFenText(review.withdrawals.completedPayoutFen) }}
          </el-descriptions-item>
        </el-descriptions>

        <h2>提现申请</h2>
        <p class="hint">包含尚未打款和已驳回的申请。状态以接口为准。</p>
        <el-table :data="review.withdrawals.items" empty-text="没有提现申请">
          <el-table-column prop="id" label="申请 ID" min-width="100" />
          <el-table-column label="申请时间" min-width="170">
            <template #default="{ row }: { row: CofounderWithdrawalDetail }">
              {{ formatShanghaiTime(row.appliedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="申请金额" min-width="120">
            <template #default="{ row }: { row: CofounderWithdrawalDetail }">
              {{ decimalFenText(row.amountFen) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }: { row: CofounderWithdrawalDetail }">
              <el-tag size="small" effect="plain" :type="withdrawalStatusTag(row.status)">
                {{ withdrawalStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="开户名" min-width="100">
            <template #default="{ row }: { row: CofounderWithdrawalDetail }">
              {{ row.accountName || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="开户银行" min-width="120">
            <template #default="{ row }: { row: CofounderWithdrawalDetail }">
              {{ row.bankName || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="银行卡号" min-width="160">
            <template #default="{ row }: { row: CofounderWithdrawalDetail }">
              <span class="account-no">{{ row.accountNo || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="开户支行" min-width="120">
            <template #default="{ row }: { row: CofounderWithdrawalDetail }">
              {{ row.branchName || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="结算" width="100">
            <template #default="{ row }: { row: CofounderWithdrawalDetail }">
              {{ settlementText(row) }}
            </template>
          </el-table-column>
          <el-table-column label="手续费" min-width="110">
            <template #default="{ row }: { row: CofounderWithdrawalDetail }">
              {{ decimalFenText(row.settlement?.feeFen ?? null) }}
            </template>
          </el-table-column>
          <el-table-column label="实付" min-width="110">
            <template #default="{ row }: { row: CofounderWithdrawalDetail }">
              {{ decimalFenText(row.settlement?.payoutFen ?? null) }}
            </template>
          </el-table-column>
          <el-table-column label="结算时间" min-width="170">
            <template #default="{ row }: { row: CofounderWithdrawalDetail }">
              {{ row.settlement ? formatShanghaiTime(row.settlement.settledAt) : '—' }}
            </template>
          </el-table-column>
        </el-table>

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
            v-if="review.enrolled"
            type="danger"
            :loading="acting"
            :disabled="loading"
            @click="confirmCancel"
          >
            取消身份
          </el-button>
          <p v-else class="hint">当前不在籍。这个页面不会退款，也没有再次取消。</p>
        </div>
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

.amount {
  margin-bottom: 8px;
  font-size: 20px;
  font-weight: 600;
}

.notice {
  margin-top: 16px;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 16px;
}

.account-no {
  word-break: break-all;
}
</style>
