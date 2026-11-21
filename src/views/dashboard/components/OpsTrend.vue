<script setup lang="ts">
import { computed } from 'vue'

import type { OpsTrendPoint } from '@/api/ops-overview'

import { moneyText } from '../ops-format'
import { awardList, orderList } from '../ops-links'

const props = defineProps<{
  trend: OpsTrendPoint[]
}>()

const chartHeight = 140

const bars = computed(() => {
  let max = 0n
  for (const row of props.trend) {
    const startup = BigInt(row.startupPayableFen)
    const mall = BigInt(row.mallPayableFen)
    if (startup > max) max = startup
    if (mall > max) max = mall
  }
  return props.trend.map((row, index) => ({
    bizDate: row.bizDate,
    startupPayableFen: row.startupPayableFen,
    mallPayableFen: row.mallPayableFen,
    startupHeight: barHeight(row.startupPayableFen, max),
    mallHeight: barHeight(row.mallPayableFen, max),
    showLabel: showDateLabel(index, props.trend.length),
  }))
})

function barHeight(fen: string, max: bigint): number {
  if (max <= 0n) return 0
  const value = BigInt(fen)
  if (value <= 0n) return 0
  const ratio = Number((value * 1000n) / max) / 1000
  return Math.max(ratio * chartHeight, 2)
}

function showDateLabel(index: number, total: number): boolean {
  if (total <= 16) return true
  if (index === 0 || index === total - 1) return true
  return index % 5 === 0
}
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <h2>订单与实收趋势</h2>
      <span class="panel__links">
        <router-link :to="orderList()">订单</router-link>
        <router-link :to="awardList()">奖励明细</router-link>
      </span>
    </header>
    <p class="hint">
      每个上海自然日的已支付应付。创业专区与会员商城分开，金额以接口按日返回的为准。
    </p>
    <div v-if="bars.length === 0" class="empty">这个区间没有自然日</div>
    <div v-else class="chart-scroll">
      <div class="chart" :style="{ minWidth: bars.length > 14 ? `${bars.length * 36}px` : '100%' }">
        <div v-for="bar in bars" :key="bar.bizDate" class="day">
          <div class="day__bars">
            <span
              class="bar bar--startup"
              :style="{ height: `${bar.startupHeight}px` }"
              :title="`${bar.bizDate} 创业专区 ${moneyText(bar.startupPayableFen)}`"
            />
            <span
              class="bar bar--mall"
              :style="{ height: `${bar.mallHeight}px` }"
              :title="`${bar.bizDate} 会员商城 ${moneyText(bar.mallPayableFen)}`"
            />
          </div>
          <span class="day__label">{{ bar.showLabel ? bar.bizDate.slice(5) : '' }}</span>
        </div>
      </div>
    </div>
    <ul class="legend">
      <li><i class="swatch swatch--startup" />创业专区应付</li>
      <li><i class="swatch swatch--mall" />会员商城应付</li>
    </ul>
    <p class="hint">
      应付是已支付订单的应付总额（含运费），不等于实际收到的现金。与右侧「微信实收」的差额为积分或可提现/消费金抵扣。
    </p>
    <el-table :data="trend" empty-text="没有日期" max-height="280">
      <el-table-column prop="bizDate" label="自然日" min-width="120" />
      <el-table-column label="创业专区应付" min-width="140">
        <template #default="{ row }">
          <router-link class="cell-link" :to="orderList('startup')">
            {{ moneyText(row.startupPayableFen) }}
          </router-link>
        </template>
      </el-table-column>
      <el-table-column label="会员商城应付" min-width="140">
        <template #default="{ row }">
          <router-link class="cell-link" :to="orderList('mall')">
            {{ moneyText(row.mallPayableFen) }}
          </router-link>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px 18px;
  background: var(--aurel-surface);
  border: 1px solid var(--aurel-line);
  border-radius: 12px;
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel__head h2 {
  font-size: 16px;
  font-weight: 600;
}

.panel__links {
  display: flex;
  gap: 12px;
}

.panel__head a,
.cell-link {
  color: var(--aurel-accent-strong);
  font-weight: 600;
  text-decoration: none;
}

.panel__head a:hover,
.cell-link:hover {
  text-decoration: underline;
}

.hint,
.empty {
  color: var(--aurel-muted);
  font-size: 13px;
}

.chart-scroll {
  overflow-x: auto;
}

.chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 168px;
  padding-top: 8px;
}

.day {
  display: flex;
  flex: 1 0 28px;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 28px;
}

.day__bars {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  height: 140px;
}

.bar {
  display: block;
  width: 10px;
  border-radius: 3px 3px 0 0;
}

.bar--startup {
  background: var(--aurel-accent);
}

.bar--mall {
  background: var(--aurel-ink-soft);
}

.day__label {
  min-height: 16px;
  color: var(--aurel-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.legend {
  display: flex;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--aurel-muted);
  font-size: 12px;
}

.legend li {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.swatch--startup {
  background: var(--aurel-accent);
}

.swatch--mall {
  background: var(--aurel-ink-soft);
}
</style>
