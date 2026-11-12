<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { apiErrorMessage } from '@/api/http'
import { fetchMembers, memberFlagLabel, memberStatusLabel, type MemberSummary } from '@/api/members'
import MemberDetailDrawer from './MemberDetailDrawer.vue'

const loading = ref(false)
const loadError = ref('')
const members = ref<MemberSummary[]>([])
const filters = reactive({
  id: '',
  nickname: '',
  phone: '',
})
const detailOpen = ref(false)
const detailId = ref<string | null>(null)

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    members.value = await fetchMembers({
      id: filters.id.trim() || undefined,
      nickname: filters.nickname.trim() || undefined,
      phone: filters.phone.trim() || undefined,
    })
  } catch (error) {
    loadError.value = apiErrorMessage(error, '读取会员失败')
  } finally {
    loading.value = false
  }
}

function resetFilters(): void {
  filters.id = ''
  filters.nickname = ''
  filters.phone = ''
  void load()
}

function openDetail(row: MemberSummary): void {
  detailId.value = row.id
  detailOpen.value = true
}

function statusTag(status: string): 'success' | 'danger' | 'info' {
  if (status === 'active') return 'success'
  if (status === 'disabled') return 'danger'
  return 'info'
}
</script>

<template>
  <section v-loading="loading" class="page">
    <header class="page__header">
      <h1>会员</h1>
    </header>
    <p class="hint">可按用户 ID、昵称或手机号查询。停用后该用户不能登录。</p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />

    <div class="toolbar">
      <el-input
        v-model="filters.id"
        placeholder="用户 ID"
        clearable
        class="filter"
        @keyup.enter="load"
      />
      <el-input
        v-model="filters.nickname"
        placeholder="昵称"
        clearable
        class="filter"
        @keyup.enter="load"
      />
      <el-input
        v-model="filters.phone"
        placeholder="手机号"
        clearable
        class="filter"
        @keyup.enter="load"
      />
      <el-button type="primary" @click="load">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <el-table :data="members" empty-text="没有会员">
      <el-table-column prop="id" label="用户 ID" min-width="100" />
      <el-table-column label="昵称" min-width="140">
        <template #default="{ row }">
          <div class="person">
            <el-image v-if="row.avatarUrl" class="avatar" :src="row.avatarUrl" fit="cover" />
            <span>{{ row.nickname || '—' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="手机号" min-width="130">
        <template #default="{ row }">{{ row.phone || '—' }}</template>
      </el-table-column>
      <el-table-column label="是否会员" width="100">
        <template #default="{ row }">{{ memberFlagLabel(row.member) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" effect="plain" :type="statusTag(row.status)">
            {{ memberStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <MemberDetailDrawer v-model="detailOpen" :member-id="detailId" @changed="load" />
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
  width: 180px;
}

.person {
  display: flex;
  gap: 8px;
  align-items: center;
}

.avatar {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
}
</style>
