<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { usePermissionStore } from '@/stores/permission'
import {
  adminSections,
  findSectionByPath,
  type AdminMenuSection,
  type AdminMenuTab,
} from '@/router/menu'

defineProps<{
  collapsed: boolean
}>()

const route = useRoute()
const permission = usePermissionStore()

interface VisibleSection {
  key: string
  title: string
  icon: AdminMenuSection['icon']
  landing: string
}

function accessibleTabs(section: AdminMenuSection): AdminMenuTab[] {
  return section.tabs.filter((tab) => permission.canAccess(tab.permission))
}

const sections = computed<VisibleSection[]>(() =>
  adminSections.flatMap((section) => {
    if (!permission.canAccess(section.permission)) {
      return []
    }
    const tabs = accessibleTabs(section)
    const landing = tabs[0]?.path
    if (!landing) {
      return []
    }
    return [{ key: section.key, title: section.title, icon: section.icon, landing }]
  }),
)

const activePath = computed(() => {
  const section = findSectionByPath(route.path)
  if (!section) {
    return route.path
  }
  const tabs = accessibleTabs(section)
  const current = tabs
    .filter((tab) => route.path === tab.path || route.path.startsWith(`${tab.path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0]
  return current?.path ?? tabs[0]?.path ?? route.path
})
</script>

<template>
  <div class="sidebar">
    <div class="brand">
      <span class="brand__mark">奥</span>
      <span v-show="!collapsed" class="brand__text">
        <strong>奥瑞尔</strong>
        <small>经销商城</small>
      </span>
    </div>
    <el-menu class="menu" :collapse="collapsed" :default-active="activePath" router>
      <el-menu-item v-for="item in sections" :key="item.key" :index="item.landing">
        <el-icon><component :is="item.icon" /></el-icon>
        <template #title>{{ item.title }}</template>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--aurel-sidebar);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--aurel-header-height);
  padding: 0 16px;
  color: #fff;
}

.brand__mark {
  display: grid;
  flex: 0 0 32px;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--aurel-accent);
  font-weight: 700;
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand__text small {
  color: var(--aurel-sidebar-text);
  font-size: 12px;
}

.menu {
  flex: 1;
  border-right: 0;
  background: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: var(--aurel-sidebar-text);
  --el-menu-hover-bg-color: rgb(255 255 255 / 6%);
  --el-menu-active-color: #fff;
  --el-menu-hover-text-color: #fff;
}

.menu :deep(.el-menu-item.is-active) {
  background: rgb(15 110 98 / 35%);
  box-shadow: inset 3px 0 0 var(--aurel-accent);
}
</style>
