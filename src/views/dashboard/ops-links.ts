import type { RouteLocationRaw } from 'vue-router'

import type { OrderStatus, OrderZone } from '@/api/orders'
import { paths } from '@/router/paths'

export function memberList(id?: string): RouteLocationRaw {
  if (id && /^\d+$/.test(id)) return { path: paths.member, query: { id } }
  return { path: paths.member }
}

export function orderList(zone?: OrderZone, status?: OrderStatus): RouteLocationRaw {
  const query: Record<string, string> = {}
  if (zone) query.zone = zone
  if (status) query.status = status
  return { path: paths.order, query }
}

export function withdrawalList(status?: 'pending' | 'paid' | 'rejected'): RouteLocationRaw {
  if (!status) return { path: paths.withdrawals }
  return { path: paths.withdrawals, query: { status } }
}

export function refundList(status?: 'pending' | 'approved' | 'rejected'): RouteLocationRaw {
  if (!status) return { path: paths.orderRefunds }
  return { path: paths.orderRefunds, query: { status } }
}

export function filingList(query?: {
  userId?: string
  bizDate?: string
  sequence?: number
}): RouteLocationRaw {
  const params: Record<string, string> = {}
  if (query?.userId && /^\d+$/.test(query.userId)) params.userId = query.userId
  if (query?.bizDate) params.bizDate = query.bizDate
  if (query?.sequence != null && query.sequence > 0) params.sequence = String(query.sequence)
  return { path: paths.orgFilings, query: params }
}

export function marketList(): RouteLocationRaw {
  return { path: paths.orgMarkets }
}

export function inviteList(userId?: string): RouteLocationRaw {
  if (userId && /^\d+$/.test(userId)) return { path: paths.orgInvites, query: { userId } }
  return { path: paths.orgInvites }
}

export function walletList(userId?: string): RouteLocationRaw {
  if (userId && /^\d+$/.test(userId)) return { path: paths.rewardWallets, query: { userId } }
  return { path: paths.rewardWallets }
}

export function awardList(userId?: string): RouteLocationRaw {
  if (userId && /^\d+$/.test(userId)) return { path: paths.rewardAwards, query: { userId } }
  return { path: paths.rewardAwards }
}

export function positionList(): RouteLocationRaw {
  return { path: paths.rewardPositions }
}
