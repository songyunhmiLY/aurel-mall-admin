import type { Component } from 'vue'
import {
  ChatLineSquare,
  Document,
  Goods,
  House,
  Key,
  Picture,
  Setting,
  Tickets,
  User,
  Wallet,
} from '@element-plus/icons-vue'

import { paths } from './paths'

export interface AdminMenuItem {
  key: string
  title: string
  path?: string
  icon?: Component
  permission: string
  /** 未完成的占位页。微信支付配置页除外。 */
  placeholder?: boolean
  children?: AdminMenuItem[]
}

/** 与 routes.ts 使用同一组路径。新增模块时两处一起加。 */
export const adminMenus: AdminMenuItem[] = [
  {
    key: 'dashboard',
    title: '首页',
    path: paths.dashboard,
    icon: House,
    permission: 'dashboard',
  },
  {
    key: 'catalog',
    title: '商品',
    path: paths.catalog,
    icon: Goods,
    permission: 'catalog',
    placeholder: false,
  },
  {
    key: 'order',
    title: '订单',
    path: paths.order,
    icon: Tickets,
    permission: 'order',
  },
  {
    key: 'member',
    title: '会员',
    path: paths.member,
    icon: User,
    permission: 'member',
    placeholder: false,
  },
  {
    key: 'cms',
    title: '内容',
    icon: Document,
    permission: 'cms',
    children: [
      {
        key: 'cms-banners',
        title: '轮播',
        path: paths.cmsBanners,
        icon: Picture,
        permission: 'cms.banners',
      },
      {
        key: 'cms-articles',
        title: '资讯',
        path: paths.cmsArticles,
        icon: Document,
        permission: 'cms.articles',
      },
      {
        key: 'cms-subtitles',
        title: '字幕',
        path: paths.cmsSubtitles,
        icon: ChatLineSquare,
        permission: 'cms.subtitles',
      },
    ],
  },
  {
    key: 'finance',
    title: '财务',
    path: paths.finance,
    icon: Wallet,
    permission: 'finance',
  },
  {
    key: 'settings',
    title: '设置',
    icon: Setting,
    permission: 'settings',
    children: [
      {
        key: 'settings-wechat-pay',
        title: '微信支付',
        path: paths.settingsWechatPay,
        icon: Key,
        permission: 'settings.wechat-pay',
        placeholder: false,
      },
    ],
  },
]
