# 奥瑞尔经销商城 · 管理后台

经销商城管理端前端（`aurel-mall-admin`）。包含登录、侧栏布局、路由、请求层、微信支付配置，以及各业务模块的占位页。商品、订单、会员、内容、财务的具体功能还没做。

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

登录页把用户名和密码交给后端校验。成功后把接口返回的 token 存在浏览器本地，之后的请求带 `Authorization: Bearer <token>`。密码错误时，页面展示接口返回的原因。退出在右上角。浏览器不再用本地桩或环境变量里的密码哈希放行。

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

`src/api/http.ts` 用这个基址创建 Axios 实例。成功响应若是 `{ code, message, data }`，且 `code` 为 `0`，请求层只把 `data` 交给调用方。`code` 不是 `0` 时按失败处理，并展示 `message`。已登录时会带 `Authorization: Bearer <token>`；业务请求收到 `401` 会清掉本地会话并回到登录页。登录请求本身不带旧 token，失败也不会把这次错误当成会话过期。业务请求按模块放在 `src/api/`，不要写在页面里。

浏览器在 `http://localhost:5173` 直接请求远程地址，所以远程 API 需要允许这个来源跨域。

`src/api/health.ts` 是存活探针的占位客户端，页面上没有对应入口。

## 部署基路径

Vite `base` 默认是 `/`。预览如果挂在 `/admin/` 下，任选一种，不要改路由代码：

```bash
VITE_BASE=/admin/ npm run build
npm run build -- --base=/admin/
```

命令行 `--base` 优先于 `VITE_BASE`。开发服务器同样认 `VITE_BASE`。路由使用 `import.meta.env.BASE_URL`。

## 已对接的接口

`aurel-mall-api` 的 main 目前还没有这两条业务路由（管理端守卫仍是占位）。客户端按下面的契约调用，响应包一层 `{ "code": 0, "message": "ok", "data": ... }`，失败时 HTTP 状态与 `code` 相同，`message` 为原因。

登录：

```http
POST /api/v1/admin/auth/login
Content-Type: application/json

{ "username": "admin", "password": "<密码>" }
```

成功时 `data` 为 `{ "token": "<会话>", "username": "admin" }`。`token` 必填。之后请求头为 `Authorization: Bearer <token>`。失败时展示 `message`，例如「用户名或密码错误」。只有一种管理员角色，客户端不读取权限列表。

微信支付配置：

```http
GET /api/v1/admin/settings/wechat-pay
PUT /api/v1/admin/settings/wechat-pay
Authorization: Bearer <token>
```

`data` 字段：

| 字段             | 含义                                                         |
| ---------------- | ------------------------------------------------------------ |
| `mchId`          | 商户号。未配置时为空字符串                                   |
| `apiCertificate` | API 证书 PEM。未配置时为空；已配置时返回掩码，掩码里要有 `*` |
| `apiV3Key`       | APIv3 密钥。未配置时为空；已配置时同样返回带 `*` 的掩码      |
| `configured`     | 可选。缺省时，仅当三项都非空才视为已配置                     |

`GET` 的 `data` 为 `null` 时，页面按未配置展示。`PUT` 的 JSON 始终带 `mchId`（空字符串表示清空）。证书和密钥留空则不传这两个字段，表示不修改服务器上的原文。页面若看到掩码，只展示掩码，不会把它当作新密钥提交。接口若返回了不含 `*` 的原文，页面只显示「已配置」，不把原文画出来。

商户号和证书还没齐时，页面仍允许保存，并说明后端可以用沙箱或模拟成功。这里没有沙箱开关，也不把密钥写进前端环境变量或仓库。

## 脚本

| 命令                 | 作用                      |
| -------------------- | ------------------------- |
| `npm run dev`        | 启动开发服务器，端口 5173 |
| `npm run build`      | 类型检查并构建            |
| `npm run type-check` | 只做类型检查              |
| `npm run lint`       | Oxlint 与 ESLint          |
| `npm run format`     | Prettier 格式化 `src/`    |
| `npm run preview`    | 预览构建结果              |

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
    settings/             微信支付配置
  components/             跨页面的小组件
  utils/                  很小的通用函数，目前只有会话读写
```

约定：

- 按功能模块放代码，一个文件只做一件事。页面变大时拆组件，不要堆成一个大单文件。
- 接口调用放在 `src/api/`，按模块分文件。
- 不建大而全的 `utils.ts`。
- 不留注释掉的废代码。

侧栏目前有：首页、商品、订单、会员、内容（轮播 / 资讯 / 字幕）、财务、设置（微信支付）。除微信支付外，占位页会写明「待实现」。

## 权限

管理端只有一种管理员角色，可以有多个管理员账户，权限相同。`src/stores/permission.ts` 的 `canAccess` 在登录后放行全部菜单。不在页面上做权限矩阵。
