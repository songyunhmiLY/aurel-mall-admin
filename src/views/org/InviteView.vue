<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { apiErrorMessage } from '@/api/http'
import {
  fetchInvite,
  fetchInviteAncestors,
  fetchInviteDescendants,
  type DirectInvitee,
  type InviteChain,
  type InviteChainItem,
  type InvitePerson,
} from '@/api/invites'
import { formatShanghaiTime } from '@/utils/datetime'

const route = useRoute()
const router = useRouter()

const userId = ref('')
const depth = ref(5)
const loading = ref(false)
const loadError = ref('')
const chain = ref<InviteChain | null>(null)
const ancestors = ref<InviteChainItem[]>([])
const descendants = ref<InviteChainItem[]>([])
const descendantsLoading = ref(false)
const descendantsError = ref('')

const upward = computed(() => [...ancestors.value].reverse())

watch(
  () => queryText(route.query.userId),
  (id) => {
    userId.value = id
    if (/^\d+$/.test(id)) void load(id)
  },
  { immediate: true },
)

function queryText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0].trim()
  return ''
}

function search(): void {
  const id = userId.value.trim()
  if (!/^\d+$/.test(id)) {
    loadError.value = '请输入用户 ID'
    chain.value = null
    ancestors.value = []
    descendants.value = []
    return
  }
  if (id === queryText(route.query.userId)) {
    void load(id)
    return
  }
  void router.replace({ query: { userId: id } })
}

function openUser(id: string): void {
  if (!/^\d+$/.test(id) || id === queryText(route.query.userId)) return
  void router.replace({ query: { userId: id } })
}

async function load(id: string): Promise<void> {
  loading.value = true
  loadError.value = ''
  chain.value = null
  ancestors.value = []
  descendants.value = []
  try {
    const [invite, upwardChain] = await Promise.all([fetchInvite(id), fetchInviteAncestors(id)])
    chain.value = invite
    ancestors.value = upwardChain.items
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取邀请关系失败')
    loading.value = false
    return
  }
  loading.value = false
  await loadDescendants(id)
}

async function loadDescendants(id: string): Promise<void> {
  const levels = depth.value
  if (!Number.isInteger(levels) || levels < 1 || levels > 20) {
    descendantsError.value = '层数必须是 1 到 20 的整数'
    return
  }
  descendantsLoading.value = true
  descendantsError.value = ''
  try {
    const result = await fetchInviteDescendants(id, levels)
    descendants.value = result.items
    depth.value = result.depth
  } catch (error) {
    descendants.value = []
    descendantsError.value = apiErrorMessage(error, '读取下级失败')
  } finally {
    descendantsLoading.value = false
  }
}

function reloadDescendants(): void {
  const id = chain.value?.user.userId
  if (!id) return
  void loadDescendants(id)
}

function personText(person: Pick<InvitePerson, 'nickname' | 'userId'>): string {
  return person.nickname ? `${person.nickname}（${person.userId}）` : person.userId
}

function memberText(member: boolean): string {
  return member ? '是' : '否'
}
</script>

<template>
  <section class="ops-page">
    <header>
      <h1>邀请关系</h1>
    </header>
    <p class="ops-hint">
      查看邀请人、向上的邀请链、直接邀请的人，以及向下若干层。点其中一人可以换成以他为起点。这里不能改上级。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <div class="ops-toolbar">
      <el-input
        v-model="userId"
        placeholder="用户 ID"
        clearable
        class="ops-filter"
        @keyup.enter="search"
      />
      <el-button type="primary" @click="search">查询</el-button>
    </div>

    <div v-loading="loading">
      <template v-if="chain">
        <h2>向上</h2>
        <div class="ops-chain">
          <template v-for="person in upward" :key="person.userId">
            <el-button link type="primary" @click="openUser(person.userId)">
              {{ personText(person) }}
            </el-button>
            <span class="ops-chain__sep">/</span>
          </template>
          <strong>{{ personText(chain.user) }}</strong>
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户 ID">{{ chain.user.userId }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ chain.user.nickname || '—' }}</el-descriptions-item>
          <el-descriptions-item label="邀请码">
            {{ chain.user.inviteCode || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="是否会员">
            {{ memberText(chain.user.member) }}
          </el-descriptions-item>
          <el-descriptions-item label="邀请人">
            <el-button
              v-if="chain.inviter"
              link
              type="primary"
              @click="openUser(chain.inviter.userId)"
            >
              {{ personText(chain.inviter) }}
            </el-button>
            <span v-else>无</span>
          </el-descriptions-item>
        </el-descriptions>

        <h2>直接邀请</h2>
        <el-table :data="chain.directInvitees" empty-text="没有直接邀请的人">
          <el-table-column prop="userId" label="用户 ID" min-width="110" />
          <el-table-column label="昵称" min-width="140">
            <template #default="{ row }: { row: DirectInvitee }">
              {{ row.nickname || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="邀请码" min-width="110">
            <template #default="{ row }: { row: DirectInvitee }">
              {{ row.inviteCode || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="是否会员" width="100">
            <template #default="{ row }: { row: DirectInvitee }">
              {{ memberText(row.member) }}
            </template>
          </el-table-column>
          <el-table-column label="加入时间" min-width="170">
            <template #default="{ row }: { row: DirectInvitee }">
              {{ formatShanghaiTime(row.joinedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }: { row: DirectInvitee }">
              <el-button link type="primary" @click="openUser(row.userId)">向下</el-button>
            </template>
          </el-table-column>
        </el-table>

        <h2>向下</h2>
        <div class="ops-toolbar">
          <span>层数</span>
          <el-input-number v-model="depth" :min="1" :max="20" :step="1" :precision="0" />
          <el-button @click="reloadDescendants">刷新下级</el-button>
        </div>
        <el-alert
          v-if="descendantsError"
          type="error"
          :title="descendantsError"
          show-icon
          :closable="false"
        />
        <el-table v-loading="descendantsLoading" :data="descendants" empty-text="没有下级">
          <el-table-column prop="userId" label="用户 ID" min-width="110" />
          <el-table-column label="昵称" min-width="140">
            <template #default="{ row }: { row: InviteChainItem }">
              {{ row.nickname || '—' }}
            </template>
          </el-table-column>
          <el-table-column prop="depth" label="向下层数" width="100" />
          <el-table-column label="上级 ID" min-width="110">
            <template #default="{ row }: { row: InviteChainItem }">
              {{ row.parentUserId || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }: { row: InviteChainItem }">
              <el-button link type="primary" @click="openUser(row.userId)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </div>
  </section>
</template>
