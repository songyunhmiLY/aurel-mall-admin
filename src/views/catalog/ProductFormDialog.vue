<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import { apiErrorMessage } from '@/api/http'
import { fenToYuan } from '@/api/money'
import {
  createProduct,
  fetchProduct,
  updateProduct,
  type Product,
  type ProductCategory,
} from '@/api/products'
import {
  buildProductWrite,
  createDraft,
  draftFromProduct,
  statusOptions,
  zoneOptions,
  type ProductDraft,
} from './product-form'

const props = defineProps<{
  modelValue: boolean
  productId: string | null
  startupZoneUnitPriceFen: number | null
  categories: ProductCategory[] | null
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  saved: [warning: string]
}>()

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const actionError = ref('')
const draft = reactive<ProductDraft>(createDraft())

const editing = computed(() => props.productId != null)
const title = computed(() => (editing.value ? '编辑商品' : '新建商品'))
const startupPriceText = computed(() =>
  props.startupZoneUnitPriceFen == null ? '' : `${fenToYuan(props.startupZoneUnitPriceFen)} 元`,
)
const showCategory = computed(() => props.categories != null && draft.zone === 'mall')

watch(
  () => [props.modelValue, props.productId] as const,
  ([open]) => {
    if (open) void load()
  },
)

function close(): void {
  emit('update:modelValue', false)
}

function applyDraft(next: ProductDraft): void {
  draft.zone = next.zone
  draft.name = next.name
  draft.subtitle = next.subtitle
  draft.coverUrl = next.coverUrl
  draft.imageUrlsText = next.imageUrlsText
  draft.status = next.status
  draft.priceYuan = next.priceYuan
  draft.freightYuan = next.freightYuan
  draft.stock = next.stock
  draft.pvYuan = next.pvYuan
  draft.categoryId = next.categoryId
}

async function load(): Promise<void> {
  actionError.value = ''
  loadError.value = ''
  if (!props.productId) {
    applyDraft(createDraft())
    return
  }
  loading.value = true
  try {
    applyDraft(draftFromProduct(await fetchProduct(props.productId)))
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取商品失败')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (saving.value || loading.value) return
  actionError.value = ''
  let body
  try {
    body = buildProductWrite(draft, props.startupZoneUnitPriceFen, props.categories != null)
  } catch (error) {
    actionError.value = apiErrorMessage(error, '请检查表单')
    return
  }

  saving.value = true
  try {
    const saved: Product = props.productId
      ? await updateProduct(props.productId, body)
      : await createProduct(body)
    emit('saved', saved.warning)
    close()
  } catch (error) {
    actionError.value = apiErrorMessage(error, '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="640px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading">
      <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
      <el-form v-else label-position="top" @submit.prevent="save">
        <el-form-item label="专区">
          <el-radio-group v-model="draft.zone">
            <el-radio v-for="item in zoneOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="draft.name" maxlength="128" placeholder="商品名称" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input
            v-model="draft.subtitle"
            type="textarea"
            :rows="2"
            maxlength="255"
            placeholder="可留空"
          />
        </el-form-item>
        <el-form-item label="封面 URL">
          <el-input v-model="draft.coverUrl" placeholder="https:// 可留空" />
        </el-form-item>
        <el-form-item label="图片 URL">
          <el-input
            v-model="draft.imageUrlsText"
            type="textarea"
            :rows="3"
            placeholder="每行一个 http 或 https 链接，可留空"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="draft.status">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="draft.zone === 'startup'" label="价格">
          <el-alert
            v-if="startupPriceText"
            type="info"
            show-icon
            :closable="false"
            :title="`创业专区价格来自系统锁定单价 ${startupPriceText}，保存时提交该金额，不能在此修改。`"
          />
          <el-alert
            v-else
            type="warning"
            show-icon
            :closable="false"
            title="还没有读到创业专区锁定单价，暂时不能保存。"
          />
        </el-form-item>
        <el-form-item v-else label="价格（元）">
          <el-input v-model="draft.priceYuan" placeholder="0.00" />
        </el-form-item>
        <el-form-item v-if="draft.zone === 'mall'" label="PV">
          <el-input v-model="draft.pvYuan" placeholder="0.00" />
          <p class="field-hint">
            1 PV = 1 元，与售价分开填写。若 PV 大于价格，仍可保存，并显示接口返回的提示。
          </p>
        </el-form-item>
        <el-form-item label="运费（元）">
          <el-input v-model="draft.freightYuan" placeholder="0.00" />
        </el-form-item>
        <el-form-item label="库存">
          <el-input-number v-model="draft.stock" :min="0" :step="1" :precision="0" />
        </el-form-item>
        <el-form-item v-if="showCategory" label="分类">
          <el-select v-model="draft.categoryId" clearable placeholder="不选择">
            <el-option
              v-for="item in categories"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-alert
          v-if="actionError"
          type="error"
          :title="actionError"
          show-icon
          :closable="false"
        />
      </el-form>
    </div>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="loading || Boolean(loadError)"
        @click="save"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.field-hint {
  margin-top: 6px;
  color: var(--aurel-muted);
  font-size: 12px;
}
</style>
