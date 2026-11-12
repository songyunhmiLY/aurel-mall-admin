<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = computed(() => route.meta.title ?? '未命名')
</script>

<template>
  <section class="page">
    <header class="page__header">
      <h1>{{ title }}</h1>
      <el-tag effect="plain">待实现</el-tag>
    </header>
    <el-empty description="待实现" />
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 360px;
  padding: 20px 24px;
  background: var(--aurel-surface);
  border: 1px solid var(--aurel-line);
  border-radius: 12px;
}

.page__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page__header h1 {
  font-size: 20px;
  font-weight: 600;
}
</style>
