<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Expand, Fold } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

import { useAuthStore } from '@/stores/auth'
import { paths } from '@/router/paths'

defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const crumbs = computed(() => {
  const section = route.meta.section
  const title = route.meta.title
  return [section, title].filter((item): item is string => Boolean(item))
})

const username = computed(() => auth.username || '管理员')

async function onCommand(command: string): Promise<void> {
  if (command !== 'logout') return
  try {
    await ElMessageBox.confirm('确定退出登录？', '退出', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  auth.signOut()
  await router.replace(paths.login)
}
</script>

<template>
  <div class="header">
    <div class="header__lead">
      <el-button text aria-label="切换菜单" @click="emit('toggle')">
        <el-icon :size="18">
          <Expand v-if="collapsed" />
          <Fold v-else />
        </el-icon>
      </el-button>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item v-for="crumb in crumbs" :key="crumb">
          {{ crumb }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <el-dropdown trigger="click" @command="onCommand">
      <button class="user" type="button">
        <span class="user__avatar">{{ username.slice(0, 1) }}</span>
        <span>{{ username }}</span>
      </button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="logout">退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.header__lead {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--aurel-ink);
  cursor: pointer;
}

.user:hover {
  background: var(--aurel-paper);
}

.user__avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--el-color-primary-light-8);
  color: var(--aurel-accent-strong);
  font-size: 13px;
  font-weight: 600;
}
</style>
