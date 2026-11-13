<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import { memberFlagLabel } from '@/api/members'
import { cancelOpsTeam, fetchOpsTeam, type OpsTeamEnrollment } from '@/api/ops-team'
import { formatShanghaiTime } from '@/utils/datetime'
import AppointDialog from './AppointDialog.vue'
import { opsTeamPerson, opsTeamStatusLabel, opsTeamStatusTag } from './labels'

const loading = ref(false)
const loaded = ref(false)
const loadError = ref('')
const actionError = ref('')
const holder = ref<OpsTeamEnrollment | null>(null)
const appointOpen = ref(false)
const cancelling = ref(false)

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    holder.value = await fetchOpsTeam()
    loaded.value = true
  } catch (error) {
    holder.value = null
    loaded.value = false
    loadError.value = apiErrorMessage(error, '读取运营团队失败')
  } finally {
    loading.value = false
  }
}

async function confirmCancel(): Promise<void> {
  const current = holder.value
  if (!current || cancelling.value) return
  try {
    await ElMessageBox.confirm(
      `取消${opsTeamPerson(current)}的运营团队身份。取消后没有人持有，之后的订单不发给任何人。不会退款，也不会改动钱包。已经入账的保留。不会取消联合创始人或工作室身份。`,
      '取消运营团队身份',
      {
        confirmButtonText: '取消身份',
        cancelButtonText: '返回',
        type: 'warning',
      },
    )
  } catch {
    return
  }
  cancelling.value = true
  actionError.value = ''
  try {
    await cancelOpsTeam()
    ElMessage.success(
      '已取消身份。没有退款，钱包未改动。之后的订单不再发给任何人，已经入账的保留。',
    )
    await load()
  } catch (error) {
    actionError.value = apiErrorMessage(error, '取消失败')
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <section v-loading="loading" class="ops-page">
    <header>
      <h1>运营团队</h1>
    </header>
    <p class="ops-hint">
      也称运营负责人。全网同时只有一名会员持有这个身份。可以指定一名已经是会员的人；已经有人时，再指定就是改派。没有人在籍时，之后的订单不发给任何人。指定和取消都不改联合创始人或工作室身份，也不收款，用户也不能自己付款开通。
    </p>
    <el-alert v-if="loadError" type="error" :title="loadError" show-icon :closable="false" />
    <el-alert v-if="actionError" type="error" :title="actionError" show-icon :closable="false" />

    <article v-if="loaded && holder" class="ops-card">
      <h2>当前持有人</h2>
      <p class="ops-hint">
        全网同时只有这一名。改派或取消后，上一任立刻停止，已经入账的留在原账户。
      </p>
      <dl class="holder-fields">
        <div>
          <dt>记录 ID</dt>
          <dd>{{ holder.id }}</dd>
        </div>
        <div>
          <dt>用户 ID</dt>
          <dd>{{ holder.userId }}</dd>
        </div>
        <div>
          <dt>昵称</dt>
          <dd>{{ holder.nickname || '—' }}</dd>
        </div>
        <div>
          <dt>是否会员</dt>
          <dd>{{ memberFlagLabel(holder.member) }}</dd>
        </div>
        <div>
          <dt>状态</dt>
          <dd>
            <el-tag size="small" effect="plain" :type="opsTeamStatusTag(holder.status)">
              {{ opsTeamStatusLabel(holder.status) }}
            </el-tag>
          </dd>
        </div>
        <div>
          <dt>指定时间</dt>
          <dd>{{ formatShanghaiTime(holder.enrolledAt) }}</dd>
        </div>
        <div>
          <dt>取消时间</dt>
          <dd>{{ holder.cancelledAt ? formatShanghaiTime(holder.cancelledAt) : '—' }}</dd>
        </div>
      </dl>
      <div class="ops-toolbar">
        <el-button type="primary" :disabled="cancelling" @click="appointOpen = true"
          >改派</el-button
        >
        <el-button :loading="cancelling" @click="confirmCancel">取消身份</el-button>
      </div>
    </article>

    <article v-else-if="loaded" class="ops-card">
      <h2>当前没有持有人</h2>
      <p class="ops-hint">没有人被标记为运营团队。之后支付成功的订单不发给任何人，也不进入池子。</p>
      <div class="ops-toolbar">
        <el-button type="primary" @click="appointOpen = true">指定</el-button>
      </div>
    </article>

    <article class="ops-card">
      <h2>分红比例</h2>
      <p>官方示例：创业专区 5%（500 基点），会员商城 7%（700 基点）。</p>
      <p class="ops-hint">
        这两项在进程启动时锁定。本页只作说明，不能修改，也不会提交，并且不读取当前进程里的实际比例。
      </p>
    </article>

    <AppointDialog v-model="appointOpen" :holder="holder" @appointed="load" />
  </section>
</template>

<style scoped>
.holder-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px 16px;
  margin: 0;
}

.holder-fields div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.holder-fields dt {
  color: var(--aurel-muted);
  font-size: 13px;
}

.holder-fields dd {
  margin: 0;
}
</style>
