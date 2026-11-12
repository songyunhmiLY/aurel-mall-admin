<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import {
  fetchMember,
  memberFlagLabel,
  memberStatusLabel,
  setMemberEnabled,
  type MemberDetail,
} from '@/api/members'

const props = defineProps<{
  modelValue: boolean
  memberId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  changed: []
}>()

const loading = ref(false)
const acting = ref(false)
const loadError = ref('')
const detail = ref<MemberDetail | null>(null)

watch(
  () => [props.modelValue, props.memberId] as const,
  ([open, id]) => {
    if (open && id) void load(id)
    if (!open) detail.value = null
  },
)

function close(): void {
  emit('update:modelValue', false)
}

async function load(id: string): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    detail.value = await fetchMember(id)
  } catch (error) {
    detail.value = null
    loadError.value = apiErrorMessage(error, '读取会员失败')
  } finally {
    loading.value = false
  }
}

async function toggle(): Promise<void> {
  const current = detail.value
  if (!current || acting.value) return
  const enable = current.status !== 'active'
  const verb = enable ? '启用' : '停用'
  const message = enable ? '确定启用该用户？启用后可以登录。' : '确定停用该用户？停用后不能登录。'
  try {
    await ElMessageBox.confirm(message, verb, {
      confirmButtonText: verb,
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  acting.value = true
  try {
    await setMemberEnabled(current.id, enable)
    ElMessage.success(`已${verb}`)
    emit('changed')
    await load(current.id)
  } catch (error) {
    loadError.value = apiErrorMessage(error, `${verb}失败`)
  } finally {
    acting.value = false
  }
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="会员详情"
    size="420px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading">
      <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
      <template v-else-if="detail">
        <el-image v-if="detail.avatarUrl" class="avatar" :src="detail.avatarUrl" fit="cover" />
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ detail.nickname || '—' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detail.phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="是否会员">{{
            memberFlagLabel(detail.member)
          }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{
            memberStatusLabel(detail.status)
          }}</el-descriptions-item>
        </el-descriptions>

        <h2>实名信息</h2>
        <p class="hint">只查看已提交的姓名、身份证号和手机号，不展示证件照片。</p>
        <el-descriptions v-if="detail.kyc" :column="1" border>
          <el-descriptions-item label="姓名">{{ detail.kyc.name || '—' }}</el-descriptions-item>
          <el-descriptions-item label="身份证号">{{
            detail.kyc.nationalIdNumber || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detail.kyc.mobile || '—' }}</el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="暂无实名信息" :image-size="72" />

        <div class="actions">
          <el-button
            v-if="detail.status === 'active' || detail.status === 'disabled'"
            :type="detail.status === 'active' ? 'danger' : 'primary'"
            :loading="acting"
            @click="toggle"
          >
            {{ detail.status === 'active' ? '停用' : '启用' }}
          </el-button>
          <el-button @click="close">关闭</el-button>
        </div>
      </template>
    </div>
  </el-drawer>
</template>

<style scoped>
.avatar {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  border-radius: 8px;
}

h2 {
  margin: 20px 0 8px;
  font-size: 16px;
  font-weight: 600;
}

.hint {
  margin-bottom: 12px;
  color: var(--aurel-muted);
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}
</style>
