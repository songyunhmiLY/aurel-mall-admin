/**
 * 仿真台的唯一开关。
 * 只在非正式环境（dev / staging）构建时设置 VITE_SIMULATION_ENABLED=true；
 * 正式构建不要设置，路由与菜单都不会出现，直链访问落到「页面不存在」。
 * 后端另有 SIMULATION_ENABLED 双保险，生产环境即便误设也会拒绝启动。
 */
export const simulationEnabled = import.meta.env.VITE_SIMULATION_ENABLED === 'true'
