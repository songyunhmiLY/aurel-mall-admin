<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * 演练页专用的树形图：递归渲染节点卡片，父子之间用横纵总线连接。
 * 代替 el-tree 的缩进列表，支持折叠、悬浮 tip、点击回调。
 */
export interface TreeChartNode {
  key: string
  user: {
    userId: string
    nickname: string
    identities: string[]
    wallets: { withdrawable: number; points: number; consumption: number }
  } | null
  label: string
  filings: {
    filingNo: string
    sequence: number | null
    bizDate: string | null
    amountFen: number
    status: string
  }[]
  unfiled: { orderNo: string; units: number; amountFen: number; paidAt: string }[]
  children: TreeChartNode[]
}

const props = withDefaults(
  defineProps<{ node: TreeChartNode; depth?: number; defaultCollapsed?: boolean }>(),
  { depth: 0, defaultCollapsed: false },
)

const emit = defineEmits<{ select: [node: TreeChartNode] }>()

const collapsed = ref(props.defaultCollapsed && props.depth > 0 && props.node.children.length > 0)

const visibleChildren = computed(() => (collapsed.value ? [] : props.node.children))

const IDENTITIES: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'info' | 'danger' }
> = {
  member: { label: '会员', type: 'success' },
  cofounder: { label: '联创', type: 'danger' },
  studio: { label: '工作室', type: 'warning' },
  ops_team: { label: '运营团队', type: 'warning' },
}

function identityOf(value: string) {
  return IDENTITIES[value] ?? { label: value, type: 'info' as const }
}

/** 分转成 ¥x.xx，节点卡上空间小，不带「元」。 */
function money(value: number): string {
  return `¥${(value / 100).toFixed(2)}`
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <div class="tc-node">
    <el-tooltip
      v-if="node.user"
      placement="top-start"
      effect="light"
      :show-after="180"
      :hide-after="0"
    >
      <template #content>
        <div class="tc-tip">
          <div class="tc-tip__title">#{{ node.user.userId }} {{ node.user.nickname }}</div>
          <div class="tc-tip__section">公排报单序号</div>
          <div v-if="node.filings.length === 0" class="tc-tip__empty">暂无已完成报单</div>
          <div v-for="item in node.filings" :key="item.filingNo" class="tc-tip__line">
            第 {{ item.sequence }} 单 · {{ item.bizDate ?? '-' }} · {{ money(item.amountFen) }} ·
            {{ item.status === 'settled' ? '已返现' : '已完成' }}
          </div>
          <div class="tc-tip__section">未参与公排的订单</div>
          <div v-if="node.unfiled.length === 0" class="tc-tip__empty">无</div>
          <div v-for="item in node.unfiled" :key="item.orderNo" class="tc-tip__line">
            {{ item.orderNo }} · {{ item.units }} 件 · {{ money(item.amountFen) }} ·
            {{ formatDateTime(item.paidAt) }}
          </div>
          <div class="tc-tip__hint">点击节点查看账户变动明细</div>
        </div>
      </template>
      <div class="tc-card tc-card--user" @click="emit('select', node)">
        <div class="tc-card__head">
          <span class="tc-card__id">#{{ node.user.userId }}</span>
          <span class="tc-card__nick" :title="node.user.nickname">{{ node.user.nickname }}</span>
          <el-tag
            v-for="identity in node.user.identities"
            :key="identity"
            size="small"
            effect="plain"
            :type="identityOf(identity).type"
          >
            {{ identityOf(identity).label }}
          </el-tag>
        </div>
        <div class="tc-card__wallets">
          <span>提现 {{ money(node.user.wallets.withdrawable) }}</span>
          <span>积分 {{ money(node.user.wallets.points) }}</span>
          <span>消费 {{ money(node.user.wallets.consumption) }}</span>
        </div>
      </div>
    </el-tooltip>
    <div v-else class="tc-card tc-card--group" @click="emit('select', node)">
      {{ node.label }}
    </div>

    <button
      v-if="node.children.length > 0"
      class="tc-toggle"
      type="button"
      :title="collapsed ? `展开 ${node.children.length} 个下级` : '收起下级'"
      @click.stop="collapsed = !collapsed"
    >
      {{ collapsed ? `+${node.children.length}` : '−' }}
    </button>

    <div v-if="node.children.length > 0" class="tc-children">
      <div v-for="child in visibleChildren" :key="child.key" class="tc-child">
        <UserTreeChart
          :node="child"
          :depth="depth + 1"
          :default-collapsed="defaultCollapsed"
          @select="emit('select', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ---------- 节点卡片 ---------- */

.tc-card {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  border: 1px solid var(--aurel-line);
  border-radius: 8px;
  background: var(--aurel-surface);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.tc-card--user {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 170px;
  padding: 5px 9px;
}

.tc-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
}

.tc-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 6px;
}

.tc-card__id {
  color: var(--aurel-muted);
  font-size: 12px;
}

.tc-card__nick {
  max-width: 100px;
  overflow: hidden;
  font-weight: 600;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tc-card__wallets {
  display: flex;
  flex-wrap: wrap;
  gap: 0 7px;
  color: var(--aurel-muted);
  font-size: 10.5px;
  line-height: 1.4;
}

.tc-card--group {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-style: dashed;
  color: var(--aurel-muted);
  font-size: 12px;
  cursor: default;
}

/* ---------- 折叠按钮 ---------- */

.tc-toggle {
  position: relative;
  z-index: 1;
  margin: 3px 0;
  padding: 0 7px;
  height: 18px;
  min-width: 22px;
  border: 1px solid var(--tc-line);
  border-radius: 9px;
  background: var(--aurel-surface);
  color: var(--aurel-muted);
  font-size: 11px;
  line-height: 16px;
  cursor: pointer;
}

.tc-toggle:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

/* ---------- 连线：父卡右侧竖干 + 纵向总线 + 子卡左侧竖线（从左往右生长） ---------- */

.tc-node {
  --tc-line: #c3cad8;

  display: inline-flex;
  align-items: center;
}

.tc-children {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-left: 18px;
}

/* 父卡到纵向总线的横干 */
.tc-children::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 18px;
  border-top: 1px solid var(--tc-line);
}

.tc-child {
  position: relative;
  padding-left: 18px;
}

/* 每个孩子上下两段纵向总线 */
.tc-child::before,
.tc-child::after {
  content: '';
  position: absolute;
  left: 0;
  border-left: 1px solid var(--tc-line);
}

.tc-child::before {
  top: 0;
  bottom: 50%;
}

.tc-child::after {
  top: 50%;
  bottom: 0;
}

/* 总线横接到孩子卡片左侧 */
.tc-child > .tc-node::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 18px;
  border-top: 1px solid var(--tc-line);
}

/* 两端的孩子只保留朝内的一半总线，避免线条出头 */
.tc-child:first-child::before {
  display: none;
}

.tc-child:last-child::after {
  display: none;
}

/* ---------- 悬浮 tip ---------- */

.tc-tip {
  max-width: 360px;
  line-height: 1.6;
}

.tc-tip__title {
  margin-bottom: 4px;
  font-weight: 600;
}

.tc-tip__section {
  margin-top: 6px;
  color: var(--aurel-muted);
  font-size: 12px;
}

.tc-tip__line {
  font-size: 12px;
}

.tc-tip__empty {
  color: var(--aurel-muted);
  font-size: 12px;
}

.tc-tip__hint {
  margin-top: 6px;
  color: var(--el-color-primary);
  font-size: 12px;
}
</style>
