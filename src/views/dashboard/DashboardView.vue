<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { apiErrorMessage } from '@/api/http'
import { fetchOpsOverview, type OpsOverview, type OpsPeriodKey } from '@/api/ops-overview'
import { formatShanghaiTime } from '@/utils/datetime'

import OpsComposition from './components/OpsComposition.vue'
import OpsFiling from './components/OpsFiling.vue'
import OpsKpis from './components/OpsKpis.vue'
import OpsOrganization from './components/OpsOrganization.vue'
import OpsTodos from './components/OpsTodos.vue'
import OpsTrend from './components/OpsTrend.vue'
import OpsWallets from './components/OpsWallets.vue'
import { periodRangeText } from './ops-format'

const refreshMs = 30_000

const periodOptions: Array<{ value: OpsPeriodKey; label: string }> = [
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'last7days', label: '近 7 天' },
  { value: 'month', label: '本月' },
  { value: 'custom', label: '自定义' },
]

const board = ref<HTMLElement | null>(null)
const period = ref<OpsPeriodKey>('today')
const customRange = ref<string[] | null>(null)
const overview = ref<OpsOverview | null>(null)
const loadError = ref('')
const rangeError = ref('')
const fullscreenError = ref('')
const refreshing = ref(false)
const refreshedAt = ref('')
const fullscreen = ref(false)

let timer = 0
let generation = 0
let inFlight = false
let disposed = false
let activeController: AbortController | null = null

const rangeText = computed(() => (overview.value ? periodRangeText(overview.value.period) : ''))
const refreshedText = computed(() =>
  refreshedAt.value ? formatShanghaiTime(refreshedAt.value) : '',
)

onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreen)
  void load('user')
  timer = window.setInterval(() => {
    void load('timer')
  }, refreshMs)
})

onUnmounted(() => {
  disposed = true
  window.clearInterval(timer)
  activeController?.abort()
  document.removeEventListener('fullscreenchange', syncFullscreen)
})

function onPeriodChange(value: string | number | boolean | undefined): void {
  if (
    value !== 'today' &&
    value !== 'yesterday' &&
    value !== 'last7days' &&
    value !== 'month' &&
    value !== 'custom'
  ) {
    return
  }
  period.value = value
  rangeError.value = ''
  if (value !== 'custom') {
    customRange.value = null
    void load('user')
    return
  }
  if (customBounds()) void load('user')
}

function onCustomChange(value: string[] | null): void {
  customRange.value = Array.isArray(value) ? value : null
  rangeError.value = ''
  if (period.value !== 'custom' || !customRange.value) return
  if (!customBounds()) {
    rangeError.value = '结束日期不能早于开始日期'
    return
  }
  void load('user')
}

function customBounds(): { from: string; to: string } | null {
  const range = customRange.value
  if (!range) return null
  const from = range[0]
  const to = range[1]
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return null
  }
  if (from > to) return null
  return { from, to }
}

async function load(origin: 'user' | 'timer'): Promise<void> {
  if (disposed) return
  if (origin === 'timer' && inFlight) return
  const bounds = period.value === 'custom' ? customBounds() : null
  if (period.value === 'custom' && !bounds) return

  const ticket = ++generation
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  inFlight = true
  refreshing.value = overview.value != null
  if (origin === 'user') loadError.value = ''

  try {
    const data = await fetchOpsOverview(
      {
        period: period.value,
        from: bounds?.from,
        to: bounds?.to,
      },
      controller.signal,
    )
    if (disposed || ticket !== generation) return
    overview.value = data
    loadError.value = ''
    refreshedAt.value = new Date().toISOString()
  } catch (error) {
    if (disposed || ticket !== generation || controller.signal.aborted) return
    loadError.value = apiErrorMessage(error, '读取运营总览失败')
  } finally {
    if (!disposed && ticket === generation) {
      inFlight = false
      refreshing.value = false
      activeController = null
    }
  }
}

function syncFullscreen(): void {
  fullscreen.value = document.fullscreenElement === board.value
}

async function toggleFullscreen(): Promise<void> {
  const node = board.value
  if (!node) return
  fullscreenError.value = ''
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    await node.requestFullscreen()
  } catch {
    fullscreenError.value = '当前浏览器没有进入全屏'
  }
}
</script>

<template>
  <section ref="board" class="board">
    <header class="board__head">
      <div>
        <h1>运营总览</h1>
        <p class="hint">
          只读。不能在这里发货、打款或修改。自然日和本月按
          Asia/Shanghai，日期范围用接口返回的业务日。每 30 秒重新请求一次。
        </p>
      </div>
      <div class="board__actions">
        <span v-if="refreshing" class="hint">正在读取</span>
        <span v-else-if="refreshedText" class="hint">最近读取 {{ refreshedText }}</span>
        <el-button @click="load('user')">刷新</el-button>
        <el-button @click="toggleFullscreen">{{ fullscreen ? '退出全屏' : '全屏' }}</el-button>
      </div>
    </header>

    <div class="toolbar">
      <el-radio-group v-model="period" @change="onPeriodChange">
        <el-radio-button v-for="item in periodOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </el-radio-button>
      </el-radio-group>
      <el-date-picker
        v-if="period === 'custom'"
        v-model="customRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        @change="onCustomChange"
      />
    </div>

    <el-alert
      v-if="fullscreenError"
      type="warning"
      :title="fullscreenError"
      show-icon
      :closable="false"
    />
    <el-alert v-if="rangeError" type="warning" :title="rangeError" show-icon :closable="false" />
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
    <p v-else-if="period === 'custom' && !customBounds()" class="hint">请选择开始和结束日期。</p>
    <p v-else-if="!overview" class="hint">正在读取</p>

    <template v-if="overview">
      <p class="bounds">
        {{ overview.period.timezone }} · {{ rangeText }}
        <span v-if="refreshing && overview.period.key !== period"> · 正在换成所选区间</span>
      </p>
      <OpsKpis :kpis="overview.kpis" />
      <div class="split">
        <OpsTrend :trend="overview.trend" />
        <OpsComposition
          :startup="overview.composition.startup"
          :mall="overview.composition.mall"
          :cash="overview.composition.cash"
        />
      </div>
      <div class="split">
        <OpsTodos :withdrawals="overview.withdrawals" />
        <OpsWallets :wallets="overview.wallets" />
      </div>
      <div class="split">
        <OpsFiling :filing="overview.filing" />
        <OpsOrganization :organization="overview.organization" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.board:fullscreen {
  overflow: auto;
  padding: 24px;
  background: var(--aurel-paper);
}

.board__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.board__head h1 {
  font-size: 22px;
  font-weight: 600;
}

.board__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.hint,
.bounds {
  color: var(--aurel-muted);
}

.board__head .hint {
  max-width: 720px;
  margin-top: 6px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 1fr);
  gap: 12px;
}

@media (max-width: 1100px) {
  .split {
    grid-template-columns: 1fr;
  }
}
</style>
