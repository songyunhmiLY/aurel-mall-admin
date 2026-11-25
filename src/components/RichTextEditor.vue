<script setup lang="ts">
import '@wangeditor/editor/dist/css/style.css'
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { ElMessage } from 'element-plus'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'

import { uploadArticleImage } from '@/api/home'
import { apiErrorMessage } from '@/api/http'

/**
 * 富文本编辑器：所见即所得编辑 HTML，图片走后端上传接口插入。
 * 外部直接 v-model 绑定 HTML 字符串；切换到源码模式时用 textarea 编辑同一份内容。
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

const editorRef = shallowRef<IDomEditor>()

const toolbarConfig: Partial<IToolbarConfig> = {
  // 小程序端富文本不支持视频，去掉视频菜单。
  excludeKeys: ['group-video', 'fullScreen'],
}

const editorConfig: Partial<IEditorConfig> = {
  placeholder: props.placeholder,
  readOnly: props.disabled,
  MENU_CONF: {
    uploadImage: {
      // 小程序与 H5 渲染时不支持 data: 协议，图片一律走上传拿 http(s) 地址。
      allowedFileTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
      async customUpload(file: File, insertFn: (url: string, alt?: string) => void) {
        try {
          const url = await uploadArticleImage(file)
          insertFn(url, file.name)
        } catch (error) {
          ElMessage.error(apiErrorMessage(error, '图片上传失败'))
        }
      },
    },
  },
}

const containerStyle = computed(() => ({ height: `${props.height}px` }))

function onCreated(editor: IDomEditor): void {
  editorRef.value = editor
}

function onHtmlInput(html: string): void {
  emit('update:modelValue', html)
}

onBeforeUnmount(() => {
  editorRef.value?.destroy()
  editorRef.value = undefined
})
</script>

<template>
  <div class="rich-editor" :class="{ 'is-disabled': disabled }">
    <Toolbar class="rich-editor__bar" :editor="editorRef" :default-config="toolbarConfig" mode="default" />
    <Editor
      class="rich-editor__body"
      :style="containerStyle"
      :default-config="editorConfig"
      :model-value="modelValue"
      mode="default"
      @on-created="onCreated"
      @update:model-value="onHtmlInput"
    />
  </div>
</template>

<style scoped>
.rich-editor {
  width: 100%;
  border: 1px solid var(--aurel-line, #dcdfe6);
  border-radius: 6px;
  overflow: hidden;
  z-index: 0;
}

.rich-editor.is-disabled {
  opacity: 0.6;
}

.rich-editor__bar {
  border-bottom: 1px solid var(--aurel-line, #dcdfe6);
}
</style>
