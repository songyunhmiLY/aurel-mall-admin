<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type FormInstance, type FormRules } from 'element-plus'

import { apiErrorMessage } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { paths } from '@/router/paths'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const formError = ref('')
const form = reactive({
  username: '',
  password: '',
})

const rules: FormRules<typeof form> = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

function safeRedirect(value: unknown): string {
  if (typeof value !== 'string') return paths.dashboard
  if (!value.startsWith('/') || value.startsWith('//')) return paths.dashboard
  return value
}

async function submit(): Promise<void> {
  const current = formRef.value
  if (!current || loading.value) return
  formError.value = ''
  loading.value = true

  const valid = await current
    .validate()
    .then(() => true)
    .catch(() => false)
  if (!valid) {
    loading.value = false
    return
  }

  try {
    await auth.signIn({
      username: form.username,
      password: form.password,
    })
    await router.replace(safeRedirect(route.query.redirect))
  } catch (error) {
    formError.value = apiErrorMessage(error, '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <section class="login__brand">
      <p class="login__mark">AUREL</p>
      <h1>奥瑞尔经销商城</h1>
      <p>管理后台</p>
    </section>
    <section class="login__panel">
      <div class="card">
        <h2>登录</h2>
        <p class="card__hint">请使用管理员账号登录。用户名和密码由服务器校验。</p>
        <el-alert
          v-if="formError"
          class="form-error"
          type="error"
          :title="formError"
          show-icon
          :closable="false"
        />
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          @submit.prevent="submit"
        >
          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="form.username"
              autocomplete="username"
              placeholder="请输入用户名"
              @keyup.enter="submit"
            />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              autocomplete="current-password"
              placeholder="请输入密码"
              @keyup.enter="submit"
            />
          </el-form-item>
          <el-button class="submit" type="primary" native-type="submit" :loading="loading">
            登录
          </el-button>
        </el-form>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  grid-template-columns: minmax(280px, 1.1fr) minmax(320px, 0.9fr);
  min-height: 100%;
  background: var(--aurel-paper);
}

.login__brand {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 48px;
  color: #f4f7fb;
  background: linear-gradient(160deg, rgb(15 110 98 / 55%), transparent 42%), var(--aurel-sidebar);
}

.login__mark {
  color: #9fd4cb;
  letter-spacing: 0.18em;
  font-size: 13px;
}

.login__brand h1 {
  font-size: 40px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.card {
  box-sizing: border-box;
  width: min(100%, 380px);
  padding: 28px;
  background: var(--aurel-surface);
  border: 1px solid var(--aurel-line);
  border-radius: 16px;
}

.card h2 {
  font-size: 22px;
}

.card__hint {
  margin: 8px 0 20px;
  color: var(--aurel-muted);
}

.form-error {
  margin-bottom: 16px;
}

.login__panel {
  display: grid;
  place-items: center;
  padding: 32px 20px;
}

.submit {
  width: 100%;
  margin-top: 8px;
}

@media (max-width: 800px) {
  .login {
    grid-template-columns: 1fr;
  }

  .login__brand {
    justify-content: flex-start;
    min-height: 180px;
    padding: 28px 20px;
  }

  .login__brand h1 {
    font-size: 28px;
  }
}
</style>
