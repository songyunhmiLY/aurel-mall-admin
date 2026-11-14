<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { findSectionByPath, findTabByPath } from '@/router/menu'
import { usePermissionStore } from '@/stores/permission'

const route = useRoute()
const router = useRouter()
const permission = usePermissionStore()

const section = computed(() => findSectionByPath(route.path))

const tabs = computed(() =>
  section.value ? section.value.tabs.filter((tab) => permission.canAccess(tab.permission)) : [],
)

const active = computed(() => {
  if (!section.value) {
    return ''
  }
  return findTabByPath(section.value, route.path)?.key ?? ''
})

const visible = computed(() => tabs.value.length > 1)

function go(key: string | number): void {
  const tab = tabs.value.find((item) => item.key === String(key))
  if (tab && tab.path !== route.path) {
    void router.push(tab.path)
  }
}
</script>

<template>
  <div v-if="visible" class="section-tabs">
    <el-tabs :model-value="active" @tab-change="go">
      <el-tab-pane v-for="tab in tabs" :key="tab.key" :name="tab.key" :label="tab.title" />
    </el-tabs>
  </div>
</template>

<style scoped>
.section-tabs {
  padding: 0 20px;
  background: var(--aurel-surface);
  border-bottom: 1px solid var(--aurel-line);
}

.section-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.section-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.section-tabs :deep(.el-tabs__item) {
  height: 44px;
  font-size: 14px;
  color: var(--aurel-muted);
}

.section-tabs :deep(.el-tabs__item.is-active) {
  color: var(--aurel-accent);
  font-weight: 600;
}

.section-tabs :deep(.el-tabs__active-bar) {
  height: 2px;
  border-radius: 2px;
  background: var(--aurel-accent);
}
</style>
