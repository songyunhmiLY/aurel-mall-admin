export {}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    section?: string
    requiresAuth?: boolean
  }
}
