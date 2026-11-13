# 奥瑞尔经销商城 · 管理后台

经销商城管理端前端（`aurel-mall-admin`）。包含登录、侧栏布局、路由、请求层、商品、会员和微信支付配置。订单、内容、财务仍是占位页。

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

客户端按 `aurel-mall-api` 已提供的契约调用。响应包一层 `{ "code": 0, "message": "ok", "data": ... }`，失败时 HTTP 状态与 `code` 相同，`message` 为原因。JSON 里的编号是十进制字符串。

登录：

```http
POST /api/v1/admin/auth/login
Content-Type: application/json

{ "username": "admin", "password": "<密码>" }
```

成功时 `data` 为 `{ "token": "<会话>", "tokenType": "Bearer", "expiresAt": "<时间>", "admin": { "id": "<id>", "username": "admin", "displayName": "<显示名>" } }`。`token` 必填。用户名优先读 `data.admin.username`，没有则读顶层 `username`，再没有就用登录时填写的用户名。之后请求头为 `Authorization: Bearer <token>`。失败时展示 `message`，例如「用户名或密码错误」。只有一种管理员角色，客户端不读取权限列表。

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

商品：

```http
GET /api/v1/admin/products?zone=&status=&categoryId=&page=&pageSize=
GET /api/v1/admin/products/:id
POST /api/v1/admin/products
PUT /api/v1/admin/products/:id
POST /api/v1/admin/products/:id/shelf
PUT /api/v1/admin/products/:id/stock
GET /api/v1/admin/mall-categories
POST /api/v1/admin/mall-categories
```

`zone` 为 `startup`（创业专区）或 `mall`（会员商城），`status` 为 `draft` / `on` / `off`。列表和保存以外的详情，`data` 都是商品对象。列表 `data` 是 `{ "items", "total", "page", "pageSize" }`，默认每页 20。创建和更新的 `data` 是 `{ "product", "warnings" }`。`PUT` 不能改专区，也不带库存。

创建 body：

| 字段            | 含义                                                            |
| --------------- | --------------------------------------------------------------- |
| `zone`          | `startup` 或 `mall`。只在创建时提交                             |
| `name`          | 名称                                                            |
| `subtitle`      | 副标题，可空                                                    |
| `body`          | 详情，可空                                                      |
| `coverUrl`      | 封面 URL，可空                                                  |
| `imageUrls`     | 附图 URL 数组，最多 20 个                                       |
| `freightFen`    | 运费，单位分                                                    |
| `priceFen`      | 售价，单位分。会员商城必填。创业专区不传，由接口按锁定单价写入  |
| `pvFen`         | 仅会员商城。单位分，`100` = 1 PV = 1 元，不是售价。创业专区不传 |
| `categoryId`    | 会员商城分类编号，字符串；`null` 表示不选。创业专区不传         |
| `stockQuantity` | 创建时的库存。改库存不走这个字段                                |
| `status`        | `draft` / `on` / `off`。不传时接口默认草稿                      |

上下架是 `POST /admin/products/:id/shelf`，body 为 `{ "status": "on" | "off" }`。库存是 `PUT /admin/products/:id/stock`，body 为 `{ "quantity": 10 }`，表示把可售数量改成这个值。

创业专区不能手填价格。页面不提交 `priceFen`，保存后展示接口落定的 `priceFen`。会员商城若 PV 大于售价，仍保存，并展示 `warnings`（例如「PV 大于售价」）。若创业专区请求里的售价不是锁定单价，接口仍按锁定单价保存，并在 `warnings` 里说明。

分类：

```http
GET /api/v1/admin/mall-categories
POST /api/v1/admin/mall-categories
```

`GET` 的 `data` 是数组，元素为 `id`、`name`、`sortOrder`、`createdAt`、`updatedAt`。创建 body 为 `{ "name": "分类", "sortOrder": 0 }`。页面只做列表和新建。会员商城商品可以选一个分类。

会员：

```http
GET /api/v1/admin/users?id=&nickname=&phone=&page=&pageSize=
GET /api/v1/admin/users/:id
GET /api/v1/admin/users/:id/kyc
POST /api/v1/admin/users/:id/disable
POST /api/v1/admin/users/:id/enable
```

列表 `data` 是 `{ "items", "total", "page", "pageSize" }`。`id` 精确，`nickname` 包含，`phone` 精确。用户对象不含 `kyc`。实名要再请求 `GET /admin/users/:id/kyc`。

| 字段          | 含义                                 |
| ------------- | ------------------------------------ |
| `id`          | 用户 ID                              |
| `nickname`    | 昵称                                 |
| `phone`       | 手机号，可空                         |
| `avatarUrl`   | 头像 URL，可空                       |
| `inviteCode`  | 邀请码，可空                         |
| `status`      | `active` 可登录，`disabled` 不能登录 |
| `member`      | 是否有市场树席位                     |
| `kycVerified` | 是否已核验实名                       |

实名响应：`verified`、`realName`、`idNumber`、`mobile`。还没提交时 `verified` 为 `false`，文字字段为 `null`。页面只展示这三项文字，不展示证件照片。

停用只表示该用户不能登录。没有额外处罚，也没有权限矩阵。只有一种管理员角色。

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
    catalog/              商品：列表、新建、编辑、上下架、库存、分类
    order/                订单（占位）
    member/               会员：列表、详情、停用和启用
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

侧栏目前有：首页、商品、订单、会员、内容（轮播 / 资讯 / 字幕）、财务、设置（微信支付）。商品、会员和微信支付可用。订单、内容、财务仍写明「待实现」。不在本页做发货、退款、提现、消息推送、营销经理门槛、联合创始人、工作室或资金明细。

## 权限

管理端只有一种管理员角色，可以有多个管理员账户，权限相同。`src/stores/permission.ts` 的 `canAccess` 在登录后放行全部菜单。不在页面上做权限矩阵。
