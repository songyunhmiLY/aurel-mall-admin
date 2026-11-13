<script setup lang="ts">
import type { OpsFiling } from '@/api/ops-overview'
import { formatShanghaiTime } from '@/utils/datetime'

import { moneyText } from '../ops-format'
import { filingList, memberList, walletList } from '../ops-links'

defineProps<{
  filing: OpsFiling
}>()
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <h2>报单与公排</h2>
      <router-link :to="filingList()">报单公排</router-link>
    </header>
    <p class="hint">只展示。数字是业务日 {{ filing.todayBizDate }}，不随上方区间变化。</p>
    <ul class="rows">
      <li>
        <span>今日已报单</span>
        <router-link :to="filingList({ bizDate: filing.todayBizDate })">
          {{ filing.todayFiledCount }} 笔
        </router-link>
      </li>
      <li>
        <span>当前序号</span>
        <router-link :to="filingList()">{{ filing.currentSequence }}</router-link>
      </li>
      <li>
        <span>下一幸运返还序号</span>
        <router-link :to="filingList({ sequence: filing.nextLuckyReturnSequence })">
          {{ filing.nextLuckyReturnSequence }}
        </router-link>
      </li>
      <li>
        <span>对应结算序号</span>
        <strong>{{ filing.nextLuckyReturnBeneficiarySequence }}</strong>
      </li>
      <li>
        <span>尚未报出</span>
        <router-link :to="filingList()">{{ filing.backlogCount }} 笔</router-link>
      </li>
      <li>
        <span>每日检查</span>
        <strong>{{ filing.dailyCheckTime }}</strong>
      </li>
    </ul>
    <p class="hint">
      下一幸运返还序号是严格晚于当前序号的下一个 5 的倍数，结算对应序号
      k。每日检查时刻按接口返回原样显示。
    </p>
    <div v-if="filing.latestLuckyReturn" class="latest">
      <h3>最近一笔幸运返还</h3>
      <p>
        <router-link :to="filingList({ sequence: filing.latestLuckyReturn.triggerSequence })">
          触发序号 {{ filing.latestLuckyReturn.triggerSequence }}
        </router-link>
        ，结算序号 {{ filing.latestLuckyReturn.beneficiarySequence }}，
        <router-link :to="memberList(filing.latestLuckyReturn.beneficiaryUserId)">
          会员 {{ filing.latestLuckyReturn.beneficiaryUserId }}
        </router-link>
      </p>
      <p>
        <router-link :to="walletList(filing.latestLuckyReturn.beneficiaryUserId)">
          积分 {{ moneyText(filing.latestLuckyReturn.pointsFen) }} · 可提现
          {{ moneyText(filing.latestLuckyReturn.withdrawableFen) }}
        </router-link>
      </p>
      <p class="hint">{{ formatShanghaiTime(filing.latestLuckyReturn.settledAt) }}</p>
    </div>
    <p v-else class="hint">还没有幸运返还。</p>
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

.panel__head h2,
.latest h3 {
  font-size: 16px;
  font-weight: 600;
}

.latest h3 {
  font-size: 14px;
}

.latest {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
}

a:hover {
  text-decoration: underline;
}

strong {
  font-variant-numeric: tabular-nums;
}
</style>
