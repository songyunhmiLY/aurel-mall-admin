<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { usePermissionStore } from '@/stores/permission'
import { adminMenus, type AdminMenuItem } from '@/router/menu'

defineProps<{
  collapsed: boolean
}>()

const route = useRoute()
const permission = usePermissionStore()

function filterMenus(items: AdminMenuItem[]): AdminMenuItem[] {
  return items
    .filter((item) => permission.canAccess(item.permission))
    .map((item) => ({
      ...item,
      children: item.children ? filterMenus(item.children) : undefined,
    }))
    .filter((item) => Boolean(item.path) || (item.children?.length ?? 0) > 0)
}

const menus = computed(() => filterMenus(adminMenus))
const opened = computed(() => {
  const keys: string[] = []
  if (route.path.startsWith('/home')) keys.push('home')
  if (route.path.startsWith('/org')) keys.push('org')
  if (route.path.startsWith('/rewards')) keys.push('rewards')
  if (route.path.startsWith('/welfare')) keys.push('welfare')
  if (route.path.startsWith('/cofounder')) keys.push('cofounder')
  if (route.path.startsWith('/studio')) keys.push('studio')
  if (route.path.startsWith('/settings')) keys.push('settings')
  return keys
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
    <el-menu
      :key="opened.join(',')"
      class="menu"
      :collapse="collapsed"
      :default-active="route.path"
      :default-openeds="opened"
      router
    >
      <template v-for="item in menus" :key="item.key">
        <el-sub-menu v-if="item.children?.length" :index="item.key">
          <template #title>
            <el-icon v-if="item.icon">
              <component :is="item.icon" />
            </el-icon>
            <span :class="{ menu__wrap: item.key === 'home' }" :title="item.title">{{
              item.title
            }}</span>
          </template>
          <el-menu-item v-for="child in item.children" :key="child.key" :index="child.path">
            <el-icon v-if="child.icon">
              <component :is="child.icon" />
            </el-icon>
            <span>{{ child.title }}</span>
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item v-else :index="item.path">
          <el-icon v-if="item.icon">
            <component :is="item.icon" />
          </el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </template>
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

.menu :deep(.el-menu) {
  background: transparent;
}

.menu :deep(.el-menu-item.is-active) {
  background: rgb(15 110 98 / 35%);
}

.menu :deep(.el-sub-menu__title:has(.menu__wrap)) {
  height: auto;
  min-height: var(--el-menu-item-height);
  line-height: 1.35;
  white-space: normal;
  padding-top: 8px;
  padding-bottom: 8px;
}

.menu__wrap {
  white-space: normal;
}
</style>
