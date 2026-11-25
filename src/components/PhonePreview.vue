<script setup lang="ts">
/**
 * H5/小程序样式的手机预览框。
 * 只负责外壳（状态栏 + 标题栏 + 可滚动内容区），页面内容由各处用 slot 自拟，
 * 与 uniapp 页面的实际排版保持一致。
 */
withDefaults(defineProps<{ title: string; frameTitle?: string }>(), { frameTitle: '效果预览' })
</script>

<template>
  <div class="phone">
    <p class="phone__hint">{{ frameTitle }}（模拟小程序页面，最终以真机为准）</p>
    <div class="phone__device">
      <div class="phone__status">
        <span>9:41</span>
        <span class="phone__notch" />
        <span class="phone__battery" />
      </div>
      <div class="phone__header">
        <span class="phone__back">‹</span>
        <span class="phone__title">{{ title }}</span>
        <span class="phone__placeholder" />
      </div>
      <div class="phone__scroll">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.phone {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.phone__hint {
  margin: 0;
  color: var(--aurel-muted, #909399);
  font-size: 12px;
}

.phone__device {
  width: 375px;
  max-width: 100%;
  height: 640px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--aurel-line, #dcdfe6);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
}

.phone__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: #fff;
  color: #333;
  font-size: 12px;
}

.phone__notch {
  width: 90px;
  height: 16px;
  background: #111;
  border-radius: 8px;
}

.phone__battery {
  width: 20px;
  height: 10px;
  border: 1px solid #333;
  border-radius: 3px;
}

.phone__header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.phone__back {
  width: 24px;
  color: #333;
  font-size: 20px;
  line-height: 1;
}

.phone__title {
  flex: 1;
  text-align: center;
  color: #333;
  font-size: 15px;
  font-weight: 600;
}

.phone__placeholder {
  width: 24px;
}

.phone__scroll {
  flex: 1;
  overflow-y: auto;
  background: #f7f7f8;
}

/* slot 里的富文本排版 */
.phone__scroll :deep(.rich-body) {
  padding: 12px 16px 24px;
  color: #333;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.phone__scroll :deep(.rich-body img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

.phone__scroll :deep(.rich-body h1),
.phone__scroll :deep(.rich-body h2),
.phone__scroll :deep(.rich-body h3),
.phone__scroll :deep(.rich-body h4) {
  margin: 14px 0 8px;
  font-size: 16px;
  line-height: 1.5;
}

.phone__scroll :deep(.rich-body p) {
  margin: 0 0 10px;
}

.phone__scroll :deep(.rich-body ul),
.phone__scroll :deep(.rich-body ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.phone__scroll :deep(.rich-body blockquote) {
  margin: 0 0 10px;
  padding: 6px 12px;
  border-left: 3px solid #d8b26e;
  background: #faf6ee;
  color: #6b5b3e;
}

.phone__scroll :deep(.rich-body a) {
  color: #2f6fe4;
}
</style>
