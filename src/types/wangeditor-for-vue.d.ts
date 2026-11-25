/**
 * @wangeditor/editor-for-vue 的 package.json exports 没带 types 条件，
 * bundler 解析下声明文件不会被拾取。这里补一个宽松声明（props 全部放开）。
 */
declare module '@wangeditor/editor-for-vue' {
  import type { DefineComponent } from 'vue'

  type WangEditorComponent = DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >

  export const Editor: WangEditorComponent
  export const Toolbar: WangEditorComponent
}
