import type { RouteRecordRaw } from 'vue-router'

import { paths } from './paths'

export const routes: RouteRecordRaw[] = [
  {
    path: paths.login,
    name: 'login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: paths.dashboard,
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'catalog',
        name: 'catalog',
        component: () => import('@/views/catalog/CatalogView.vue'),
        meta: { title: '商品' },
      },
      {
        path: 'order',
        name: 'order',
        component: () => import('@/views/order/OrderView.vue'),
        meta: { title: '订单' },
      },
      {
        path: 'member',
        name: 'member',
        component: () => import('@/views/member/MemberView.vue'),
        meta: { title: '会员' },
      },
      {
        path: 'cms/banners',
        name: 'cms-banners',
        component: () => import('@/views/cms/BannerView.vue'),
        meta: { title: '轮播', section: '内容' },
      },
      {
        path: 'cms/articles',
        name: 'cms-articles',
        component: () => import('@/views/cms/ArticleView.vue'),
        meta: { title: '资讯', section: '内容' },
      },
      {
        path: 'cms/subtitles',
        name: 'cms-subtitles',
        component: () => import('@/views/cms/SubtitleView.vue'),
        meta: { title: '字幕', section: '内容' },
      },
      {
        path: 'finance',
        name: 'finance',
        component: () => import('@/views/finance/FinanceView.vue'),
        meta: { title: '财务' },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/error/NotFoundView.vue'),
        meta: { title: '页面不存在' },
      },
    ],
  },
]
