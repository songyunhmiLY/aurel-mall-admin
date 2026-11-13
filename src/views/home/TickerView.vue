<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import { fetchTickers, setTickerStatus, type AdminTicker, type ShelfStatus } from '@/api/home'
import { apiErrorMessage } from '@/api/http'
import { formatShanghaiTime } from '@/utils/datetime'
import { tickerStatusHint } from './content-form'
import StatusDialog from './StatusDialog.vue'
import TickerFormDialog from './TickerFormDialog.vue'
import { shelfStatusChoices, shelfStatusLabel, shelfStatusTag } from './labels'

const pageSize = 20
const loading = ref(false)
const loadError = ref('')
const actionError = ref('')
const rows = ref<AdminTicker[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({
  status: '' as '' | ShelfStatus,
})
const editorOpen = ref(false)
const editingId = ref<string | null>(null)
const statusOpen = ref(false)
const statusSaving = ref(false)
const statusTarget = ref<AdminTicker | null>(null)
const nextStatus = ref<ShelfStatus>('draft')

const statusHint = computed(() =>
  tickerStatusHint(statusTarget.value?.status ?? '', nextStatus.value),
)

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const result = await fetchTickers({
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
    loadError.value = apiErrorMessage(error, '读取滚动字幕失败')
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

function openCreate(): void {
  editingId.value = null
  editorOpen.value = true
}

function openEdit(row: AdminTicker): void {
  editingId.value = row.id
  editorOpen.value = true
}

function openStatus(row: AdminTicker): void {
  statusTarget.value = row
  nextStatus.value = isShelfStatus(row.status) ? row.status : 'draft'
  statusOpen.value = true
}

function onSaved(ticker: AdminTicker, created: boolean): void {
  actionError.value = ''
  if (!created) ElMessage.success('已保存内容，状态未改')
  else if (ticker.status === 'on') ElMessage.success('已新建，并立即展示')
  else ElMessage.success('已新建为草稿')
  if (created) page.value = 1
  void load()
}

async function saveStatus(): Promise<void> {
  const row = statusTarget.value
  if (!row || statusSaving.value || nextStatus.value === row.status) return
  if (!isShelfStatus(nextStatus.value)) return
  statusSaving.value = true
  actionError.value = ''
  try {
    const saved = await setTickerStatus(row.id, nextStatus.value)
    statusOpen.value = false
    ElMessage.success(tickerStatusSaved(saved.status))
    await load()
  } catch (error) {
    actionError.value = apiErrorMessage(error, '修改状态失败')
  } finally {
    statusSaving.value = false
  }
}

function tickerStatusSaved(status: string): string {
  if (status === 'off') return '已下架，记录仍保留'
  if (status === 'on') return '已改为展示中'
  if (status === 'draft') return '已改为草稿'
  return '状态已更新'
}

function isShelfStatus(value: string): value is ShelfStatus {
  return value === 'draft' || value === 'on' || value === 'off'
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header>
      <h1>滚动字幕</h1>
    </header>
    <p class="ops-hint">
      配置小程序首页滚动字幕。列表含草稿和已下架。下架只改状态，不删除。首页按排序从小到大，相同再按编号，只滚动状态为展示中的字幕。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
    <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />

    <div class="ops-toolbar">
      <el-select v-model="filters.status" placeholder="全部状态" clearable class="ops-filter">
        <el-option
          v-for="item in shelfStatusChoices"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
      <el-button class="create" @click="openCreate">新建滚动字幕</el-button>
    </div>

    <el-table :data="rows" empty-text="没有滚动字幕">
      <el-table-column prop="id" label="编号" min-width="110" />
      <el-table-column prop="content" label="字幕" min-width="240" show-overflow-tooltip />
      <el-table-column prop="sortOrder" label="排序" width="90" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }: { row: AdminTicker }">
          <el-tag size="small" effect="plain" :type="shelfStatusTag(row.status)">
            {{ shelfStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" min-width="170">
        <template #default="{ row }: { row: AdminTicker }">
          {{ formatShanghaiTime(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }: { row: AdminTicker }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="openStatus(row)">改状态</el-button>
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

    <TickerFormDialog v-model="editorOpen" :ticker-id="editingId" @saved="onSaved" />
    <StatusDialog
      v-model="statusOpen"
      v-model:selected="nextStatus"
      title="修改滚动字幕状态"
      :current="statusTarget?.status ?? ''"
      :choices="shelfStatusChoices"
      :hint="statusHint"
      :error="statusOpen ? actionError : ''"
      :saving="statusSaving"
      @confirm="saveStatus"
    />
  </section>
</template>

<style scoped>
.create {
  margin-left: auto;
}

@media (max-width: 720px) {
  .create {
    margin-left: 0;
  }
}
</style>
