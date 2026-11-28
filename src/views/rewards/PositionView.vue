<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import { decimalFenText, formatDecimalFen, yuanInputToFenString } from '@/api/money'
import { fetchMarketThreshold, saveMarketThreshold } from '@/api/market-threshold'
import {
  excludeDividendMember,
  fetchDividendPlan,
  fetchDividendRecords,
  fetchUserQualification,
  payDividendManually,
  updatePayoutDate,
  type DividendMember,
  type DividendPayment,
  type DividendPlan,
  type DividendRecord,
  type UserQualification,
} from '@/api/position-dividends'
import { formatShanghaiTime, shanghaiPreviousMonth } from '@/utils/datetime'

const pageSize = 20
const month = ref<string | null>(shanghaiPreviousMonth())
const loading = ref(false)
const loadError = ref('')
const actionError = ref('')
const plan = ref<DividendPlan | null>(null)
const payoutDateDraft = ref<string | null>('')
const savingDate = ref(false)
const excludingId = ref('')

const records = ref<DividendRecord[]>([])
const recordsTotal = ref(0)
const recordsPage = ref(1)
const recordsError = ref('')

const qualificationId = ref('')
const qualification = ref<UserQualification | null>(null)
const qualificationError = ref('')
const qualificationLoading = ref(false)

const thresholdLoading = ref(false)
const thresholdError = ref('')
const currentMonth = ref('')
const currentThreshold = ref('')
const nextMonth = ref('')
const nextThresholdYuan = ref('')
const savingThreshold = ref(false)

const manualOpen = ref(false)
const manualUserId = ref('')
const manualPositionCode = ref('')
const manualPositionName = ref('')
const manualOriginal = ref('')
const manualYuan = ref('')
const manualRemark = ref('')
const manualError = ref('')
const savingManual = ref(false)

const periodOpen = computed(() => plan.value?.status === 'open')

/** 矩阵单元格：该用户从此池可得金额 + 发放记录 */
interface MatrixCell {
  originalAmountFen: string
  payment: DividendPayment | null
}

/** 矩阵行：一个用户一行，cells 以 positionCode 为键 */
interface MatrixRow {
  userId: string
  nickname: string
  removed: boolean
  totalFen: string
  cells: Record<string, MatrixCell>
}

const searchKeyword = ref('')

const matrixRows = computed<MatrixRow[]>(() => {
  const current = plan.value
  if (!current) return []
  const byUser = new Map<string, MatrixRow>()
  for (const pool of current.pools) {
    for (const member of pool.members) {
      let row = byUser.get(member.userId)
      if (!row) {
        row = {
          userId: member.userId,
          nickname: member.nickname,
          removed: member.removed,
          totalFen: '0',
          cells: {},
        }
        byUser.set(member.userId, row)
      }
      row.cells[pool.positionCode] = {
        originalAmountFen: member.originalAmountFen,
        payment: member.payment,
      }
      if (member.removed) row.removed = true
    }
  }
  const rows = [...byUser.values()]
  for (const row of rows) {
    let total = 0n
    for (const cell of Object.values(row.cells)) {
      total += BigInt(cell.originalAmountFen)
    }
    row.totalFen = total.toString()
  }
  rows.sort((a, b) => Number(BigInt(a.userId) - BigInt(b.userId)))
  return rows
})

const filteredRows = computed<MatrixRow[]>(() => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return matrixRows.value
  return matrixRows.value.filter(
    (row) => row.userId.includes(keyword) || row.nickname.includes(keyword),
  )
})

/** 职级列显示文本：无资格显示 — */
function cellText(row: MatrixRow, positionCode: string): string {
  const cell = row.cells[positionCode]
  return cell ? decimalFenText(cell.originalAmountFen) : '—'
}

/** 职级列样式：已移出置灰删除线，正常绿色，无资格灰 */
function cellClass(row: MatrixRow, positionCode: string): string {
  const cell = row.cells[positionCode]
  if (!cell || row.removed) return 'amount-muted'
  return 'amount-ok'
}

function rowPayments(row: MatrixRow): DividendPayment[] {
  return Object.values(row.cells)
    .map((cell) => cell.payment)
    .filter((payment): payment is DividendPayment => payment != null)
}

function hasPayment(row: MatrixRow): boolean {
  return rowPayments(row).length > 0
}

function poolPercentText(pool: { poolBps: number }): string {
  return `${pool.poolBps / 100}%`
}

function autoLabelText(row: MatrixRow): string {
  if (plan.value?.status === 'paid') return '已发放'
  if (row.removed) return '已移出'
  return '在名单中'
}

function autoTagType(row: MatrixRow): 'success' | 'warning' | 'info' {
  if (plan.value?.status === 'paid') return 'info'
  if (row.removed) return 'warning'
  return 'success'
}

function resultText(row: MatrixRow): string {
  const payments = rowPayments(row)
  if (payments.length > 0) {
    const byMode = new Map<string, bigint>()
    for (const payment of payments) {
      const sum = byMode.get(payment.mode) ?? 0n
      byMode.set(payment.mode, sum + BigInt(payment.actualAmountFen))
    }
    return [...byMode]
      .map(([mode, fen]) => `${modeLabel(mode)} ${decimalFenText(fen.toString())}`)
      .join(' / ')
  }
  if (row.removed) return '待手工发放'
  if (plan.value?.status === 'paid') return '—'
  const day = plan.value?.payoutDate.slice(5) ?? ''
  return `待发放（${day} 自动）`
}

function rowRecordsDialogTitle(row: MatrixRow): string {
  return `发放流水 · ${row.nickname || row.userId}`
}

onMounted(() => {
  void loadThreshold()
  void loadMonth()
})

async function loadThreshold(): Promise<void> {
  thresholdLoading.value = true
  thresholdError.value = ''
  try {
    const setting = await fetchMarketThreshold()
    currentMonth.value = setting.month
    currentThreshold.value = setting.thresholdFen
    nextMonth.value = setting.nextMonth
    nextThresholdYuan.value = formatDecimalFen(setting.nextThresholdFen)
  } catch (error) {
    thresholdError.value = apiErrorMessage(error, '读取营销经理门槛失败')
  } finally {
    thresholdLoading.value = false
  }
}

async function loadMonth(): Promise<void> {
  const performanceMonth = month.value ?? ''
  if (!/^\d{4}-\d{2}$/.test(performanceMonth)) {
    loadError.value = '请选择业绩月份'
    plan.value = null
    return
  }
  loading.value = true
  loadError.value = ''
  actionError.value = ''
  recordsError.value = ''
  try {
    const [nextPlan, nextRecords] = await Promise.all([
      fetchDividendPlan(performanceMonth),
      fetchDividendRecords(performanceMonth, recordsPage.value, pageSize),
    ])
    plan.value = nextPlan
    payoutDateDraft.value = nextPlan.payoutDate
    records.value = nextRecords.items
    recordsTotal.value = nextRecords.total
    recordsPage.value = nextRecords.page
  } catch (error) {
    plan.value = null
    records.value = []
    recordsTotal.value = 0
    const message = apiErrorMessage(error, '读取职位分红失败')
    loadError.value = message
    recordsError.value = message
  } finally {
    loading.value = false
  }
}

function searchMonth(): void {
  recordsPage.value = 1
  qualification.value = null
  void loadMonth()
}

async function saveThreshold(): Promise<void> {
  const fen = yuanInputToFenString(nextThresholdYuan.value)
  if (fen == null) {
    thresholdError.value = '门槛 T 必须是非负金额，最多两位小数'
    return
  }
  savingThreshold.value = true
  thresholdError.value = ''
  try {
    const saved = await saveMarketThreshold(fen)
    currentMonth.value = saved.month
    currentThreshold.value = saved.thresholdFen
    nextMonth.value = saved.nextMonth
    nextThresholdYuan.value = formatDecimalFen(saved.nextThresholdFen)
    ElMessage.success('已保存下月门槛')
  } catch (error) {
    thresholdError.value = apiErrorMessage(error, '保存门槛 T 失败')
  } finally {
    savingThreshold.value = false
  }
}

async function savePayoutDate(): Promise<void> {
  const current = plan.value
  if (!current || savingDate.value) return
  const payoutDate = payoutDateDraft.value ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payoutDate)) {
    actionError.value = '发放日不正确'
    return
  }
  savingDate.value = true
  actionError.value = ''
  try {
    plan.value = await updatePayoutDate(current.performanceMonth, payoutDate)
    payoutDateDraft.value = plan.value.payoutDate
    ElMessage.success('已更新发放日')
  } catch (error) {
    actionError.value = apiErrorMessage(error, '更新发放日失败')
  } finally {
    savingDate.value = false
  }
}

function excludeRow(row: MatrixRow): void {
  const current = plan.value
  if (!current || excludingId.value) return
  void (async () => {
    try {
      await ElMessageBox.confirm(
        `确定停止 ${row.nickname || row.userId} 的自动发放？份额不会分给其他会员。`,
        '停止自动发放',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' },
      )
    } catch {
      return
    }
    excludingId.value = row.userId
    actionError.value = ''
    try {
      plan.value = await excludeDividendMember(current.performanceMonth, row.userId)
      ElMessage.success('已停止自动发放')
    } catch (error) {
      actionError.value = apiErrorMessage(error, '停止自动发放失败')
    } finally {
      excludingId.value = ''
    }
  })()
}

/** 该用户被移出且尚未发放的池，作为手工发放的候选 */
function manualPoolOptions(userId: string): Array<{ code: string; name: string; member: DividendMember }> {
  const current = plan.value
  if (!current) return []
  const options: Array<{ code: string; name: string; member: DividendMember }> = []
  for (const pool of current.pools) {
    const member = pool.members.find(
      (item) => item.userId === userId && item.removed && !item.payment,
    )
    if (member) {
      options.push({ code: pool.positionCode, name: pool.positionName || pool.positionCode, member })
    }
  }
  return options
}

const manualPoolChoices = ref<Array<{ code: string; name: string; member: DividendMember }>>([])

function openManual(row: MatrixRow): void {
  const [first] = manualPoolOptions(row.userId)
  if (!first) return
  manualUserId.value = row.userId
  manualPoolChoices.value = manualPoolOptions(row.userId)
  manualPositionCode.value = first.code
  manualPositionName.value = first.name
  manualOriginal.value = first.member.originalAmountFen
  manualYuan.value = ''
  manualRemark.value = ''
  manualError.value = ''
  manualOpen.value = true
}

function onManualPoolChange(code: string): void {
  const choice = manualPoolChoices.value.find((item) => item.code === code)
  if (!choice) return
  manualPositionName.value = choice.name
  manualOriginal.value = choice.member.originalAmountFen
}

async function submitManual(): Promise<void> {
  const current = plan.value
  if (!current || savingManual.value) return
  const fen = yuanInputToFenString(manualYuan.value)
  const remark = manualRemark.value.trim()
  if (fen == null) {
    manualError.value = '金额不正确'
    return
  }
  if (remark.length < 1 || remark.length > 200) {
    manualError.value = '请填写备注'
    return
  }
  savingManual.value = true
  manualError.value = ''
  try {
    await payDividendManually(current.performanceMonth, {
      userId: manualUserId.value,
      positionCode: manualPositionCode.value,
      actualAmountFen: fen,
      remark,
    })
    manualOpen.value = false
    ElMessage.success('已登记手工发放')
    await loadMonth()
  } catch (error) {
    manualError.value = apiErrorMessage(error, '手工发放失败')
  } finally {
    savingManual.value = false
  }
}

async function loadQualification(): Promise<void> {
  const id = qualificationId.value.trim()
  if (!/^\d+$/.test(id) || !/^\d{4}-\d{2}$/.test(month.value ?? '')) {
    qualificationError.value = '请输入用户 ID，并选择已经结束的业绩月'
    qualification.value = null
    return
  }
  qualificationLoading.value = true
  qualificationError.value = ''
  try {
    qualification.value = await fetchUserQualification(id, month.value ?? '')
  } catch (error) {
    qualification.value = null
    qualificationError.value = apiErrorMessage(error, '读取考核结果失败')
  } finally {
    qualificationLoading.value = false
  }
}

function onRecordsPage(next: number): void {
  recordsPage.value = next
  void loadMonth()
}

/** 查看资格：填入用户 ID 并直接查询 */
function viewQualification(userId: string): void {
  qualificationId.value = userId
  void loadQualification()
}

/** 单个用户的发放流水弹窗 */
const rowRecordsOpen = ref(false)
const rowRecordsLoading = ref(false)
const rowRecordsTitle = ref('')
const rowRecords = ref<DividendRecord[]>([])

async function openRowRecords(row: MatrixRow): Promise<void> {
  rowRecordsTitle.value = rowRecordsDialogTitle(row)
  rowRecordsOpen.value = true
  rowRecordsLoading.value = true
  rowRecords.value = []
  try {
    const pageData = await fetchDividendRecords(month.value ?? '', 1, 100)
    rowRecords.value = pageData.items.filter((item) => item.userId === row.userId)
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '读取发放记录失败'))
  } finally {
    rowRecordsLoading.value = false
  }
}

function statusLabel(status: string): string {
  if (status === 'open') return '未发放'
  if (status === 'paid') return '已发放'
  return status || '—'
}

function modeLabel(mode: string): string {
  if (mode === 'auto') return '自动发放'
  if (mode === 'manual') return '手工发放'
  return mode || '—'
}

function poolNote(exclusive: boolean): string {
  return exclusive ? '不含同时达到更高职位的人' : '包含达到该职位的人'
}
</script>

<template>
  <section class="ops-page">
    <header>
      <h1>职位分红</h1>
    </header>
    <p class="ops-hint">
      查看已经结束的业绩月、次月发放日和各职位池。发放日默认是次月 15
      日，只能在发放前改成次月里尚未到来的日期，是否允许以接口为准。停止自动发放后，份额不会分给其他会员。整期自动发放由接口到发放日执行，这里不另做按钮。
    </p>

    <section v-loading="thresholdLoading" class="ops-card">
      <h2>营销经理门槛 T</h2>
      <p class="ops-hint">单位是分，下面按元显示和填写。保存只写入下月，本月门槛不变。</p>
      <el-alert
        v-if="thresholdError"
        type="error"
        :title="thresholdError"
        show-icon
        :closable="false"
      />
      <p v-if="currentMonth">{{ currentMonth }} 本月门槛 {{ decimalFenText(currentThreshold) }}</p>
      <div class="ops-toolbar">
        <span>{{ nextMonth || '下月' }}</span>
        <el-input v-model="nextThresholdYuan" placeholder="下月门槛（元）" class="ops-filter" />
        <el-button type="primary" :loading="savingThreshold" @click="saveThreshold">
          保存下月门槛
        </el-button>
      </div>
    </section>

    <div class="ops-toolbar">
      <el-date-picker
        v-model="month"
        type="month"
        value-format="YYYY-MM"
        placeholder="业绩月份"
        class="ops-filter"
      />
      <el-button type="primary" @click="searchMonth">查询</el-button>
    </div>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
    <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />

    <div v-loading="loading">
      <template v-if="plan">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="业绩月">{{ plan.performanceMonth }}</el-descriptions-item>
          <el-descriptions-item label="发放月">{{ plan.payoutMonth }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusLabel(plan.status) }}</el-descriptions-item>
          <el-descriptions-item label="当月门槛">
            {{ decimalFenText(plan.thresholdFen) }}
          </el-descriptions-item>
          <el-descriptions-item label="商城 PV">
            {{ decimalFenText(plan.mallPvFen) }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="ops-toolbar">
          <span>发放日</span>
          <el-date-picker
            v-model="payoutDateDraft"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="发放日"
            :disabled="!periodOpen"
            class="ops-filter"
          />
          <el-button
            type="primary"
            :disabled="!periodOpen"
            :loading="savingDate"
            @click="savePayoutDate"
          >
            保存发放日
          </el-button>
          <span v-if="!periodOpen" class="ops-meta">本期已发放，不能修改发放日。</span>
        </div>

        <p v-if="plan.pools.length === 0" class="ops-hint">没有职位池。</p>
        <section v-else class="ops-card">
          <h2>分红名单</h2>
          <div class="ops-toolbar">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索用户 ID / 昵称"
              clearable
              class="ops-filter"
            />
          </div>
          <el-table :data="filteredRows" empty-text="没有达标会员">
            <el-table-column label="用户 ID" width="90" fixed="left">
              <template #default="{ row }: { row: MatrixRow }">
                {{ row.userId }}
              </template>
            </el-table-column>
            <el-table-column label="昵称" min-width="110" fixed="left">
              <template #default="{ row }: { row: MatrixRow }">
                {{ row.nickname || '—' }}
              </template>
            </el-table-column>
            <el-table-column label="总分红金额" min-width="110" align="right" fixed="left">
              <template #default="{ row }: { row: MatrixRow }">
                <span :class="row.removed ? 'amount-muted' : 'amount-strong'">
                  {{ decimalFenText(row.totalFen) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column
              v-for="pool in plan.pools"
              :key="pool.positionCode"
              align="right"
              min-width="130"
            >
              <template #header>
                <span :title="poolNote(pool.exclusive)" class="pool-name">
                  {{ pool.positionName || pool.positionCode }} {{ poolPercentText(pool) }}
                </span>
                <span class="pool-sub">
                  {{ decimalFenText(pool.poolFen) }} / {{ pool.eligibleCount }}人
                </span>
              </template>
              <template #default="{ row }: { row: MatrixRow }">
                <span :class="cellClass(row, pool.positionCode)">
                  {{ cellText(row, pool.positionCode) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="自动发放" width="100" align="center">
              <template #default="{ row }: { row: MatrixRow }">
                <el-tag :type="autoTagType(row)" size="small">{{ autoLabelText(row) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="发放结果" min-width="160">
              <template #default="{ row }: { row: MatrixRow }">
                <span
                  :class="
                    row.removed && !hasPayment(row) && periodOpen ? 'result-manual' : 'result-text'
                  "
                >
                  {{ resultText(row) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="210" fixed="right">
              <template #default="{ row }: { row: MatrixRow }">
                <el-button
                  v-if="periodOpen && !row.removed"
                  link
                  type="warning"
                  :loading="excludingId === row.userId"
                  @click="excludeRow(row)"
                >
                  移出名单
                </el-button>
                <el-button
                  v-if="periodOpen && row.removed && !hasPayment(row)"
                  link
                  type="primary"
                  @click="openManual(row)"
                >
                  手工发放
                </el-button>
                <el-button link type="primary" @click="viewQualification(row.userId)">
                  查看资格
                </el-button>
                <el-button v-if="hasPayment(row)" link type="primary" @click="openRowRecords(row)">
                  查看流水
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <h2>会员考核</h2>
        <div class="ops-toolbar">
          <el-input
            v-model="qualificationId"
            placeholder="用户 ID"
            clearable
            class="ops-filter"
            @keyup.enter="loadQualification"
          />
          <el-button @click="loadQualification">查看考核</el-button>
        </div>
        <el-alert
          v-if="qualificationError"
          type="error"
          :title="qualificationError"
          show-icon
          :closable="false"
        />
        <div v-loading="qualificationLoading">
          <template v-if="qualification">
            <p>
              {{ qualification.nickname || '—' }}（{{ qualification.userId }}）·
              {{ qualification.performanceMonth }} · 门槛
              {{ decimalFenText(qualification.thresholdFen) }}
            </p>
            <el-table :data="qualification.ranks" empty-text="没有职位">
              <el-table-column label="职位" min-width="140">
                <template #default="{ row }">{{ row.positionName || row.positionCode }}</template>
              </el-table-column>
              <el-table-column label="达到" width="90">
                <template #default="{ row }">{{ row.qualified ? '是' : '否' }}</template>
              </el-table-column>
              <el-table-column label="在分红池" width="110">
                <template #default="{ row }">{{ row.inPool ? '是' : '否' }}</template>
              </el-table-column>
            </el-table>
            <el-table :data="qualification.markets" empty-text="没有直接市场">
              <el-table-column prop="userId" label="市场用户 ID" min-width="120" />
              <el-table-column label="昵称" min-width="120">
                <template #default="{ row }">{{ row.nickname || '—' }}</template>
              </el-table-column>
              <el-table-column label="市场业绩" min-width="140">
                <template #default="{ row }">{{ decimalFenText(row.performanceFen) }}</template>
              </el-table-column>
            </el-table>
          </template>
        </div>

        <h2>发放记录</h2>
        <el-alert
          v-if="recordsError && !loadError"
          type="error"
          :title="recordsError"
          show-icon
          :closable="false"
        />
        <el-table :data="records" empty-text="没有发放记录">
          <el-table-column prop="userId" label="用户 ID" min-width="110" />
          <el-table-column label="职位" min-width="140">
            <template #default="{ row }: { row: DividendRecord }">
              {{ row.positionName || row.positionCode }}
            </template>
          </el-table-column>
          <el-table-column label="方式" width="110">
            <template #default="{ row }: { row: DividendRecord }">
              {{ modeLabel(row.mode) }}
            </template>
          </el-table-column>
          <el-table-column label="原金额" min-width="120">
            <template #default="{ row }: { row: DividendRecord }">
              {{ decimalFenText(row.originalAmountFen) }}
            </template>
          </el-table-column>
          <el-table-column label="实发" min-width="120">
            <template #default="{ row }: { row: DividendRecord }">
              {{ decimalFenText(row.actualAmountFen) }}
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="160">
            <template #default="{ row }: { row: DividendRecord }">
              {{ row.remark || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="时间" min-width="170">
            <template #default="{ row }: { row: DividendRecord }">
              {{ formatShanghaiTime(row.paidAt) }}
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="recordsTotal > 0"
          layout="total, prev, pager, next"
          :total="recordsTotal"
          :page-size="pageSize"
          :current-page="recordsPage"
          @current-change="onRecordsPage"
        />
      </template>
    </div>

    <el-dialog v-model="manualOpen" title="手工发放" width="480px">
      <p class="ops-hint">
        用户 {{ manualUserId }} · 原金额 {{ decimalFenText(manualOriginal) }}。只对已经停止自动发放的会员，实发金额和备注以本次提交为准。
      </p>
      <el-alert v-if="manualError" type="error" :title="manualError" show-icon :closable="false" />
      <div v-if="manualPoolChoices.length > 1" class="ops-toolbar">
        <span>职位池</span>
        <el-select
          :model-value="manualPositionCode"
          class="ops-filter"
          @change="onManualPoolChange"
        >
          <el-option
            v-for="choice in manualPoolChoices"
            :key="choice.code"
            :label="choice.name"
            :value="choice.code"
          />
        </el-select>
      </div>
      <div class="ops-toolbar">
        <el-input v-model="manualYuan" placeholder="实发金额（元）" class="ops-filter" />
      </div>
      <el-input
        v-model="manualRemark"
        type="textarea"
        :rows="3"
        maxlength="200"
        show-word-limit
        placeholder="备注"
      />
      <template #footer>
        <el-button @click="manualOpen = false">取消</el-button>
        <el-button type="primary" :loading="savingManual" @click="submitManual">确认发放</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rowRecordsOpen" :title="rowRecordsTitle" width="720px">
      <div v-loading="rowRecordsLoading">
        <el-table :data="rowRecords" empty-text="没有发放记录">
          <el-table-column label="职位" min-width="120">
            <template #default="{ row }: { row: DividendRecord }">
              {{ row.positionName || row.positionCode }}
            </template>
          </el-table-column>
          <el-table-column label="方式" width="100">
            <template #default="{ row }: { row: DividendRecord }">
              {{ modeLabel(row.mode) }}
            </template>
          </el-table-column>
          <el-table-column label="原金额" min-width="100">
            <template #default="{ row }: { row: DividendRecord }">
              {{ decimalFenText(row.originalAmountFen) }}
            </template>
          </el-table-column>
          <el-table-column label="实发" min-width="100">
            <template #default="{ row }: { row: DividendRecord }">
              {{ decimalFenText(row.actualAmountFen) }}
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="140">
            <template #default="{ row }: { row: DividendRecord }">
              {{ row.remark || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="时间" min-width="160">
            <template #default="{ row }: { row: DividendRecord }">
              {{ formatShanghaiTime(row.paidAt) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </section>
</template>

<style scoped>
.pool-name {
  display: block;
  font-weight: 500;
}
.pool-sub {
  display: block;
  font-weight: 400;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
.amount-strong {
  font-weight: 600;
}
.amount-ok {
  color: var(--el-color-success);
}
.amount-muted {
  color: var(--el-text-color-placeholder);
  text-decoration: line-through;
}
.result-manual {
  color: var(--el-color-warning);
}
.result-text {
  color: var(--el-text-color-secondary);
}
</style>
