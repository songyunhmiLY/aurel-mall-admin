<script setup lang="ts">
import type { OpsOrganization } from '@/api/ops-overview'

import { moneyText } from '../ops-format'
import { inviteList, marketList, memberList, positionList } from '../ops-links'

defineProps<{
  organization: OpsOrganization
}>()

function positionTitle(positionName: string, positionCode: string): string {
  return positionName || positionCode
}
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <h2>组织</h2>
      <span class="panel__links">
        <router-link :to="inviteList()">邀请关系</router-link>
        <router-link :to="positionList()">职位分红</router-link>
      </span>
    </header>
    <ul class="rows">
      <li>
        <span>已入座会员</span>
        <router-link :to="memberList()">{{ organization.seatedMembers }} 人</router-link>
      </li>
      <li>
        <span>未入座</span>
        <router-link :to="memberList()">{{ organization.nonMembers }} 人</router-link>
      </li>
      <li>
        <span>直接下级市场已有 3 个的会员</span>
        <router-link :to="marketList()">{{ organization.membersWithThreeMarkets }} 人</router-link>
      </li>
    </ul>
    <template v-if="organization.positionQualifications.available">
      <h3>
        {{ organization.positionQualifications.performanceMonth }} 资格
        <router-link :to="positionList()">
          门槛 {{ moneyText(organization.positionQualifications.thresholdFen) }}
        </router-link>
      </h3>
      <ul class="rows">
        <li v-for="row in organization.positionQualifications.counts" :key="row.positionCode">
          <span>{{ positionTitle(row.positionName, row.positionCode) }}</span>
          <router-link :to="positionList()">{{ row.qualifiedCount }} 人</router-link>
        </li>
      </ul>
      <p class="hint">人数是达到该档资格的会员数。这里不显示分红金额。</p>
    </template>
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

.panel__head,
.panel__links {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel__links {
  justify-content: flex-end;
}

.panel__head h2,
h3 {
  font-size: 16px;
  font-weight: 600;
}

h3 {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
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
