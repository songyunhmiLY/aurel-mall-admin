<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { apiErrorMessage } from '@/api/http'
import { fetchMember, type MemberSummary } from '@/api/members'
import {
  fetchMemberHolds,
  fetchMemberLedger,
  fetchMemberTransfers,
  fetchMemberWallets,
  type ConsumptionTransferRow,
  type MemberWallets,
  type WalletHold,
  type WalletLedgerEntry,
  type WalletType,
} from '@/api/member-wallets'
import { decimalFenText } from '@/api/money'
import { formatShanghaiTime } from '@/utils/datetime'
import {
  directionLabel,
  holdStatusLabel,
  holdStatusOptions,
  sourceLabel,
  walletTypeLabel,
  walletTypeOptions,
} from './wallet-labels'

const pageSize = 20
const route = useRoute()
const router = useRouter()

const userId = ref('')
const member = ref<MemberSummary | null>(null)
const wallets = ref<MemberWallets | null>(null)
const loading = ref(false)
const loadError = ref('')

const walletType = ref<WalletType>('withdrawable')
const ledgerLoading = ref(false)
const ledgerError = ref('')
const ledger = ref<WalletLedgerEntry[]>([])
const ledgerTotal = ref(0)
const ledgerPage = ref(1)

const holdStatus = ref('')
const holdsLoading = ref(false)
const holdsError = ref('')
const holds = ref<WalletHold[]>([])
const holdsTotal = ref(0)
const holdsPage = ref(1)

const transferSide = ref<'payer' | 'payee'>('payer')
const transfersLoading = ref(false)
const transfersError = ref('')
const transfers = ref<ConsumptionTransferRow[]>([])
const transfersTotal = ref(0)
const transfersPage = ref(1)

watch(
  () => queryText(route.query.userId),
  (id) => {
    userId.value = id
    if (/^\d+$/.test(id)) void load(id)
  },
  { immediate: true },
)

function queryText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0].trim()
  return ''
}

function search(): void {
  const id = userId.value.trim()
  if (!/^\d+$/.test(id)) {
    loadError.value = '请输入用户 ID'
    clearMember()
    return
  }
  if (id === queryText(route.query.userId)) {
    void load(id)
    return
  }
  void router.replace({ query: { userId: id } })
}

function clearMember(): void {
  member.value = null
  wallets.value = null
  ledger.value = []
  holds.value = []
  transfers.value = []
  ledgerTotal.value = 0
  holdsTotal.value = 0
  transfersTotal.value = 0
}

async function load(id: string): Promise<void> {
  loading.value = true
  loadError.value = ''
  clearMember()
  try {
    const [user, balances] = await Promise.all([fetchMember(id), fetchMemberWallets(id)])
    member.value = user
    wallets.value = balances
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取会员钱包失败')
    loading.value = false
    return
  }
  loading.value = false
  await Promise.all([loadLedger(id, 1), loadHolds(id, 1), loadTransfers(id, 1)])
}

async function loadLedger(id: string, nextPage: number): Promise<void> {
  ledgerLoading.value = true
  ledgerError.value = ''
  try {
    const result = await fetchMemberLedger(id, walletType.value, nextPage, pageSize)
    ledger.value = result.items
    ledgerTotal.value = result.total
    ledgerPage.value = result.page
  } catch (error) {
    ledger.value = []
    ledgerTotal.value = 0
    ledgerError.value = apiErrorMessage(error, '读取钱包流水失败')
  } finally {
    ledgerLoading.value = false
  }
}

async function loadHolds(id: string, nextPage: number): Promise<void> {
  holdsLoading.value = true
  holdsError.value = ''
  try {
    const result = await fetchMemberHolds(id, nextPage, pageSize, holdStatus.value || undefined)
    holds.value = result.items
    holdsTotal.value = result.total
    holdsPage.value = result.page
  } catch (error) {
    holds.value = []
    holdsTotal.value = 0
    holdsError.value = apiErrorMessage(error, '读取冻结记录失败')
  } finally {
    holdsLoading.value = false
  }
}

async function loadTransfers(id: string, nextPage: number): Promise<void> {
  transfersLoading.value = true
  transfersError.value = ''
  try {
    const result = await fetchMemberTransfers({
      payerId: transferSide.value === 'payer' ? id : undefined,
      payeeId: transferSide.value === 'payee' ? id : undefined,
      page: nextPage,
      pageSize,
    })
    transfers.value = result.items
    transfersTotal.value = result.total
    transfersPage.value = result.page
  } catch (error) {
    transfers.value = []
    transfersTotal.value = 0
    transfersError.value = apiErrorMessage(error, '读取消费划转失败')
  } finally {
    transfersLoading.value = false
  }
}

function reloadLedger(): void {
  const id = member.value?.id
  if (!id) return
  void loadLedger(id, 1)
}

function reloadHolds(): void {
  const id = member.value?.id
  if (!id) return
  void loadHolds(id, 1)
}

function onLedgerPage(next: number): void {
  const id = member.value?.id
  if (!id) return
  void loadLedger(id, next)
}

function onHoldsPage(next: number): void {
  const id = member.value?.id
  if (!id) return
  void loadHolds(id, next)
}

function onTransfersPage(next: number): void {
  const id = member.value?.id
  if (!id) return
  void loadTransfers(id, next)
}

function reloadTransfers(): void {
  const id = member.value?.id
  if (!id) return
  void loadTransfers(id, 1)
}
</script>

<template>
  <section class="ops-page">
    <header>
      <h1>会员钱包</h1>
    </header>
    <p class="ops-hint">
      查看任意会员的积分、可提现、消费三个账户，包括余额、冻结、流水，以及会员之间的消费账户划转。这里不能发起划转或改余额。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <div class="ops-toolbar">
      <el-input
        v-model="userId"
        placeholder="用户 ID"
        clearable
        class="ops-filter"
        @keyup.enter="search"
      />
      <el-button type="primary" @click="search">查询</el-button>
    </div>

    <div v-loading="loading">
      <template v-if="member && wallets">
        <p>
          {{ member.nickname || '—' }} · 用户 ID {{ member.id }} · 手机号
          {{ member.phone || '—' }}
        </p>
        <div class="ops-grid">
          <article v-for="item in walletTypeOptions" :key="item.value" class="ops-card">
            <h2>{{ item.label }}</h2>
            <p>余额 {{ decimalFenText(wallets[item.value].balanceFen) }}</p>
            <p>冻结 {{ decimalFenText(wallets[item.value].frozenFen) }}</p>
            <p>可用 {{ decimalFenText(wallets[item.value].availableFen) }}</p>
          </article>
        </div>

        <el-tabs>
          <el-tab-pane label="流水" name="ledger">
            <div class="ops-toolbar">
              <el-select v-model="walletType" class="ops-filter--narrow" @change="reloadLedger">
                <el-option
                  v-for="item in walletTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </div>
            <el-alert
              v-if="ledgerError"
              type="error"
              :title="ledgerError"
              show-icon
              :closable="false"
            />
            <el-table v-loading="ledgerLoading" :data="ledger" empty-text="没有流水">
              <el-table-column label="时间" min-width="170">
                <template #default="{ row }">{{ formatShanghaiTime(row.occurredAt) }}</template>
              </el-table-column>
              <el-table-column label="方向" width="80">
                <template #default="{ row }">{{ directionLabel(row.direction) }}</template>
              </el-table-column>
              <el-table-column label="金额" min-width="120">
                <template #default="{ row }">{{ decimalFenText(row.amountFen) }}</template>
              </el-table-column>
              <el-table-column label="余额" min-width="120">
                <template #default="{ row }">{{ decimalFenText(row.balanceAfterFen) }}</template>
              </el-table-column>
              <el-table-column prop="bizType" label="业务" min-width="140" />
              <el-table-column prop="bizId" label="业务 ID" min-width="120" />
              <el-table-column label="来源" min-width="180">
                <template #default="{ row }">{{ sourceLabel(row.sourceCode) }}</template>
              </el-table-column>
            </el-table>
            <el-pagination
              v-if="ledgerTotal > 0"
              layout="total, prev, pager, next"
              :total="ledgerTotal"
              :page-size="pageSize"
              :current-page="ledgerPage"
              @current-change="onLedgerPage"
            />
          </el-tab-pane>

          <el-tab-pane label="冻结" name="holds">
            <div class="ops-toolbar">
              <el-select
                v-model="holdStatus"
                placeholder="全部状态"
                clearable
                class="ops-filter--narrow"
                @change="reloadHolds"
              >
                <el-option
                  v-for="item in holdStatusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </div>
            <el-alert
              v-if="holdsError"
              type="error"
              :title="holdsError"
              show-icon
              :closable="false"
            />
            <el-table v-loading="holdsLoading" :data="holds" empty-text="没有冻结记录">
              <el-table-column prop="id" label="冻结 ID" min-width="110" />
              <el-table-column label="订单 ID" min-width="110">
                <template #default="{ row }">{{ row.orderId || '—' }}</template>
              </el-table-column>
              <el-table-column label="账户" width="100">
                <template #default="{ row }">{{ walletTypeLabel(row.walletType) }}</template>
              </el-table-column>
              <el-table-column label="金额" min-width="120">
                <template #default="{ row }">{{ decimalFenText(row.amountFen) }}</template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                <template #default="{ row }">{{ holdStatusLabel(row.status) }}</template>
              </el-table-column>
              <el-table-column label="时间" min-width="170">
                <template #default="{ row }">{{ formatShanghaiTime(row.createdAt) }}</template>
              </el-table-column>
            </el-table>
            <el-pagination
              v-if="holdsTotal > 0"
              layout="total, prev, pager, next"
              :total="holdsTotal"
              :page-size="pageSize"
              :current-page="holdsPage"
              @current-change="onHoldsPage"
            />
          </el-tab-pane>

          <el-tab-pane label="消费划转" name="transfers">
            <div class="ops-toolbar">
              <el-select
                v-model="transferSide"
                class="ops-filter--narrow"
                @change="reloadTransfers"
              >
                <el-option label="作为付款人" value="payer" />
                <el-option label="作为收款人" value="payee" />
              </el-select>
            </div>
            <el-alert
              v-if="transfersError"
              type="error"
              :title="transfersError"
              show-icon
              :closable="false"
            />
            <el-table v-loading="transfersLoading" :data="transfers" empty-text="没有消费划转">
              <el-table-column prop="id" label="划转 ID" min-width="110" />
              <el-table-column label="付款人" min-width="160">
                <template #default="{ row }">
                  {{ row.payerNickname || '—' }}（{{ row.payerUserId }}）
                </template>
              </el-table-column>
              <el-table-column label="收款人" min-width="160">
                <template #default="{ row }">
                  {{ row.payeeNickname || '—' }}（{{ row.payeeUserId }}）
                </template>
              </el-table-column>
              <el-table-column label="金额" min-width="120">
                <template #default="{ row }">{{ decimalFenText(row.amountFen) }}</template>
              </el-table-column>
              <el-table-column label="时间" min-width="170">
                <template #default="{ row }">{{ formatShanghaiTime(row.createdAt) }}</template>
              </el-table-column>
            </el-table>
            <el-pagination
              v-if="transfersTotal > 0"
              layout="total, prev, pager, next"
              :total="transfersTotal"
              :page-size="pageSize"
              :current-page="transfersPage"
              @current-change="onTransfersPage"
            />
          </el-tab-pane>
        </el-tabs>
      </template>
    </div>
  </section>
</template>
