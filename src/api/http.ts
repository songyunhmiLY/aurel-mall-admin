import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { readToken } from '@/utils/storage'

type UnauthorizedHandler = () => void

let onUnauthorized: UnauthorizedHandler | null = null

function resolveBaseURL(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
  return raw.replace(/\/+$/, '')
}

const baseURL = resolveBaseURL()

if (!baseURL && import.meta.env.DEV) {
  console.warn('[aurel-admin] 未配置 VITE_API_BASE_URL。请复制 .env.example 为 .env.local')
}

export const http = axios.create({
  baseURL,
  timeout: 15_000,
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler
}
