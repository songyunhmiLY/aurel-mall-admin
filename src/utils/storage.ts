const TOKEN_KEY = 'aurel-admin-token'
const USERNAME_KEY = 'aurel-admin-username'

export function readToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

/** 丢掉旧的本地桩 token（`stub.` 前缀），避免未经过接口校验就进入后台。 */
export function readSession(): { token: string; username: string } {
  const token = readToken().trim()
  if (!token || token.startsWith('stub.')) {
    clearSession()
    return { token: '', username: '' }
  }
  return { token, username: readUsername() }
}

export function readUsername(): string {
  return localStorage.getItem(USERNAME_KEY) ?? ''
}

export function writeSession(token: string, username: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USERNAME_KEY, username)
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
}
