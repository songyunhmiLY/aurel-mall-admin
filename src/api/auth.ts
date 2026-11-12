import { ApiError, http } from './http'

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  username: string
}

/**
 * POST /admin/auth/login
 * 基址 VITE_API_BASE_URL 已含 /api/v1，完整路径为 /api/v1/admin/auth/login。
 * 成功时 data 为 { token, username }。密码只交给后端校验。
 */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  const username = payload.username.trim()
  if (!username || !payload.password) {
    throw new ApiError('请输入用户名和密码', 400)
  }

  const { data } = await http.post<unknown>(
    '/admin/auth/login',
    { username, password: payload.password },
    { skipAuth: true },
  )
  return readLoginResult(data, username)
}

function readLoginResult(data: unknown, fallbackUsername: string): LoginResult {
  if (typeof data !== 'object' || data === null) {
    throw new ApiError('登录响应无效，未返回 token', 500)
  }
  const record = data as Record<string, unknown>
  const token = typeof record.token === 'string' ? record.token.trim() : ''
  if (!token) throw new ApiError('登录响应无效，未返回 token', 500)
  const username = typeof record.username === 'string' ? record.username.trim() : ''
  return { token, username: username || fallbackUsername }
}
