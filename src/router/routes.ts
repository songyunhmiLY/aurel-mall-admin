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
        meta: { title: '运营总览' },
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
        path: 'welfare/entry',
        name: 'welfare-entry',
        component: () => import('@/views/welfare/EntryView.vue'),
        meta: { title: '入口配置', section: '福利专场' },
      },
      {
        path: 'welfare/signups',
        name: 'welfare-signups',
        component: () => import('@/views/welfare/SignupView.vue'),
        meta: { title: '报名记录', section: '福利专场' },
      },
      {
        path: 'welfare/participants',
        name: 'welfare-participants',
        component: () => import('@/views/welfare/ParticipantView.vue'),
        meta: { title: '参与资格', section: '福利专场' },
      },
      {
        path: 'cofounder/content',
        name: 'cofounder-content',
        component: () => import('@/views/cofounder/ContentView.vue'),
        meta: { title: '入口与介绍', section: '联合创始人' },
      },
      {
        path: 'cofounder/settings',
        name: 'cofounder-settings',
        component: () => import('@/views/cofounder/SettingsView.vue'),
        meta: { title: '名额与分配', section: '联合创始人' },
      },
      {
        path: 'cofounder/people',
        name: 'cofounder-people',
        component: () => import('@/views/cofounder/ListView.vue'),
        meta: { title: '在籍名单', section: '联合创始人' },
      },
      {
        path: 'studio/people',
        name: 'studio-people',
        component: () => import('@/views/studio/ListView.vue'),
        meta: { title: '名单', section: '工作室' },
      },
      {
        path: 'studio/settings',
        name: 'studio-settings',
        component: () => import('@/views/studio/SettingsView.vue'),
        meta: { title: '对外名称', section: '工作室' },
      },
      {
        path: 'ops-team',
        name: 'ops-team',
        component: () => import('@/views/ops-team/HolderView.vue'),
        meta: { title: '运营团队' },
      },
      {
        path: 'home/banners',
        name: 'home-banners',
        component: () => import('@/views/home/BannerView.vue'),
        meta: { title: '轮播图', section: '首页轮播图、资讯知识和滚动字幕' },
      },
      {
        path: 'home/articles',
        name: 'home-articles',
        component: () => import('@/views/home/ArticleView.vue'),
        meta: { title: '资讯和知识', section: '首页轮播图、资讯知识和滚动字幕' },
      },
      {
        path: 'home/tickers',
        name: 'home-tickers',
        component: () => import('@/views/home/TickerView.vue'),
        meta: { title: '滚动字幕', section: '首页轮播图、资讯知识和滚动字幕' },
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
        path: 'settings/notifications',
        name: 'settings-notifications',
        component: () => import('@/views/settings/NotificationsView.vue'),
        meta: { title: '消息推送', section: '设置' },
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
