# 奥瑞尔经销商城 · 管理后台

经销商城管理端前端（`aurel-mall-admin`）。当前是第一步：项目壳。包含登录、侧栏布局、路由、请求层，以及各业务模块的占位页。商品、订单、会员、内容、财务的具体功能还没做。

## 相关仓库

- `aurel-mall-api`：后端 API。接口和数据库跑在远程 Linux 主机上，用 Docker 启动。
- `aurel-mall-uniapp`：经销商端（uni-app）。
- `aurel-mall-admin`（本仓库）：管理后台，只跑在浏览器里。

## 环境

需要 **Node.js 22 LTS**。版本写在根目录 `.nvmrc` 里。

用 nvm：

```bash
nvm install
nvm use
```

用 fnm：

```bash
fnm install
fnm use
```

两条命令都会读取 `.nvmrc`。Node 自带 npm，本仓库用 npm，并提交 `package-lock.json`。

## 安装与启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

浏览器打开 <http://localhost:5173>。开发服务器固定使用 5173 端口。

登录页填任意非空用户名和密码即可进入。这是本地桩：只在浏览器里存一个占位 token，方便看布局，不会请求后端。退出在右上角。

## 对接远程 API

接口基址是环境变量 `VITE_API_BASE_URL`。Vite 只会把 `VITE_` 开头的变量交给前端。`.env.local` 不会进 Git。

`.env.example` 里的默认值只是占位：

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

日常开发不要在 Windows 本机起 API 或数据库。`aurel-mall-api` 和数据库在远程 Linux 主机的 Docker 里。本地只跑这个管理端，把 `.env.local` 指到那台主机，例如：

```bash
VITE_API_BASE_URL=http://<远程主机>:3000/api/v1
```

改完要重新执行 `npm run dev`。末尾不要加斜杠，请求层会再去掉多余的斜杠。

`src/api/http.ts` 用这个基址创建 Axios 实例。已登录时会带 `Authorization: Bearer <token>`；收到 `401` 会清掉本地会话并回到登录页。业务请求按模块放在 `src/api/`，不要写在页面里。

浏览器在 `http://localhost:5173` 直接请求远程地址，所以远程 API 需要允许这个来源跨域。登录桩目前还不调用 `/auth/login`。后端契约对齐后，只改 `src/api/auth.ts`，登录页不用动。

`src/api/health.ts` 是存活探针的占位客户端，页面上没有对应入口。

## 脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器，端口 5173 |
| `npm run build` | 类型检查并构建 |
| `npm run type-check` | 只做类型检查 |
| `npm run lint` | Oxlint 与 ESLint |
| `npm run format` | Prettier 格式化 `src/` |
| `npm run preview` | 预览构建结果 |

## 目录

```text
src/
  main.ts                 应用入口：Pinia、Router、Element Plus
  App.vue                 根组件，只放路由出口
  styles/                 全局变量与基础样式
  router/                 路径、菜单、路由表、登录守卫
  stores/                 auth 会话；permission 薄钩子
  api/                    Axios 实例，按模块拆请求
  layouts/                登录后的侧栏 + 顶栏
  views/                  按业务模块分目录
    login/                登录
    dashboard/            首页
    catalog/              商品（占位）
    order/                订单（占位）
    member/               会员（占位）
    cms/                  内容：轮播、资讯、字幕（占位）
    finance/              财务（占位）
  components/             跨页面的小组件
  utils/                  很小的通用函数，目前只有会话读写
```

约定：

- 按功能模块放代码，一个文件只做一件事。页面变大时拆组件，不要堆成一个大单文件。
- 接口调用放在 `src/api/`，按模块分文件。
- 不建大而全的 `utils.ts`。
- 不留注释掉的废代码。

侧栏目前有：首页、商品、订单、会员、内容（轮播 / 资讯 / 字幕）、财务。占位页会写明「待实现」。

## 权限

管理端的菜单划分和权限模型还没定。`src/stores/permission.ts` 只提供 `canAccess`：登录后先放行全部占位菜单。以后在这个 store 里收口，不要在每个页面里各写一套判断。
