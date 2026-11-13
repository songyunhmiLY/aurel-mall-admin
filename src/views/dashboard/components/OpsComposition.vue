<script setup lang="ts">
import { computed } from 'vue'

import type { OpsCashComposition, OpsZoneComposition } from '@/api/ops-overview'
import type { OrderZone } from '@/api/orders'

import { moneyText } from '../ops-format'
import { orderList, refundList, withdrawalList } from '../ops-links'

const props = defineProps<{
  startup: OpsZoneComposition
  mall: OpsZoneComposition
  cash: OpsCashComposition
}>()

const zones = computed(() => {
  const rows: Array<{ key: OrderZone; title: string; data: OpsZoneComposition }> = [
    { key: 'startup', title: '创业专区', data: props.startup },
    { key: 'mall', title: '会员商城', data: props.mall },
  ]
  return rows
})
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <h2>区间构成</h2>
    </header>
    <p class="hint">应付含该单运费。关闭未支付的订单只计在已关闭，不进入应付和微信实收。</p>
    <div class="zones">
      <article v-for="zone in zones" :key="zone.key" class="zone">
        <h3>
          <router-link :to="orderList(zone.key)">{{ zone.title }}</router-link>
        </h3>
        <dl>
          <div>
            <dt>订单</dt>
            <dd>
              <router-link :to="orderList(zone.key)">{{ zone.data.orderCount }} 笔</router-link>
            </dd>
          </div>
          <div>
            <dt>件数</dt>
            <dd>
              <router-link :to="orderList(zone.key)">{{ zone.data.itemQuantity }} 件</router-link>
            </dd>
          </div>
          <div>
            <dt>应付</dt>
            <dd>
              <router-link :to="orderList(zone.key)">{{
                moneyText(zone.data.payableFen)
              }}</router-link>
            </dd>
          </div>
          <div>
            <dt>待发货</dt>
            <dd>
              <router-link :to="orderList(zone.key, 'paid')" title="状态仍为已支付">
                {{ zone.data.pendingShipmentCount }} 笔
              </router-link>
            </dd>
          </div>
          <div>
            <dt>已发货</dt>
            <dd>
              <router-link :to="orderList(zone.key, 'shipped')">
                {{ zone.data.shippedCount }} 笔
              </router-link>
            </dd>
          </div>
          <div>
            <dt>已关闭</dt>
            <dd>
              <router-link :to="orderList(zone.key, 'closed')">
                {{ zone.data.closedCount }} 笔
              </router-link>
            </dd>
          </div>
        </dl>
      </article>
    </div>
    <h3 class="cash-title">现金</h3>
    <ul class="cash">
      <li>
        <span>微信实收</span>
        <router-link :to="orderList()">{{ moneyText(cash.wechatCashInFen) }}</router-link>
      </li>
      <li>
        <span>微信实退</span>
        <router-link :to="refundList()">{{ moneyText(cash.wechatCashRefundedFen) }}</router-link>
      </li>
      <li>
        <span>微信净额</span>
        <router-link :to="orderList()">{{ moneyText(cash.netCashFen) }}</router-link>
      </li>
      <li>
        <span>提现打款</span>
        <router-link :to="withdrawalList('paid')">{{
          moneyText(cash.withdrawalPayoutFen)
        }}</router-link>
      </li>
      <li>
        <span>联合创始人开通</span>
        <strong>{{ moneyText(cash.cofounderActivationFen) }}</strong>
      </li>
    </ul>
    <p class="hint">
      提现打款不从微信净额里扣。联合创始人开通单独列出，没有这笔微信支付时为 0.00
      元，不并入商品实收。
    </p>
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

.panel__head h2,
.zone h3,
.cash-title {
  font-size: 16px;
  font-weight: 600;
}

.zone h3,
.cash-title {
  font-size: 14px;
}

.hint {
  color: var(--aurel-muted);
  font-size: 13px;
}

.zones {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.zone {
  padding: 12px;
  border: 1px solid var(--aurel-line);
  border-radius: 10px;
}

.zone dl {
  display: grid;
  gap: 8px;
  margin: 10px 0 0;
}

.zone dl div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.zone dt {
  color: var(--aurel-muted);
}

.zone dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

a {
  color: var(--aurel-accent-strong);
  font-weight: 600;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.cash {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cash li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--aurel-line);
  font-variant-numeric: tabular-nums;
}

.cash span {
  color: var(--aurel-muted);
}

@media (max-width: 720px) {
  .zones {
    grid-template-columns: 1fr;
  }
}
</style>
