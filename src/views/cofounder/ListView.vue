<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { apiErrorMessage } from '@/api/http'
import { fetchCofounders, type CofounderEnrollment, type CofounderStatus } from '@/api/cofounder'
import { memberFlagLabel } from '@/api/members'
import { formatShanghaiTime } from '@/utils/datetime'
import AppointDialog from './AppointDialog.vue'
import CancellationDrawer from './CancellationDrawer.vue'
import { cofounderSourceLabel, cofounderStatusLabel, cofounderStatusTag } from './labels'

const pageSize = 20
const loading = ref(false)
const loadError = ref('')
const rows = ref<CofounderEnrollment[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({
  status: '' as '' | CofounderStatus,
})
const appointOpen = ref(false)
const reviewOpen = ref(false)
const reviewUserId = ref<string | null>(null)

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const result = await fetchCofounders({
      status: filters.status || undefined,
      page: page.value,
      pageSize,
    })
    rows.value = result.items
    total.value = result.total
    page.value = result.page
  } catch (error) {
    rows.value = []
    total.value = 0
    loadError.value = apiErrorMessage(error, '读取联合创始人失败')
  } finally {
    loading.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function resetFilters(): void {
  filters.status = ''
  page.value = 1
  void load()
}

function onPage(next: number): void {
  page.value = next
  void load()
}

function openReview(row: CofounderEnrollment): void {
  reviewUserId.value = row.userId
  reviewOpen.value = true
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header>
      <h1>在籍名单</h1>
    </header>
    <p class="ops-hint">
      查看联合创始人，或指定一名会员。指定不收款，名额已满也可以指定。取消前先打开审核明细。取消只改身份，不退款，也不改动钱包。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <div class="ops-toolbar">
      <el-select v-model="filters.status" placeholder="全部状态" clearable class="ops-filter">
        <el-option label="在籍" value="active" />
        <el-option label="已取消" value="cancelled" />
      </el-select>
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
      <el-button @click="appointOpen = true">指定</el-button>
    </div>

    <el-table :data="rows" empty-text="没有联合创始人">
      <el-table-column prop="id" label="记录 ID" min-width="110" />
      <el-table-column prop="userId" label="用户 ID" min-width="110" />
      <el-table-column label="昵称" min-width="120">
        <template #default="{ row }: { row: CofounderEnrollment }">
          {{ row.nickname || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="是否会员" width="100">
        <template #default="{ row }: { row: CofounderEnrollment }">
          {{ memberFlagLabel(row.member) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }: { row: CofounderEnrollment }">
          <el-tag size="small" effect="plain" :type="cofounderStatusTag(row.status)">
            {{ cofounderStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="来源" width="120">
        <template #default="{ row }: { row: CofounderEnrollment }">
          {{ cofounderSourceLabel(row.source) }}
        </template>
      </el-table-column>
      <el-table-column label="入籍时间" min-width="170">
        <template #default="{ row }: { row: CofounderEnrollment }">
          {{ formatShanghaiTime(row.enrolledAt) }}
        </template>
      </el-table-column>
      <el-table-column label="取消时间" min-width="170">
        <template #default="{ row }: { row: CofounderEnrollment }">
          {{ row.cancelledAt ? formatShanghaiTime(row.cancelledAt) : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }: { row: CofounderEnrollment }">
          <el-button link type="primary" @click="openReview(row)">
            {{ row.status === 'active' ? '取消审核' : '查看明细' }}
          </el-button>
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

    <AppointDialog v-model="appointOpen" @appointed="search" />
    <CancellationDrawer v-model="reviewOpen" :user-id="reviewUserId" @changed="load" />
  </section>
</template>
