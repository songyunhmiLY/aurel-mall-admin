<script setup lang="ts">
import { ref } from 'vue'

import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import SectionTabs from './components/SectionTabs.vue'

const collapsed = ref(false)
</script>

<template>
  <el-container class="shell">
    <el-aside :width="collapsed ? '64px' : '220px'" class="shell__aside">
      <AppSidebar :collapsed="collapsed" />
    </el-aside>
    <el-container>
      <el-header class="shell__header" height="56px">
        <AppHeader :collapsed="collapsed" @toggle="collapsed = !collapsed" />
      </el-header>
      <SectionTabs />
      <el-main class="shell__body">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.shell {
  height: 100%;
  background: var(--aurel-paper);
}

.shell__aside {
  overflow: hidden;
  background: var(--aurel-sidebar);
  transition: width 0.2s ease;
}

.shell__header {
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: var(--aurel-surface);
  border-bottom: 1px solid var(--aurel-line);
}

.shell__body {
  padding: 20px;
}
</style>
