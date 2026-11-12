import type { Router } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

import { paths } from './paths'

export function installGuard(router: Router): void {
  router.beforeEach((to) => {
    const auth = useAuthStore()
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

    if (requiresAuth && !auth.isAuthenticated) {
      return {
        name: 'login',
        query: { redirect: to.fullPath },
      }
    }

    if (to.name === 'login' && auth.isAuthenticated) {
      return { path: paths.dashboard }
    }

    return true
  })

  router.afterEach((to) => {
    const titles = to.matched
      .map((record) => record.meta.title)
      .filter((title): title is string => Boolean(title))
    document.title = titles.length
      ? `${titles.join(' / ')} · 奥瑞尔经销商城`
      : '奥瑞尔经销商城 · 管理后台'
  })
}
