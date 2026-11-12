import { http } from './http'

export interface HealthStatus {
  status: string
}

/** 存活探针占位。路径以后端契约为准，界面不调用。 */
export function fetchHealth() {
  return http.get<HealthStatus>('/health')
}
