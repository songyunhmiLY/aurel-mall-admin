<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import { memberFlagLabel } from '@/api/members'
import { cancelStudio, fetchStudios, type StudioEnrollment, type StudioStatus } from '@/api/studio'
import { formatShanghaiTime } from '@/utils/datetime'
import AppointDialog from './AppointDialog.vue'
import { studioStatusLabel, studioStatusTag } from './labels'

const pageSize = 20
const loading = ref(false)
const loadError = ref('')
const actionError = ref('')
const rows = ref<StudioEnrollment[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({
  status: '' as '' | StudioStatus,
})
const appointOpen = ref(false)
const cancellingUserId = ref<string | null>(null)

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const result = await fetchStudios({
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
    loadError.value = apiErrorMessage(error, '读取工作室失败')
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

async function confirmCancel(row: StudioEnrollment): Promise<void> {
  if (row.status !== 'active' || cancellingUserId.value) return
  const who = row.nickname ? `「${row.nickname}」` : `用户 ${row.userId}`
  try {
    await ElMessageBox.confirm(
      `只取消${who}的工作室身份。不会退款，也不会改动钱包。取消后不再计提补贴，已经入账的保留。`,
      '取消工作室身份',
      {
        confirmButtonText: '取消身份',
        cancelButtonText: '返回',
        type: 'warning',
      },
    )
  } catch {
    return
  }
  cancellingUserId.value = row.userId
  actionError.value = ''
  try {
    await cancelStudio(row.userId)
    ElMessage.success('已取消身份。没有退款，钱包未改动。之后不再计提，已经入账的保留。')
    await load()
  } catch (error) {
    actionError.value = apiErrorMessage(error, '取消失败')
  } finally {
    cancellingUserId.value = null
  }
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header>
      <h1>名单</h1>
    </header>
    <p class="ops-hint">
      查看工作室，或指定一名已经是会员的人。没有人数上限，也不收款，用户也不能自己付款开通。指定不会取消联合创始人身份。取消只改身份：不退款，不动钱包；之后不再计提补贴，已经入账的保留。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
    <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />

    <div class="ops-toolbar">
      <el-select v-model="filters.status" placeholder="全部状态" clearable class="ops-filter">
        <el-option label="在籍" value="active" />
        <el-option label="已取消" value="cancelled" />
      </el-select>
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
      <el-button @click="appointOpen = true">指定</el-button>
    </div>

    <el-table :data="rows" empty-text="没有工作室">
      <el-table-column prop="id" label="记录 ID" min-width="110" />
      <el-table-column prop="userId" label="用户 ID" min-width="110" />
      <el-table-column label="昵称" min-width="120">
        <template #default="{ row }: { row: StudioEnrollment }">
          {{ row.nickname || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="是否会员" width="100">
        <template #default="{ row }: { row: StudioEnrollment }">
          {{ memberFlagLabel(row.member) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }: { row: StudioEnrollment }">
          <el-tag size="small" effect="plain" :type="studioStatusTag(row.status)">
            {{ studioStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="指定时间" min-width="170">
        <template #default="{ row }: { row: StudioEnrollment }">
          {{ formatShanghaiTime(row.enrolledAt) }}
        </template>
      </el-table-column>
      <el-table-column label="取消时间" min-width="170">
        <template #default="{ row }: { row: StudioEnrollment }">
          {{ row.cancelledAt ? formatShanghaiTime(row.cancelledAt) : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }: { row: StudioEnrollment }">
          <el-button
            v-if="row.status === 'active'"
            link
            type="primary"
            :loading="cancellingUserId === row.userId"
            :disabled="cancellingUserId !== null && cancellingUserId !== row.userId"
            @click="confirmCancel(row)"
          >
            取消身份
          </el-button>
          <span v-else>—</span>
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
  </section>
</template>
