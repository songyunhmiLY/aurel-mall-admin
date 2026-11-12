import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { readToken } from '@/utils/storage'

type UnauthorizedHandler = () => void

let onUnauthorized: UnauthorizedHandler | null = null

interface ApiEnvelope {
  code: number
  message: string
  data: unknown
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** 登录等匿名请求不要附带本地 token，401 也不要清会话。 */
    skipAuth?: boolean
  }

  export interface AxiosResponse {
    /** 统一包络里的 message。code 为 0 时 data 仍交给调用方，提示语留在这里。 */
    apiMessage?: string
  }
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function resolveBaseURL(): string {
  const raw = import.meta.env?.VITE_API_BASE_URL?.trim() ?? ''
  return raw.replace(/\/+$/, '')
}

const baseURL = resolveBaseURL()

if (!baseURL && import.meta.env?.DEV) {
  console.warn('[aurel-admin] 未配置 VITE_API_BASE_URL。请复制 .env.example 为 .env.local')
}

export const http = axios.create({
  baseURL,
  timeout: 15_000,
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.skipAuth) return config
  const token = readToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const body = response.data
    if (!isEnvelope(body)) return response
    if (body.code !== 0) {
      if (body.code === 401 && !response.config.skipAuth) onUnauthorized?.()
      return Promise.reject(new ApiError(body.message || '请求失败', body.code))
    }
    response.apiMessage = body.message
    response.data = body.data
    return response
  },
  (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.skipAuth) onUnauthorized?.()
    return Promise.reject(toApiError(error))
  },
)

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message.trim()) return error.message
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

function isEnvelope(value: unknown): value is ApiEnvelope {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.code === 'number' && typeof record.message === 'string' && 'data' in record
}

function toApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0
  const message = messageFromBody(error.response?.data) || fallbackMessage(error, status)
  return new ApiError(message, status)
}

function messageFromBody(body: unknown): string {
  if (typeof body === 'string') return body.trim()
  if (!isEnvelope(body) && (typeof body !== 'object' || body === null)) return ''
  const record = body as Record<string, unknown>
  const message = record.message
  if (Array.isArray(message)) {
    return message
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean)
      .join('；')
  }
  if (typeof message === 'string') return message.trim()
  return ''
}

function fallbackMessage(error: AxiosError, status: number): string {
  if (error.code === 'ECONNABORTED') return '请求超时，请稍后重试'
  if (!error.response) return '无法连接服务器，请稍后重试'
  if (status === 401) {
    return error.config?.skipAuth ? '用户名或密码错误' : '登录已失效，请重新登录'
  }
  return '请求失败'
}
