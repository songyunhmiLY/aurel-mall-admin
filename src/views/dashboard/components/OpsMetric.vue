<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  label: string
  value: string
  detail?: string
  to?: RouteLocationRaw
}>()
</script>

<template>
  <router-link v-if="to" class="metric" :to="to">
    <span class="metric__label">{{ label }}</span>
    <strong class="metric__value">{{ value }}</strong>
    <span v-if="detail" class="metric__detail">{{ detail }}</span>
  </router-link>
  <div v-else class="metric">
    <span class="metric__label">{{ label }}</span>
    <strong class="metric__value">{{ value }}</strong>
    <span v-if="detail" class="metric__detail">{{ detail }}</span>
  </div>
</template>

<style scoped>
.metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 108px;
  padding: 14px 16px;
  color: inherit;
  text-decoration: none;
  background: var(--aurel-surface);
  border: 1px solid var(--aurel-line);
  border-radius: 12px;
}

a.metric:hover,
a.metric:focus-visible {
  border-color: var(--aurel-accent);
  outline: none;
}

.metric__label {
  color: var(--aurel-muted);
  font-size: 13px;
}

.metric__value {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.metric__detail {
  color: var(--aurel-ink-soft);
  font-size: 12px;
  line-height: 1.4;
  word-break: keep-all;
}
</style>
