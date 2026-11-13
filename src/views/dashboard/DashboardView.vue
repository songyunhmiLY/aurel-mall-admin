<script setup lang="ts">
import { computed } from 'vue'

import { adminMenus, type AdminMenuItem } from '@/router/menu'
import { paths } from '@/router/paths'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'

interface ModuleLink {
  title: string
  path: string
  group?: string
  placeholder: boolean
  permission: string
}

function leaves(items: AdminMenuItem[], group?: string): ModuleLink[] {
  return items.flatMap((item) => {
    if (item.children?.length) {
      return leaves(item.children, item.title)
    }
    if (!item.path || item.path === paths.dashboard) return []
    return [
      {
        title: item.title,
        path: item.path,
        group,
        placeholder: item.placeholder !== false,
        permission: item.permission,
      },
    ]
  })
}

const auth = useAuthStore()
const permission = usePermissionStore()
const username = computed(() => auth.username || '管理员')
const modules = leaves(adminMenus).filter((item) => permission.canAccess(item.permission))
</script>

<template>
  <section class="home">
    <header>
      <h1>首页</h1>
      <p>
        欢迎回来，{{
          username
        }}。商品、订单、商城退款、会员、提现审核、组织关系和奖励可以处理。营销经理门槛在职位分红页。内容、财务总览仍待实现。
      </p>
    </header>
    <ul class="modules">
      <li v-for="item in modules" :key="item.path">
        <router-link class="module" :to="item.path">
          <span class="module__group">{{ item.group ?? '业务' }}</span>
          <span class="module__title">{{ item.title }}</span>
          <el-tag size="small" effect="plain" :type="item.placeholder ? 'info' : 'success'">
            {{ item.placeholder ? '待实现' : '可用' }}
          </el-tag>
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
