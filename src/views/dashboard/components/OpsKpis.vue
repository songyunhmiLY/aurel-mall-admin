<script setup lang="ts">
import type { OpsKpis } from '@/api/ops-overview'

import { comparisonText, moneyText } from '../ops-format'
import { memberList, orderList, refundList, withdrawalList } from '../ops-links'
import OpsMetric from './OpsMetric.vue'

defineProps<{
  kpis: OpsKpis
}>()
</script>

<template>
  <div class="kpis">
    <OpsMetric label="当前注册用户" :value="`${kpis.registeredUsers} 人`" :to="memberList()" />
    <OpsMetric label="当前会员" :value="`${kpis.members} 人`" :to="memberList()" />
    <OpsMetric
      label="区间新增注册"
      :value="`${kpis.newRegistrations.count} 人`"
      :detail="comparisonText(kpis.newRegistrations)"
      :to="memberList()"
    />
    <OpsMetric
      label="区间新增会员"
      :value="`${kpis.newMembers.count} 人`"
      :detail="comparisonText(kpis.newMembers)"
      :to="memberList()"
    />
    <article class="cash">
      <router-link class="cash__main" :to="orderList()">
        <span class="cash__label">微信净现金</span>
        <strong>{{ moneyText(kpis.wechatCash.netFen) }}</strong>
      </router-link>
      <p class="cash__split">
        <router-link :to="orderList()">实收 {{ moneyText(kpis.wechatCash.cashInFen) }}</router-link>
        <router-link :to="refundList()"
          >实退 {{ moneyText(kpis.wechatCash.cashRefundedFen) }}</router-link
        >
      </p>
    </article>
    <OpsMetric
      label="待审核提现"
      :value="`${kpis.pendingWithdrawals.count} 笔`"
      :detail="moneyText(kpis.pendingWithdrawals.amountFen)"
      :to="withdrawalList('pending')"
    />
  </div>
</template>

<style scoped>
.kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.cash {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 108px;
  padding: 14px 16px;
  background: var(--aurel-surface);
  border: 1px solid var(--aurel-line);
  border-radius: 12px;
}

.cash__main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: inherit;
  text-decoration: none;
}

.cash__main:hover strong,
.cash__split a:hover {
  color: var(--aurel-accent-strong);
}

.cash__label {
  color: var(--aurel-muted);
  font-size: 13px;
}

.cash__main strong {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.cash__split {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  font-size: 12px;
}

.cash__split a {
  color: var(--aurel-ink-soft);
  text-decoration: none;
}

@media (min-width: 1600px) {
  .kpis {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .kpis {
    grid-template-columns: 1fr;
  }
}
</style>
