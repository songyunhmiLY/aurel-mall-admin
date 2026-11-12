import { createRouter, createWebHistory } from 'vue-router'

import { installGuard } from './guard'
import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

installGuard(router)

export default router
