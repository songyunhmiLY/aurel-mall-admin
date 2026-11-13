<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { apiErrorMessage } from '@/api/http'
import { fetchMarketTree, type MarketMember, type MarketTree } from '@/api/markets'
import { formatShanghaiTime } from '@/utils/datetime'

const route = useRoute()
const router = useRouter()

const userId = ref('')
const loading = ref(false)
const loadError = ref('')
const tree = ref<MarketTree | null>(null)

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
    tree.value = null
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
  tree.value = null
  try {
    tree.value = await fetchMarketTree(id)
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取市场关系失败')
  } finally {
    loading.value = false
  }
}

function depthText(depth: number | null): string {
  return depth == null ? '—' : String(depth)
}
</script>

<template>
  <section class="ops-page">
    <header>
      <h1>市场关系</h1>
    </header>
    <p class="ops-hint">
      查看会员在市场树上的席位、市场上级，以及从左到右最多 3
      个直接市场和每个市场里的会员。点上级或会员可以继续查看。这里不能调整席位。
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
      <template v-if="tree">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户 ID">{{ tree.userId }}</el-descriptions-item>
          <el-descriptions-item label="席位">
            {{ tree.seated ? '已入座' : '未入座' }}
          </el-descriptions-item>
          <el-descriptions-item label="市场上级">
            <el-button v-if="tree.parent" link type="primary" @click="openUser(tree.parent.userId)">
              {{ tree.parent.nickname || tree.parent.userId }}（{{ tree.parent.userId }}）
            </el-button>
            <span v-else>无（根）</span>
          </el-descriptions-item>
          <el-descriptions-item label="层级">{{ depthText(tree.depth) }}</el-descriptions-item>
          <el-descriptions-item label="入座时间">
            {{ formatShanghaiTime(tree.placedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <h2>直接市场</h2>
        <p v-if="!tree.seated" class="ops-hint">尚未入座，没有直接市场。</p>
        <p v-else-if="tree.markets.length === 0" class="ops-hint">没有直接市场。</p>
        <div v-else class="ops-grid">
          <section v-for="(market, index) in tree.markets" :key="market.userId" class="ops-card">
            <h2>市场 {{ index + 1 }}</h2>
            <p>
              <el-button link type="primary" @click="openUser(market.userId)">
                {{ market.nickname || market.userId }}（{{ market.userId }}）
              </el-button>
            </p>
            <p class="ops-meta">
              {{ market.memberCount }} 人 · 入座 {{ formatShanghaiTime(market.placedAt) }}
            </p>
            <el-table :data="market.members" empty-text="这个市场里没有会员">
              <el-table-column prop="userId" label="用户 ID" min-width="100" />
              <el-table-column label="昵称" min-width="120">
                <template #default="{ row }: { row: MarketMember }">
                  {{ row.nickname || '—' }}
                </template>
              </el-table-column>
              <el-table-column prop="depth" label="层级" width="70" />
              <el-table-column label="操作" width="70">
                <template #default="{ row }: { row: MarketMember }">
                  <el-button link type="primary" @click="openUser(row.userId)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
          </section>
        </div>
      </template>
    </div>
  </section>
</template>
