export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  username: string
}

export class AuthRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthRequestError'
  }
}

/**
 * 登录契约尚未与 aurel-mall-api 对齐。
 * 当前签发本地占位 token，便于在没有后端时查看布局。
 * 对接时改为：http.post<LoginResult>('/auth/login', { username, password })，
 * 基址来自 VITE_API_BASE_URL（已含 /api/v1）。
 */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  const username = payload.username.trim()
  if (!username || !payload.password) {
    throw new AuthRequestError('请输入用户名和密码')
  }

  return {
    token: `stub.${crypto.randomUUID()}`,
    username,
  }
}
