import { defineStore } from 'pinia'

import { useAuthStore } from './auth'

/**
 * 管理端只有一种管理员角色，多个账户权限相同。
 * 已登录即可进入全部菜单。这里不维护权限矩阵。
 */
export const usePermissionStore = defineStore('permission', () => {
  const auth = useAuthStore()

  function canAccess(_code: string): boolean {
    return auth.isAuthenticated
  }

  return { canAccess }
})
