const TOKEN_KEY = 'aurel-admin-token'
const USERNAME_KEY = 'aurel-admin-username'

export function readToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
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
