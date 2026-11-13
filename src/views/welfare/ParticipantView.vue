<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import { apiErrorMessage } from '@/api/http'
import { decimalFenText } from '@/api/money'
import { fetchWelfareParticipants, type WelfareParticipant } from '@/api/welfare'
import { routeQueryText } from '@/router/query'

const pageSize = 20
const loading = ref(false)
const loadError = ref('')
const participants = ref<WelfareParticipant[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({
  userId: '',
})
const route = useRoute()

onMounted(() => {
  const userId = routeQueryText(route.query.userId)
  if (/^\d+$/.test(userId)) filters.userId = userId
  void load()
})

async function load(): Promise<void> {
  const userId = filters.userId.trim()
  if (userId && !/^\d+$/.test(userId)) {
    loadError.value = '用户 ID 不正确'
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const result = await fetchWelfareParticipants({
      userId: userId || undefined,
      page: page.value,
      pageSize,
    })
    participants.value = result.items
    total.value = result.total
    page.value = result.page
  } catch (error) {
    participants.value = []
    total.value = 0
    loadError.value = apiErrorMessage(error, '读取参与资格失败')
  } finally {
    loading.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function resetFilters(): void {
  filters.userId = ''
  page.value = 1
  void load()
}

function onPage(next: number): void {
  page.value = next
  void load()
}

function money(fen: string): string {
  return decimalFenText(fen)
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header>
      <h1>参与资格</h1>
    </header>
    <p class="ops-hint">
      查看参与资格和本轮已领额度。不填用户 ID
      时列出会员；填写后只查这一人，用户不存在时接口返回「会员不存在」。金额和轮次按接口返回展示：一轮正好领满时，本轮已领额度仍记在这一轮；已领超过已开额度时，当前轮次可以高于已开轮数。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <div class="ops-toolbar">
      <el-input
        v-model="filters.userId"
        placeholder="用户 ID"
        clearable
        class="ops-filter"
        @keyup.enter="search"
      />
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <el-table :data="participants" empty-text="没有参与记录">
      <el-table-column prop="userId" label="用户 ID" min-width="110" />
      <el-table-column label="昵称" min-width="120">
        <template #default="{ row }: { row: WelfareParticipant }">
          {{ row.nickname || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="是否会员" width="100">
        <template #default="{ row }: { row: WelfareParticipant }">
          {{ row.member ? '会员' : '非会员' }}
        </template>
      </el-table-column>
      <el-table-column label="参与资格" width="110">
        <template #default="{ row }: { row: WelfareParticipant }">
          <el-tag size="small" effect="plain" :type="row.eligible ? 'success' : 'info'">
            {{ row.eligible ? '具备' : '不具备' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="今日报名" width="100">
        <template #default="{ row }: { row: WelfareParticipant }">
          {{ row.signedUpToday ? '已报名' : '未报名' }}
        </template>
      </el-table-column>
      <el-table-column label="本轮已领额度" min-width="140">
        <template #default="{ row }: { row: WelfareParticipant }">
          {{ money(row.currentRoundClaimedFen) }}
        </template>
      </el-table-column>
      <el-table-column prop="currentRoundNo" label="当前轮次" width="100" />
      <el-table-column prop="openedRoundCount" label="已开轮数" width="100" />
      <el-table-column label="已开额度" min-width="130">
        <template #default="{ row }: { row: WelfareParticipant }">
          {{ money(row.claimCapFen) }}
        </template>
      </el-table-column>
      <el-table-column label="累计已领" min-width="130">
        <template #default="{ row }: { row: WelfareParticipant }">
          {{ money(row.cumulativeClaimedFen) }}
        </template>
      </el-table-column>
      <el-table-column label="累计实付" min-width="130">
        <template #default="{ row }: { row: WelfareParticipant }">
          {{ money(row.actualPayFen) }}
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > 0"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="page"
      @current-change="onPage"
    />
  </section>
</template>
