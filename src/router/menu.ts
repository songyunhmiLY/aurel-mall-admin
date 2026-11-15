import type { Component } from 'vue'
import {
  Bell,
  ChatLineSquare,
  Coin,
  CreditCard,
  Document,
  Flag,
  Goods,
  House,
  Key,
  Medal,
  Notebook,
  OfficeBuilding,
  Picture,
  Present,
  PriceTag,
  School,
  Setting,
  Share,
  Star,
  Tickets,
  Trophy,
  User,
  Wallet,
} from '@element-plus/icons-vue'

import { paths } from './paths'

/**
 * 侧边栏只放一级分组，组内页面在页面顶部用 tab 切换。
 * 一级项从 13 个收敛到 8 个，深层页面不再需要展开二级菜单去找。
 */
export interface AdminMenuTab {
  key: string
  title: string
  path: string
  permission: string
  icon?: Component
}

export interface AdminMenuSection {
  key: string
  title: string
  icon: Component
  permission: string
  tabs: AdminMenuTab[]
}

export const adminSections: AdminMenuSection[] = [
  {
    key: 'dashboard',
    title: '运营总览',
    icon: House,
    permission: 'dashboard',
    tabs: [{ key: 'dashboard', title: '运营总览', path: paths.dashboard, permission: 'dashboard' }],
  },
  {
    key: 'trade',
    title: '商品与交易',
    icon: Goods,
    permission: 'catalog',
    tabs: [
      { key: 'catalog', title: '商品', path: paths.catalog, permission: 'catalog', icon: Goods },
      { key: 'order', title: '订单', path: paths.order, permission: 'order', icon: Tickets },
    ],
  },
  {
    key: 'member',
    title: '会员与团队',
    icon: User,
    permission: 'member',
    tabs: [
      { key: 'member', title: '会员', path: paths.member, permission: 'member', icon: User },
      {
        key: 'org-invites',
        title: '邀请关系',
        path: paths.orgInvites,
        permission: 'org.invites',
        icon: Share,
      },
      {
        key: 'org-markets',
        title: '市场关系',
        path: paths.orgMarkets,
        permission: 'org.markets',
        icon: OfficeBuilding,
      },
      {
        key: 'org-filings',
        title: '报单公排',
        path: paths.orgFilings,
        permission: 'org.filings',
        icon: Notebook,
      },
    ],
  },
  {
    key: 'reward',
    title: '奖励与分红',
    icon: Trophy,
    permission: 'rewards',
    tabs: [
      {
        key: 'reward-awards',
        title: '奖励明细',
        path: paths.rewardAwards,
        permission: 'rewards.awards',
        icon: Coin,
      },
      {
        key: 'reward-wallets',
        title: '会员钱包',
        path: paths.rewardWallets,
        permission: 'rewards.wallets',
        icon: Wallet,
      },
      {
        key: 'reward-positions',
        title: '职位分红',
        path: paths.rewardPositions,
        permission: 'rewards.positions',
        icon: Medal,
      },
    ],
  },
  {
    key: 'identity',
    title: '身份与权益',
    icon: Star,
    permission: 'cofounder',
    tabs: [
      {
        key: 'cofounder-people',
        title: '联合创始人',
        path: paths.cofounderPeople,
        permission: 'cofounder.people',
        icon: Star,
      },
      {
        key: 'cofounder-settings',
        title: '联创名额',
        path: paths.cofounderSettings,
        permission: 'cofounder.settings',
        icon: Coin,
      },
      {
        key: 'cofounder-content',
        title: '联创介绍',
        path: paths.cofounderContent,
        permission: 'cofounder.content',
        icon: Picture,
      },
      {
        key: 'studio-people',
        title: '工作室',
        path: paths.studioPeople,
        permission: 'studio.people',
        icon: School,
      },
      {
        key: 'studio-settings',
        title: '工作室名称',
        path: paths.studioSettings,
        permission: 'studio.settings',
        icon: PriceTag,
      },
      {
        key: 'ops-team',
        title: '运营团队',
        path: paths.opsTeam,
        permission: 'ops-team',
        icon: Flag,
      },
    ],
  },
  {
    key: 'content',
    title: '内容与活动',
    icon: Document,
    permission: 'home',
    tabs: [
      {
        key: 'home-banners',
        title: '轮播图',
        path: paths.homeBanners,
        permission: 'home.banners',
        icon: Picture,
      },
      {
        key: 'home-articles',
        title: '资讯知识',
        path: paths.homeArticles,
        permission: 'home.articles',
        icon: Document,
      },
      {
        key: 'home-tickers',
        title: '滚动字幕',
        path: paths.homeTickers,
        permission: 'home.tickers',
        icon: ChatLineSquare,
      },
      {
        key: 'welfare-entry',
        title: '福利专场·入口',
        path: paths.welfareEntry,
        permission: 'welfare.entry',
        icon: Present,
      },
      {
        key: 'welfare-signups',
        title: '福利专场·报名',
        path: paths.welfareSignups,
        permission: 'welfare.signups',
        icon: Tickets,
      },
      {
        key: 'welfare-participants',
        title: '福利专场·资格',
        path: paths.welfareParticipants,
        permission: 'welfare.participants',
        icon: User,
      },
    ],
  },
  {
    key: 'finance',
    title: '财务',
    icon: CreditCard,
    permission: 'finance.withdrawals',
    tabs: [
      {
        key: 'withdrawals',
        title: '提现审核',
        path: paths.withdrawals,
        permission: 'finance.withdrawals',
        icon: CreditCard,
      },
      {
        key: 'finance',
        title: '财务对账',
        path: paths.finance,
        permission: 'finance',
        icon: Wallet,
      },
    ],
  },
  {
    key: 'settings',
    title: '设置',
    icon: Setting,
    permission: 'settings',
    tabs: [
      {
        key: 'settings-wechat-pay',
        title: '微信支付',
        path: paths.settingsWechatPay,
        permission: 'settings.wechat-pay',
        icon: Key,
      },
      {
        key: 'settings-notifications',
        title: '消息推送',
        path: paths.settingsNotifications,
        permission: 'settings.notifications',
        icon: Bell,
      },
      {
        key: 'settings-withdrawal-names',
        title: '提现分类',
        path: paths.settingsWithdrawalNames,
        permission: 'settings.withdrawal-display-names',
        icon: PriceTag,
      },
    ],
  },
]

/** 当前路径落在哪个分组。用于侧边栏高亮和页面顶部 tab。 */
export function findSectionByPath(path: string): AdminMenuSection | undefined {
  return adminSections.find((section) => section.tabs.some((tab) => matches(tab.path, path)))
}

/** 当前路径对应哪个 tab。长路径优先，避免 /order 抢走 /order/refunds。 */
export function findTabByPath(section: AdminMenuSection, path: string): AdminMenuTab | undefined {
  return [...section.tabs]
    .sort((left, right) => right.path.length - left.path.length)
    .find((tab) => matches(tab.path, path))
}

function matches(tabPath: string, path: string): boolean {
  return path === tabPath || path.startsWith(`${tabPath}/`)
}
