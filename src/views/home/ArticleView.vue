<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import {
  fetchArticles,
  setArticleStatus,
  type AdminArticle,
  type ArticleKind,
  type ArticleStatus,
} from '@/api/home'
import { apiErrorMessage } from '@/api/http'
import { formatShanghaiTime } from '@/utils/datetime'
import ArticleFormDialog from './ArticleFormDialog.vue'
import { articleStatusHint } from './content-form'
import StatusDialog from './StatusDialog.vue'
import {
  articleKindChoices,
  articleKindLabel,
  articleStatusChoices,
  articleStatusLabel,
  articleStatusTag,
} from './labels'

const pageSize = 20
const loading = ref(false)
const loadError = ref('')
const actionError = ref('')
const rows = ref<AdminArticle[]>([])
const total = ref(0)
const page = ref(1)
const filters = reactive({
  kind: '' as '' | ArticleKind,
  status: '' as '' | ArticleStatus,
})
const editorOpen = ref(false)
const editingId = ref<string | null>(null)
const statusOpen = ref(false)
const statusSaving = ref(false)
const statusTarget = ref<AdminArticle | null>(null)
const nextStatus = ref<ArticleStatus>('draft')

const statusHint = computed(() =>
  articleStatusHint(
    statusTarget.value?.status ?? '',
    nextStatus.value,
    statusTarget.value?.publishedAt ?? null,
  ),
)

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const result = await fetchArticles({
      kind: filters.kind || undefined,
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
    loadError.value = apiErrorMessage(error, '读取资讯失败')
  } finally {
    loading.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function resetFilters(): void {
  filters.kind = ''
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

function openEdit(row: AdminArticle): void {
  editingId.value = row.id
  editorOpen.value = true
}

function openStatus(row: AdminArticle): void {
  statusTarget.value = row
  nextStatus.value = isArticleStatus(row.status) ? row.status : 'draft'
  statusOpen.value = true
}

function onSaved(article: AdminArticle, created: boolean): void {
  actionError.value = ''
  if (!created) ElMessage.success('已保存内容。状态和发布时间都未改')
  else if (article.status === 'published') ElMessage.success('已新建并发布')
  else ElMessage.success('已新建为草稿')
  if (created) page.value = 1
  void load()
}

async function saveStatus(): Promise<void> {
  const row = statusTarget.value
  if (!row || statusSaving.value || nextStatus.value === row.status) return
  if (!isArticleStatus(nextStatus.value)) return
  const previousPublishedAt = row.publishedAt
  statusSaving.value = true
  actionError.value = ''
  try {
    const saved = await setArticleStatus(row.id, nextStatus.value)
    statusOpen.value = false
    ElMessage.success(articleStatusSaved(saved, previousPublishedAt))
    await load()
  } catch (error) {
    actionError.value = apiErrorMessage(error, '修改状态失败')
  } finally {
    statusSaving.value = false
  }
}

function articleStatusSaved(saved: AdminArticle, previousPublishedAt: string | null): string {
  if (saved.status === 'published' && previousPublishedAt) {
    return '已再次发布，发布时间已改为当前业务时间'
  }
  if (saved.status === 'published') return '已发布，并写入发布时间'
  if (saved.status === 'off') return '已下架，记录仍保留'
  if (saved.status === 'draft') return '已改为草稿'
  return '状态已更新'
}

function isArticleStatus(value: string): value is ArticleStatus {
  return value === 'draft' || value === 'published' || value === 'off'
}

function publishedText(row: AdminArticle): string {
  if (row.publishedAt) return formatShanghaiTime(row.publishedAt)
  if (row.status === 'published') return '缺少发布时间，首页不会列出'
  return '尚未发布'
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header>
      <h1>资讯和知识</h1>
    </header>
    <p class="ops-hint">
      维护首页资讯和知识里的文章、新闻和通知。列表含草稿和已下架。下架改为已下架，离开已发布，记录保留。修改内容不会改状态，也不会改发布时间。首次发布写入发布时间；从草稿或已下架再次发布时，发布时间改成当时的业务时间。首页只展示已发布、并且有发布时间的内容。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
    <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />

    <div class="ops-toolbar">
      <el-select v-model="filters.kind" placeholder="全部类型" clearable class="ops-filter">
        <el-option
          v-for="item in articleKindChoices"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-select v-model="filters.status" placeholder="全部状态" clearable class="ops-filter">
        <el-option
          v-for="item in articleStatusChoices"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-button type="primary" @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
      <el-button class="create" @click="openCreate">新建</el-button>
    </div>

    <el-table :data="rows" empty-text="没有资讯和知识">
      <el-table-column prop="id" label="编号" min-width="110" />
      <el-table-column label="类型" width="90">
        <template #default="{ row }: { row: AdminArticle }">
          {{ articleKindLabel(row.kind) }}
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
      <el-table-column prop="summary" label="摘要" min-width="200" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }: { row: AdminArticle }">
          <el-tag size="small" effect="plain" :type="articleStatusTag(row.status)">
            {{ articleStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发布时间" min-width="210">
        <template #default="{ row }: { row: AdminArticle }">
          {{ publishedText(row) }}
        </template>
      </el-table-column>
      <el-table-column label="更新时间" min-width="170">
        <template #default="{ row }: { row: AdminArticle }">
          {{ formatShanghaiTime(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }: { row: AdminArticle }">
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

    <ArticleFormDialog v-model="editorOpen" :article-id="editingId" @saved="onSaved" />
    <StatusDialog
      v-model="statusOpen"
      v-model:selected="nextStatus"
      title="修改资讯状态"
      :current="statusTarget?.status ?? ''"
      :choices="articleStatusChoices"
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
