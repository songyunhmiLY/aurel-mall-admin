<script setup lang="ts">
import { computed } from 'vue'

import { adminMenus, type AdminMenuItem } from '@/router/menu'
import { paths } from '@/router/paths'
import { useAuthStore } from '@/stores/auth'

interface ModuleLink {
  title: string
  path: string
  group?: string
}

function leaves(items: AdminMenuItem[], group?: string): ModuleLink[] {
  return items.flatMap((item) => {
    if (item.children?.length) {
      return leaves(item.children, item.title)
    }
    if (!item.path || item.path === paths.dashboard) return []
    return [{ title: item.title, path: item.path, group }]
  })
}

const auth = useAuthStore()
const username = computed(() => auth.username || '管理员')
const modules = leaves(adminMenus)
</script>

<template>
  <section class="home">
    <header>
      <h1>首页</h1>
      <p>欢迎回来，{{ username }}。后台骨架已就绪，下列模块只有入口，页面内容待实现。</p>
    </header>
    <ul class="modules">
      <li v-for="item in modules" :key="item.path">
        <router-link class="module" :to="item.path">
          <span class="module__group">{{ item.group ?? '业务' }}</span>
          <span class="module__title">{{ item.title }}</span>
          <el-tag size="small" effect="plain">待实现</el-tag>
        </router-link>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.home header h1 {
  font-size: 22px;
  font-weight: 600;
}

.home header p {
  margin-top: 6px;
  color: var(--aurel-muted);
}

.modules {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.module {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-height: 112px;
  padding: 16px;
  text-decoration: none;
  background: var(--aurel-surface);
  border: 1px solid var(--aurel-line);
  border-radius: 12px;
}

.module:hover {
  border-color: var(--aurel-accent);
}

.module__group {
  color: var(--aurel-muted);
  font-size: 12px;
}

.module__title {
  font-size: 16px;
  font-weight: 600;
}
</style>
