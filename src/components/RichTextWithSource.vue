<script setup lang="ts">
import { ref } from 'vue'
import RichTextEditor from './RichTextEditor.vue'

/**
 * 富文本 + HTML 源码双模式编辑。两种模式编辑的是同一份 HTML。
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    height?: number
    disabled?: boolean
  }>(),
  { placeholder: '正文内容…', height: 360, disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [html: string] }>()

const mode = ref<'edit' | 'source'>('edit')
</script>

<template>
  <div class="rich-field">
    <div class="rich-field__bar">
      <el-radio-group v-model="mode" size="small">
        <el-radio-button value="edit">图文编辑</el-radio-button>
        <el-radio-button value="source">HTML 源码</el-radio-button>
      </el-radio-group>
      <span class="rich-field__tip">
        {{ mode === 'edit' ? '工具栏可插图，图片自动上传' : '直接编辑 HTML，保存时后端会做安全过滤' }}
      </span>
    </div>
    <RichTextEditor
      v-if="mode === 'edit'"
      :model-value="modelValue"
      :placeholder="placeholder"
      :height="height"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <el-input
      v-else
      :model-value="modelValue"
      type="textarea"
      :rows="Math.max(10, Math.round(height / 22))"
      :disabled="disabled"
      :placeholder="placeholder"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>

<style scoped>
.rich-field {
  width: 100%;
}

.rich-field__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.rich-field__tip {
  color: var(--aurel-muted, #909399);
  font-size: 12px;
}
</style>
