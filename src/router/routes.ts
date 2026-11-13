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
        path: 'order/refunds',
        name: 'order-refunds',
        component: () => import('@/views/order/RefundView.vue'),
        meta: { title: '商城退款', section: '订单' },
      },
      {
        path: 'member',
        name: 'member',
        component: () => import('@/views/member/MemberView.vue'),
        meta: { title: '会员' },
      },
      {
        path: 'org/invites',
        name: 'org-invites',
        component: () => import('@/views/org/InviteView.vue'),
        meta: { title: '邀请关系', section: '组织' },
      },
      {
        path: 'org/markets',
        name: 'org-markets',
        component: () => import('@/views/org/MarketView.vue'),
        meta: { title: '市场关系', section: '组织' },
      },
      {
        path: 'org/filings',
        name: 'org-filings',
        component: () => import('@/views/org/FilingView.vue'),
        meta: { title: '报单与公排', section: '组织' },
      },
      {
        path: 'rewards/positions',
        name: 'reward-positions',
        component: () => import('@/views/rewards/PositionView.vue'),
        meta: { title: '职位分红', section: '奖励' },
      },
      {
        path: 'rewards/awards',
        name: 'reward-awards',
        component: () => import('@/views/rewards/AwardView.vue'),
        meta: { title: '奖励明细', section: '奖励' },
      },
      {
        path: 'rewards/wallets',
        name: 'reward-wallets',
        component: () => import('@/views/rewards/WalletLookupView.vue'),
        meta: { title: '会员钱包', section: '奖励' },
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
        path: 'withdrawals',
        name: 'withdrawals',
        component: () => import('@/views/finance/WithdrawalView.vue'),
        meta: { title: '提现审核', section: '财务' },
      },
      {
        path: 'finance',
        name: 'finance',
        component: () => import('@/views/finance/FinanceView.vue'),
        meta: { title: '财务' },
      },
      {
        path: 'settings/wechat-pay',
        name: 'settings-wechat-pay',
        component: () => import('@/views/settings/WechatPayView.vue'),
        meta: { title: '微信支付', section: '设置' },
      },
      {
        path: 'settings/withdrawal-display-names',
        name: 'settings-withdrawal-display-names',
        component: () => import('@/views/settings/WithdrawalDisplayNamesView.vue'),
        meta: { title: '提现分类', section: '设置' },
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
