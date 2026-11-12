import { defineStore } from 'pinia'

import { useAuthStore } from './auth'

/**
 * 管理端信息架构与权限模型仍待定（TBD）。
 * 这里只留薄钩子：已登录则放行全部占位菜单。
 * 以后角色和权限在此集中判断，不要写进各个视图。
 */
export const usePermissionStore = defineStore('permission', () => {
  const auth = useAuthStore()

  function canAccess(_code: string): boolean {
    return auth.isAuthenticated
  }

  return { canAccess }
})
