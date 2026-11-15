<script setup lang="ts">
import type { OpsWithdrawals } from '@/api/ops-overview'

import { moneyText } from '../ops-format'
import { withdrawalList } from '../ops-links'

defineProps<{
  withdrawals: OpsWithdrawals
}>()
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <h2>提现与待办</h2>
    </header>
    <ul class="rows">
      <li>
        <span>待审核提现</span>
        <router-link :to="withdrawalList('pending')">
          {{ withdrawals.pendingReview.count }} 笔 ·
          {{ moneyText(withdrawals.pendingReview.amountFen) }}
        </router-link>
      </li>
      <li>
        <span>区间已打款</span>
        <router-link :to="withdrawalList('paid')">
          {{ withdrawals.completedPayouts.count }} 笔 · 申请
          {{ moneyText(withdrawals.completedPayouts.amountFen) }} · 实付
          {{ moneyText(withdrawals.completedPayouts.payoutFen) }}
        </router-link>
      </li>
    </ul>
    <p class="hint">已打款金额是申请金额，实付与现金流水里的提现打款相同。</p>
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

.panel__head h2 {
  font-size: 16px;
  font-weight: 600;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rows li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
}

.rows span,
.hint {
  color: var(--aurel-muted);
  font-size: 13px;
}

a {
  color: var(--aurel-accent-strong);
  font-weight: 600;
  text-decoration: none;
  font-variant-numeric: tabular-nums;
}

a:hover {
  text-decoration: underline;
}
</style>
