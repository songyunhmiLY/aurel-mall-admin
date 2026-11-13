<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import { apiErrorMessage } from '@/api/http'
import { decimalFenText } from '@/api/money'
import { fetchWelfareSignups, type WelfareSignup } from '@/api/welfare'
import { routeQueryText } from '@/router/query'
import { formatShanghaiTime } from '@/utils/datetime'

const pageSize = 20
const loading = ref(false)
const loadError = ref('')
const signups = ref<WelfareSignup[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({
  userId: '',
  bizDate: '',
})
const route = useRoute()

onMounted(() => {
  const userId = routeQueryText(route.query.userId)
  const bizDate = routeQueryText(route.query.bizDate)
  if (/^\d+$/.test(userId)) filters.userId = userId
  if (/^\d{4}-\d{2}-\d{2}$/.test(bizDate)) filters.bizDate = bizDate
  void load()
})

function fieldText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

async function load(): Promise<void> {
  const userId = fieldText(filters.userId)
  const bizDate = fieldText(filters.bizDate)
  if (userId && !/^\d+$/.test(userId)) {
    loadError.value = '用户 ID 不正确'
    return
  }
  if (bizDate && !/^\d{4}-\d{2}-\d{2}$/.test(bizDate)) {
    loadError.value = '日期不正确'
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const result = await fetchWelfareSignups({
      userId: userId || undefined,
      bizDate: bizDate || undefined,
      page: page.value,
      pageSize,
    })
    signups.value = result.items
    total.value = result.total
    page.value = result.page
  } catch (error) {
    signups.value = []
    total.value = 0
    loadError.value = apiErrorMessage(error, '读取报名记录失败')
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
  filters.bizDate = ''
  page.value = 1
  void load()
}

function onPage(next: number): void {
  page.value = next
  void load()
}

function payoutText(row: WelfareSignup): string {
  return decimalFenText(row.payoutFen)
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header>
      <h1>报名记录</h1>
    </header>
    <p class="ops-hint">
      查看福利专场报名。可按用户和业务日筛选。业务日是 Asia/Shanghai
      的自然日。是否已结算和发放金额以接口返回为准，还没发放时金额为空。
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
      <el-date-picker
        v-model="filters.bizDate"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="业务日"
        clearable
        class="ops-filter"
      />
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <el-table :data="signups" empty-text="没有报名记录">
      <el-table-column prop="id" label="报名 ID" min-width="110" />
      <el-table-column prop="userId" label="用户 ID" min-width="110" />
      <el-table-column label="昵称" min-width="120">
        <template #default="{ row }: { row: WelfareSignup }">{{ row.nickname || '—' }}</template>
      </el-table-column>
      <el-table-column label="业务日" width="120">
        <template #default="{ row }: { row: WelfareSignup }">{{ row.bizDate || '—' }}</template>
      </el-table-column>
      <el-table-column label="报名时间" min-width="170">
        <template #default="{ row }: { row: WelfareSignup }">
          {{ formatShanghaiTime(row.signedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="结算" width="100">
        <template #default="{ row }: { row: WelfareSignup }">
          <el-tag size="small" effect="plain" :type="row.settled ? 'success' : 'info'">
            {{ row.settled ? '已结算' : '未结算' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发放金额" min-width="130">
        <template #default="{ row }: { row: WelfareSignup }">{{ payoutText(row) }}</template>
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
