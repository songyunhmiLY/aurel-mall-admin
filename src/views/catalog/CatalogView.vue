<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import { fenToYuan } from '@/api/money'
import {
  fetchMallCategories,
  fetchProducts,
  setProductShelf,
  type MallCategory,
  type Product,
} from '@/api/products'
import CategoryDialog from './CategoryDialog.vue'
import ProductFormDialog from './ProductFormDialog.vue'
import StockDialog from './StockDialog.vue'
import { statusLabel, statusTagType, zoneLabel } from './product-form'

const pageSize = 20
const loading = ref(false)
const loadError = ref('')
const notice = ref('')
const products = ref<Product[]>([])
const total = ref(0)
const page = ref(1)
const categories = ref<MallCategory[]>([])
const zone = ref('')
const status = ref('')

const editorOpen = ref(false)
const editingId = ref<string | null>(null)
const stockOpen = ref(false)
const stockTarget = ref<Product | null>(null)
const categoryOpen = ref(false)

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const [list, categoryList] = await Promise.all([
      fetchProducts({
        zone: zone.value || undefined,
        status: status.value || undefined,
        page: page.value,
        pageSize,
      }),
      fetchMallCategories(),
    ])
    products.value = list.items
    total.value = list.total
    page.value = list.page
    categories.value = categoryList
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取商品失败')
  } finally {
    loading.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function resetFilters(): void {
  zone.value = ''
  status.value = ''
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

function openEdit(row: Product): void {
  editingId.value = row.id
  editorOpen.value = true
}

function openStock(row: Product): void {
  stockTarget.value = row
  stockOpen.value = true
}

function onSaved(warnings: string[]): void {
  notice.value = warnings.join('；')
  if (warnings.length > 0) ElMessage.warning('已保存，请查看接口提示')
  else ElMessage.success('已保存')
  void load()
}

function onStockSaved(): void {
  ElMessage.success('库存已更新')
  void load()
}

async function onCategoryCreated(): Promise<void> {
  try {
    categories.value = await fetchMallCategories()
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取分类失败')
  }
}

async function toggleShelf(row: Product): Promise<void> {
  const next = row.status === 'on' ? 'off' : 'on'
  const verb = next === 'on' ? '上架' : '下架'
  try {
    await ElMessageBox.confirm(`确定${verb}「${row.name}」？`, verb, {
      confirmButtonText: verb,
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await setProductShelf(row.id, next)
    ElMessage.success(`已${verb}`)
    await load()
  } catch (error) {
    loadError.value = apiErrorMessage(error, `${verb}失败`)
  }
}

function priceText(row: Product): string {
  return `${fenToYuan(row.priceFen)} 元`
}

function costText(row: Product): string {
  if (row.costFen == null) return '未录入'
  return `${fenToYuan(row.costFen)} 元`
}

function pvText(row: Product): string {
  if (row.zone !== 'mall' || row.pvFen == null) return '—'
  return fenToYuan(row.pvFen)
}
</script>

<template>
  <section v-loading="loading" class="page">
    <header class="page__header">
      <h1>商品</h1>
    </header>
    <p class="hint">
      每个商品只有一个规格。创业专区售价由系统锁定，不能在这里填写。会员商城的 PV 按分保存，1 PV = 1
      元，与售价分开。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
    <el-alert v-if="notice" type="warning" :title="notice" show-icon @close="notice = ''" />

    <div class="toolbar">
      <el-select v-model="zone" placeholder="全部专区" clearable class="filter">
        <el-option label="创业专区" value="startup" />
        <el-option label="会员商城" value="mall" />
      </el-select>
      <el-select v-model="status" placeholder="全部状态" clearable class="filter">
        <el-option label="草稿" value="draft" />
        <el-option label="上架" value="on" />
        <el-option label="下架" value="off" />
      </el-select>
      <el-button @click="search">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
      <el-button @click="categoryOpen = true">分类</el-button>
      <el-button type="primary" class="create" @click="openCreate">新建商品</el-button>
    </div>

    <el-table :data="products" empty-text="没有商品">
      <el-table-column label="商品" min-width="220">
        <template #default="{ row }">
          <div class="product">
            <el-image v-if="row.coverUrl" class="cover" :src="row.coverUrl" fit="cover" />
            <div>
              <div class="product__name">{{ row.name }}</div>
              <div v-if="row.subtitle" class="product__sub">{{ row.subtitle }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="专区" width="110">
        <template #default="{ row }">{{ zoneLabel(row.zone) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" effect="plain" :type="statusTagType(row.status)">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="价格" width="120">
        <template #default="{ row }">{{ priceText(row) }}</template>
      </el-table-column>
      <el-table-column label="PV" width="90">
        <template #default="{ row }">{{ pvText(row) }}</template>
      </el-table-column>
      <el-table-column label="成本" width="110">
        <template #default="{ row }">{{ costText(row) }}</template>
      </el-table-column>
      <el-table-column label="库存" width="80">
        <template #default="{ row }">{{ row.stockQuantity }}</template>
      </el-table-column>
      <el-table-column label="分类" min-width="120">
        <template #default="{ row }">{{ row.categoryName || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="toggleShelf(row)">
            {{ row.status === 'on' ? '下架' : '上架' }}
          </el-button>
          <el-button link type="primary" @click="openStock(row)">库存</el-button>
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

    <ProductFormDialog
      v-model="editorOpen"
      :product-id="editingId"
      :categories="categories"
      @saved="onSaved"
    />
    <StockDialog v-model="stockOpen" :product="stockTarget" @saved="onStockSaved" />
    <CategoryDialog v-model="categoryOpen" :categories="categories" @created="onCategoryCreated" />
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 360px;
  padding: 20px 24px;
  background: var(--aurel-surface);
  border: 1px solid var(--aurel-line);
  border-radius: 12px;
}

.page__header h1 {
  font-size: 20px;
  font-weight: 600;
}

.hint {
  color: var(--aurel-muted);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.filter {
  width: 140px;
}

.create {
  margin-left: auto;
}

.product {
  display: flex;
  gap: 10px;
  align-items: center;
}

.cover {
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  border-radius: 6px;
}

.product__name {
  font-weight: 600;
}

.product__sub {
  color: var(--aurel-muted);
  font-size: 12px;
}

@media (max-width: 720px) {
  .create {
    margin-left: 0;
  }
}
</style>
