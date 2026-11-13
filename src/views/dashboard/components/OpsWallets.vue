<script setup lang="ts">
import type { OpsWalletBucket, OpsWallets } from '@/api/ops-overview'

import { moneyText } from '../ops-format'
import { walletList, withdrawalList } from '../ops-links'

defineProps<{
  wallets: OpsWallets
}>()

const buckets: Array<{
  key: keyof Pick<OpsWallets, 'withdrawable' | 'points' | 'consumption'>
  title: string
}> = [
  { key: 'withdrawable', title: '可提现' },
  { key: 'points', title: '积分' },
  { key: 'consumption', title: '消费' },
]

function bucket(wallets: OpsWallets, key: (typeof buckets)[number]['key']): OpsWalletBucket {
  return wallets[key]
}
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <h2>内部钱包</h2>
      <router-link :to="walletList()">会员钱包</router-link>
    </header>
    <p class="hint">这是对会员的负债，不是现金。可用是余额减冻结。</p>
    <ul class="rows">
      <li v-for="item in buckets" :key="item.key">
        <span>{{ item.title }}</span>
        <router-link :to="walletList()">
          可用 {{ moneyText(bucket(wallets, item.key).availableFen) }} · 冻结
          {{ moneyText(bucket(wallets, item.key).frozenFen) }}
        </router-link>
      </li>
      <li>
        <span>已申请尚未打款</span>
        <router-link :to="withdrawalList('pending')">
          {{ moneyText(wallets.withdrawalAppliedUnpaidFen) }}
        </router-link>
      </li>
    </ul>
    <p class="hint">已申请尚未打款的金额单独列出，不从冻结里再减一次。</p>
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

.hint {
  color: var(--aurel-muted);
  font-size: 13px;
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

.rows span {
  color: var(--aurel-muted);
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
