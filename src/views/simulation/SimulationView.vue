<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  apiErrorMessage,
} from '@/api/http'
import {
  clearSimulationClock,
  fetchSimulationStatus,
  fetchSimulationTimeline,
  resetSimulationTimeline,
  setSimulationClock,
  simulationActionLabel,
  simulationStep,
  type SimulationEvent,
  type SimulationStatus,
} from '@/api/simulation'

const loading = ref(true)
const busy = ref(false)
const loadError = ref('')
const actionError = ref('')
const status = ref<SimulationStatus | null>(null)
const events = ref<SimulationEvent[]>([])

const clockInput = ref('')
const stepTargetInput = ref('')
const stepMinutesInput = ref<number | undefined>(undefined)

const overrideActive = computed(() => status.value?.clock.source === 'override')
const clockAllowed = computed(() => status.value?.clock.allowed === true)

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const [nextStatus, timeline] = await Promise.all([
      fetchSimulationStatus(),
      fetchSimulationTimeline(),
    ])
    status.value = nextStatus
    events.value = timeline
    if (nextStatus.clock.override) {
      clockInput.value = nextStatus.clock.override
    }
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取仿真状态失败（后端可能未开启 SIMULATION_ENABLED）')
  } finally {
    loading.value = false
  }
}

function requireOverride(): boolean {
  if (!overrideActive.value) {
    actionError.value = '请先设置仿真时钟起点，再执行推进相关操作'
    return false
  }
  return true
}

async function run(action: () => Promise<void>): Promise<void> {
  if (busy.value) return
  busy.value = true
  actionError.value = ''
  try {
    await action()
  } catch (error) {
    actionError.value = apiErrorMessage(error, '操作失败')
  } finally {
    busy.value = false
  }
}

function applyClock(next: SimulationStatus): void {
  status.value = next
  if (next.clock.override) {
    clockInput.value = next.clock.override
  }
  void reloadTimeline()
}

async function reloadTimeline(): Promise<void> {
  try {
    events.value = await fetchSimulationTimeline()
    if (status.value) {
      status.value.timelineCount = events.value.length
    }
  } catch {
    // 时间轴读取失败不阻塞主流程，下一次操作会再试。
  }
}

function onSetClock(): void {
  if (!clockInput.value) {
    actionError.value = '请选择或输入目标时刻（ISO 格式）'
    return
  }
  void run(async () => {
    applyClock(await setSimulationClock(new Date(clockInput.value).toISOString()))
    ElMessage.success('仿真时钟已设置')
  })
}

function onClearClock(): void {
  void run(async () => {
    applyClock(await clearSimulationClock())
    ElMessage.success('已清除时钟覆盖，恢复真实时间')
  })
}

function onStep(): void {
  if (!requireOverride()) return
  const hasTarget = stepTargetInput.value.trim() !== ''
  const hasMinutes = stepMinutesInput.value !== undefined && stepMinutesInput.value !== null
  if (hasTarget === hasMinutes) {
    actionError.value = '单步推进请二选一：目标时刻 或 推进分钟数'
    return
  }
  void run(async () => {
    const payload = hasTarget
      ? { to: new Date(stepTargetInput.value).toISOString() }
      : { byMinutes: stepMinutesInput.value }
    const next = await simulationStep(payload)
    status.value = next.status
    if (next.status.clock.override) {
      stepTargetInput.value = ''
      stepMinutesInput.value = undefined
    }
    await reloadTimeline()
    ElMessage.success('已推进并触发到期任务')
  })
}

function onCatchUp(): void {
  if (!requireOverride()) return
  void run(async () => {
    const next = await simulationStep({})
    status.value = next.status
    await reloadTimeline()
    ElMessage.success('仿真时钟已追平现实时间，并触发到期任务')
  })
}

function onReset(): void {
  void ElMessageBox.confirm('清空时间轴不会影响业务数据，确定继续？', '清空时间轴', {
    confirmButtonText: '清空',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    void run(async () => {
      applyClock(await resetSimulationTimeline())
      ElMessage.success('时间轴已清空')
    })
  }).catch(() => {})
}

function fmt(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

function fen(value: number): string {
  return `${fmt(value)} 分（${(value / 100).toFixed(2)} 元）`
}

const walletDiffRows = computed(() => {
  const diff = [...events.value].reverse().find((item) => item.diff)?.diff
  if (!diff) return []
  return [
    { label: '积分余额', value: fen(diff.wallet.points) },
    { label: '可提现余额', value: fen(diff.wallet.withdrawable) },
    { label: '消费金余额', value: fen(diff.wallet.consumption) },
    { label: '可提现冻结', value: fen(diff.wallet.withdrawableFrozen) },
    { label: '消费金冻结', value: fen(diff.wallet.consumptionFrozen) },
    { label: '现金流入', value: fen(diff.cash.inflow) },
    { label: '现金流出', value: fen(diff.cash.outflow) },
    { label: '订单数', value: fmt(diff.counts.orders) },
    { label: '待审提现', value: fmt(diff.counts.pendingWithdrawals) },
    { label: '待处理补偿', value: fmt(diff.counts.pendingCompensations) },
  ]
})
</script>

<template>
  <div class="simulation-page">
    <el-alert
      class="page-alert"
      type="warning"
      :closable="false"
      title="时间仿真台（仅测试环境）"
      description="此页面不在菜单中，仅通过直链访问。正式环境后端接口一律 403。单步推进只触发已到期的定时任务并记录账务差分，不模拟任何分销行为。"
      show-icon
    />

    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" class="page-alert" />

    <el-card v-loading="loading" shadow="never" class="block">
      <template #header>当前时钟</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="时钟来源">
          <el-tag :type="overrideActive ? 'warning' : 'info'">
            {{ overrideActive ? '仿真覆盖' : '真实时间' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="允许覆盖（ALLOW_CLOCK_OVERRIDE）">
          <el-tag :type="clockAllowed ? 'success' : 'danger'">
            {{ clockAllowed ? '允许' : '禁止' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前业务时间">{{ status?.clock.now ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="覆盖值">{{ status?.clock.override ?? '未设置' }}</el-descriptions-item>
      </el-descriptions>

      <el-form label-width="120px" class="clock-form">
        <el-form-item label="设置仿真起点">
          <el-input v-model="clockInput" placeholder="ISO 时间，如 2026-11-14T08:00:00.000Z" clearable>
            <template #append>
              <el-button :disabled="busy" @click="onSetClock">设置</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="单步推进">
          <el-input
            v-model="stepTargetInput"
            placeholder="目标时刻（ISO），与分钟数二选一"
            clearable
            class="step-input"
          />
          <el-input-number
            v-model="stepMinutesInput"
            :min="1"
            placeholder="分钟数"
            class="step-input"
          />
          <el-button type="primary" :disabled="busy || !overrideActive" @click="onStep">推进并触发到期任务</el-button>
          <el-button :disabled="busy || !overrideActive" @click="onCatchUp">追平现实时间</el-button>
        </el-form-item>
        <el-form-item label="其他">
          <el-button :disabled="busy" @click="onClearClock">清除时钟覆盖</el-button>
          <el-button :disabled="busy" type="danger" plain @click="onReset">清空时间轴</el-button>
        </el-form-item>
      </el-form>
      <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />
    </el-card>

    <el-card shadow="never" class="block">
      <template #header>
        时间轴（最近一步的账务差分在下方汇总；共 {{ status?.timelineCount ?? 0 }} 条）
      </template>
      <el-table :data="events" size="small" border>
        <el-table-column label="记录时刻" width="200">
          <template #default="{ row }">{{ row.at }}</template>
        </el-table-column>
        <el-table-column label="动作" width="110">
          <template #default="{ row }">
            <el-tag :type="row.action === 'step' ? 'primary' : 'info'" size="small">
              {{ simulationActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="详情" min-width="260">
          <template #default="{ row }">
            <span v-if="row.action === 'set_clock'">{{ row.detail.from }} → {{ row.detail.to }}</span>
            <span v-else-if="row.action === 'step'">
              {{ row.detail.from }} → {{ row.detail.to }}
              <el-tag v-if="row.detail.byMinutes" size="small" type="info" class="ml-4">
                +{{ row.detail.byMinutes }} 分钟
              </el-tag>
            </span>
            <span v-else-if="row.action === 'clear_clock'">从 {{ row.detail.from }} 恢复真实时间</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="到期任务" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.detail.jobsAttempted" size="small" type="success">已触发</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="差分摘要" min-width="240">
          <template #default="{ row }">
            <span v-if="row.diff">
              积分 {{ fmt(row.diff.wallet.points) }} / 可提现 {{ fmt(row.diff.wallet.withdrawable) }} /
              消费金 {{ fmt(row.diff.wallet.consumption) }} / 现金入 {{ fmt(row.diff.cash.inflow) }} /
              现金出 {{ fmt(row.diff.cash.outflow) }} / 订单 {{ fmt(row.diff.counts.orders) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="walletDiffRows.length > 0" shadow="never" class="block">
      <template #header>最近一次推进的账务差分</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item v-for="row in walletDiffRows" :key="row.label" :label="row.label">
          {{ row.value }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<style scoped>
.simulation-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-alert {
  width: 100%;
}

.block {
  width: 100%;
}

.clock-form {
  margin-top: 16px;
  max-width: 760px;
}

.step-input {
  width: 280px;
  margin-right: 12px;
}

.ml-4 {
  margin-left: 4px;
}
</style>
