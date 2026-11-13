# 奥瑞尔经销商城 · 管理后台

经销商城管理端前端（`aurel-mall-admin`）。登录后的第一屏是只读的运营总览。另外包含侧栏布局、路由、请求层、商品、会员、订单发货、商城退款、提现审核、组织关系、奖励明细、福利专场、联合创始人、工作室、运营团队、首页轮播图、资讯知识和滚动字幕、提现分类和微信支付配置。财务总览仍是占位页。

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

订单：

```http
GET /api/v1/admin/orders?zone=&status=&userId=&page=&pageSize=
GET /api/v1/admin/orders/:id
POST /api/v1/admin/orders/:id/ship
Authorization: Bearer <token>
```

列表 `data` 是 `{ "items", "total", "page", "pageSize" }`，默认每页 20。筛选都可空。`zone` 为 `startup`（创业专区）或 `mall`（会员商城）。`status` 为 `pending_payment`（待支付）、`paid`（已支付）、`shipped`（已发货）、`closed`（已关闭）。`userId` 是用户编号，精确匹配。

详情和列表里的每一项都是订单。编号是十进制字符串。带 `Fen` 的金额是 JSON 数字，单位分。

| 字段              | 含义                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `id`              | 订单 ID                                                                                   |
| `orderNo`         | 订单号                                                                                    |
| `userId`          | 下单用户 ID                                                                               |
| `zone`            | `startup` 或 `mall`                                                                       |
| `status`          | `pending_payment` / `paid` / `shipped` / `closed`                                         |
| `goodsTotalFen`   | 商品金额                                                                                  |
| `freightFen`      | 运费                                                                                      |
| `payAmountFen`    | 应付，等于商品金额加运费                                                                  |
| `pvFen`           | 订单 PV。会员商城为各行之和，创业专区为 0。不是售价                                       |
| `pointsFen`       | 积分支付金额。未支付时为 0                                                                |
| `withdrawableFen` | 可提现账户支付金额。未支付时为 0                                                          |
| `consumptionFen`  | 消费账户支付金额。未支付时为 0                                                            |
| `wechatFen`       | 微信支付金额。未支付时为 0                                                                |
| `shipping`        | 下单时的地址快照：`contactName`、`contactPhone`、`province`、`city`、`district`、`detail` |
| `courierName`     | 快递公司。未发货为 `null`                                                                 |
| `trackingNumber`  | 运单号。未发货为 `null`                                                                   |
| `items`           | 订单行                                                                                    |
| `placedAt`        | 下单时间                                                                                  |
| `paidAt`          | 支付时间，可空                                                                            |
| `shippedAt`       | 发货时间，可空                                                                            |
| `closedAt`        | 关闭时间，可空                                                                            |

订单行：`id`、`skuId`、`productName`、`skuName`、`unitPriceFen`、`unitPvFen`、`unitFreightFen`、`quantity`、`lineTotalFen`、`linePvFen`、`lineFreightFen`。

发货 body 只有这两个字段：

```json
{ "courierName": "顺丰", "trackingNumber": "SF100" }
```

只有 `paid` 可以变成 `shipped`。成功后详情里的状态、快递公司和运单号以接口返回为准。重复发货返回 409，`message` 为「订单已发货」。未支付或已关闭返回 409，「只有已支付的订单可以发货」。快递公司或运单号为空、或超过 64 个字，返回 400，「快递公司不正确」或「运单号不正确」。页面展示接口返回的 `message`，不把发货失败当成成功。

提现审核：

```http
GET /api/v1/admin/withdrawals?status=&userId=&page=&pageSize=
GET /api/v1/admin/withdrawals/:id
POST /api/v1/admin/withdrawals/:id/reject
POST /api/v1/admin/withdrawals/:id/payout
Authorization: Bearer <token>
```

列表 `data` 是 `{ "items", "total", "page", "pageSize" }`。`status` 为 `pending`（待处理）、`rejected`（已驳回）、`paid`（已打款）。申请金额和结算金额是十进制字符串，单位分。驳回和打款没有请求体。

| 字段            | 含义                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `id` / `userId` | 申请 ID、用户 ID                                                                                |
| `amountFen`     | 申请金额                                                                                        |
| `status`        | `pending` / `rejected` / `paid`                                                                 |
| `accountName`   | 开户名。申请时的账户快照                                                                        |
| `bankName`      | 开户银行                                                                                        |
| `accountNo`     | 银行卡号                                                                                        |
| `branchName`    | 开户支行                                                                                        |
| `appliedAt`     | 申请时间                                                                                        |
| `settlement`    | 未处理时为 `null`。否则含 `outcome`、`amountFen`、`feeFen`、`payoutFen`、`adminId`、`settledAt` |

打款不由系统发起转账。确认表示财务已经把「申请金额 − 当时手续费」转到上述银行卡。手续费是打款当时的锁定值，不是申请时的值。接口在打款前不返回这个数字，确认框说明规则；成功后用返回的 `feeFen` 和 `payoutFen` 展示手续费和实际打款。驳回时这两项为 `null`。重复处理返回「提现申请已处理」。手续费高于申请金额返回「当前手续费高于提现金额，无法打款」，冻结保持不变。

商城退款：

```http
GET /api/v1/admin/refunds?status=&userId=&page=&pageSize=
POST /api/v1/admin/refunds/:id/approve
POST /api/v1/admin/refunds/:id/reject
Authorization: Bearer <token>
```

没有单独的详情接口，列表项就是审核用的全部字段。`status` 为 `pending` / `approved` / `rejected`。带 `Fen` 的订单金额是 JSON 数字。通过时的 body 只能是下面两种之一，数字不能写成小数或字符串：

```json
{ "refundFen": 9000 }
```

```json
{ "deductionFen": 1000 }
```

另一项由接口计算，并且退款金额 + 减扣金额 = 应付（含运费，`payAmountFen`）。页面会预览另一项，但请求仍只带所填的那一项。可以少于整单。驳回没有请求体。

| 字段                         | 含义                                                   |
| ---------------------------- | ------------------------------------------------------ |
| `payAmountFen`               | 应付，含运费                                           |
| `freightFen`                 | 运费。不会自动计入减扣                                 |
| `deductionHint`              | 接口给出的提示，例如运费和其他应扣费用不会自动计入减扣 |
| `refundFen` / `deductionFen` | 审核后才有                                             |
| `wechatRefundFen`            | 微信实退                                               |
| `withdrawableDeductionFen`   | 从该订单可提现部分减扣的金额                           |
| `consumptionCreditFen`       | 退回消费账户的金额                                     |
| `wechatRefundStatus`         | `none` / `sandbox` / `accepted`，未审核时为 `null`     |

创业专区订单不能退款，接口会拒绝。页面不另加审核字段。两项都填、或都不填，返回「请只填写退款金额或减扣金额」。重复处理返回「退款申请已处理」。

提现分类：

```http
GET /api/v1/admin/settings/withdrawal-display-names
PUT /api/v1/admin/settings/withdrawal-display-names
Authorization: Bearer <token>
```

`data` 为 `{ "items": [{ "sourceCode", "displayName" }] }`。`PUT` body 同样是 `{ "items": [{ "sourceCode", "displayName" }] }`。只提交接口返回的来源，不新增来源。显示名相同的来源会合并成一个分类。默认对应关系：系统奖励 `cofounder`，系统激励 `studio`，平台分红 `operations`，系统红包 `red_packet`，销售激励 `startup_sales` / `startup_points` / `mall_sales` / `mall_points`，幸运返还 `filing_settlement`，业绩奖 `position_dividend`。

营销经理门槛 T，以及下面的组织、报单、职位分红、奖励明细和会员钱包，对齐 `aurel-mall-api` 阶段 4 开放中的契约（PR #7，分支 `cursor/stage4-filing-awards-positions-8d5b`，提交 `ac38ee7`）。这些路径还没进 API 的 main。页面不自己计算资格、份额或幸运返还金额，失败时展示接口 `message`。发放日能不能改，由接口按业务时钟判断。职位名直接显示接口返回的 `positionName`。

编号是十进制字符串。钱包金额、奖励金额、分红金额、报单结算入账和门槛 T 都是十进制字符串，单位分。报单 `amountFen` 和结算里的 `unitPriceFen` 是 JSON 数字。

营销经理门槛：

```http
GET /api/v1/admin/settings/marketing-manager-market-threshold
PUT /api/v1/admin/settings/marketing-manager-market-threshold
```

`GET` / `PUT` 的 `data` 是 `{ "month", "thresholdFen", "nextMonth", "nextThresholdFen" }`。`PUT` body 仍是 `{ "value": "1000000" }`，`value` 为非负整数字符串，单位分。保存只写入下月，本月 `thresholdFen` 不变。格式不对时展示「门槛 T 必须是非负整数字符串」或「门槛 T 必须是非负整数」。

邀请关系：

```http
GET /api/v1/admin/users/:id/invite
GET /api/v1/admin/users/:id/invite/ancestors
GET /api/v1/admin/users/:id/invite/descendants?depth=
```

`invite` 含 `user`、`inviter`（没有上级时为 `null`）和 `directInvitees`。人物字段是 `userId`、`nickname`、`inviteCode`、`member`。直接邀请另有 `joinedAt`。上级链和下级链的 `data` 是 `{ "items" }`，元素另有 `parentUserId`、`depth`。下级还可以带响应里的 `depth`。不传 `depth` 时接口默认 5，合法范围 1 到 20。用户不存在是 404「用户不存在」。页面不能改上级。

市场关系：

```http
GET /api/v1/admin/users/:id/market-tree
```

`data` 含 `userId`、`seated`、`depth`、`placedAt`、`parent` 和 `markets`。未入座时 `seated` 为 `false`，`markets` 为空。`markets` 从左到右，每项是直接市场：`userId`、`nickname`、`placedAt`、`memberCount`、`members`。成员含 `userId`、`nickname`、`depth`、`placedAt`。页面不能调整席位。

报单与公排：

```http
GET /api/v1/admin/filings?userId=&bizDate=&sequence=&page=&pageSize=
GET /api/v1/admin/filings/:id
GET /api/v1/admin/filing-settlements?userId=&page=&pageSize=
```

`bizDate` 是上海自然日 `YYYY-MM-DD`。列表项含 `id`、`filingNo`、`userId`、`nickname`、`orderId`、`subOrderId`、`sequence`、`bizDate`、`status`、`amountFen`、`filedAt`、`settledAt`、`settlement`、`triggeredSettlement`。`sequence` 和 `bizDate` 在还没排上时为 `null`。`settlement` 是这一笔自己领到的幸运返还；序号是 5 的倍数时，`triggeredSettlement` 是当时发给序号 k 的返还。结算字段：`triggerSequence`、`beneficiaryFilingId`、`beneficiaryUserId`、`pointsFen`、`withdrawableFen`、`unitPriceFen`、`withdrawalRatioBps`、`settledAt`。日期不对是「日期不正确」，序号不对是「序号不正确」。

职位分红：

```http
GET /api/v1/admin/position-dividends?month=YYYY-MM
GET /api/v1/admin/position-dividends/qualifications/:userId?month=YYYY-MM
PUT /api/v1/admin/position-dividends/:month/payout-date
POST /api/v1/admin/position-dividends/:month/exclusions
POST /api/v1/admin/position-dividends/:month/manual-payments
GET /api/v1/admin/position-dividends/:month/records?page=&pageSize=
```

不传 `month` 时接口用已经结束的上一个业绩月。当月或未来月返回「业绩月份尚未结束」。方案含 `performanceMonth`、`payoutMonth`、`payoutDate`（`YYYY-MM-DD`，默认次月 15 日）、`status`（`open` / `paid`）、`thresholdFen`、`mallPvFen`、`pools`。每个池含 `positionCode`、`positionName`、`poolBps`、`exclusive`、`poolFen`、`eligibleCount`、`shareFen`、`members`。成员含 `userId`、`nickname`、`removed`、`originalAmountFen`、`payment`。`payment` 为 `null` 或 `{ "mode", "actualAmountFen", "remark", "paidAt" }`。

修改发放日的 body 是 `{ "payoutDate": "2026-12-16" }`，必须落在业绩月的次月，并且是尚未到来的日期。已发放返回「本期已发放，不能修改发放日」。停止自动发放的 body 是 `{ "userId": "1" }`，一次一人，份额不重新分配。手工发放只接受已经停止自动发放的会员，body 是 `{ "userId", "positionCode", "actualAmountFen", "remark" }`，`actualAmountFen` 是十进制分，`remark` 为 1 到 200 字。考核结果含 `ranks`（`qualified`、`inPool`）和直接市场的 `performanceFen`。发放记录含原金额、实发、备注和方式 `auto` / `manual`。页面不提供整期立即发放。

奖励明细：

```http
GET /api/v1/admin/awards?rewardType=&orderId=&userId=&layer=&page=&pageSize=
```

`rewardType` 为 `startup_sales`（创业专区销售奖）、`startup_points`（创业专区见点奖）、`mall_sales`（会员商城销售奖）、`mall_points`（会员商城见点奖）。不传则这四类都返回。层级 1 到 15，销售奖的层级是 1。列表项：`id`、`userId`、`nickname`、`rewardType`、`orderId`、`layer`、`amountFen`、`occurredAt`、`wallets`。`wallets` 的每一项是 `walletType`、`amountFen`、`sourceCode`。类型不对是「奖励类型不正确」，层数不对是「层数不正确」。

会员钱包：

```http
GET /api/v1/admin/users/:id/wallets
GET /api/v1/admin/users/:id/wallets/:walletType/ledger?page=&pageSize=
GET /api/v1/admin/users/:id/wallet-holds?status=&page=&pageSize=
GET /api/v1/admin/transfers?payerId=&payeeId=&page=&pageSize=
```

余额形状与 `GET /me/wallets` 相同。流水字段与会员端一致。冻结多一个 `updatedAt`。划转按付款人、收款人分别筛选，记录含 `payerNickname`、`payeeNickname`。页面只查询，不发起划转。用户不存在是「用户不存在」。用户资料仍用 `GET /admin/users/:id`。

福利专场：

```http
GET /api/v1/admin/welfare/entry
PUT /api/v1/admin/welfare/entry
GET /api/v1/admin/welfare/signups?userId=&bizDate=&page=&pageSize=
GET /api/v1/admin/welfare/participants?userId=&page=&pageSize=
Authorization: Bearer <token>
```

对齐 `aurel-mall-api` main 上已合并的福利专场管理接口（PR #9，合并提交 `582f41da6efa30a5a6a027cb873523c57b7d1c98`）。页面不计算资格、轮次或发放金额，失败时展示接口 `message`。编号和带 `Fen` 的金额是十进制字符串，单位分。轮次是 JSON 数字。不提交、也不编辑轮次门槛、单轮额度和每日计提。

入口 `data` 是 `{ "copy", "imageUrl" }`。`imageUrl` 未配置时为 `null`。`PUT` body 只有 `copy`（字符串，最长 200）和可选的 `imageUrl`（字符串，最长 512；空字符串会去掉图片）。多出来的字段会被接口拒绝。

报名列表项：`id`、`userId`、`nickname`、`bizDate`、`signedAt`、`settled`、`payoutFen`。`bizDate` 是 Asia/Shanghai 的 `YYYY-MM-DD`。还没发放时 `payoutFen` 为 `null`。日期不对是「日期不正确」，用户编号不对是「编号不正确」。

参与资格列表项：`userId`、`nickname`、`member`、`eligible`、`actualPayFen`、`openedRoundCount`、`claimCapFen`、`cumulativeClaimedFen`、`currentRoundNo`、`currentRoundClaimedFen`、`signedUpToday`。不传 `userId` 时接口只列出会员。指定用户不存在是「会员不存在」。本轮已领额度和当前轮次按接口原样展示：一轮正好领满时，额度仍记在这一轮；已领超过已开额度时，当前轮次可以高于已开轮数。

联合创始人：

```http
GET /api/v1/admin/cofounder/content
PUT /api/v1/admin/cofounder/content
GET /api/v1/admin/cofounder/settings
PUT /api/v1/admin/cofounder/settings
GET /api/v1/admin/cofounders?status=&page=&pageSize=
POST /api/v1/admin/cofounders
GET /api/v1/admin/cofounders/:userId/cancellation
POST /api/v1/admin/cofounders/:userId/cancel
Authorization: Bearer <token>
```

对齐 `aurel-mall-api` main 上已合并的联合创始人管理接口（PR #10，合并提交 `8ec335e6712f7e9b8388d1bfaf1244fd88be6295`）。页面不计算分红，也不发起退款或钱包划转。失败时展示接口 `message`。编号和带 `Fen` 的金额是十进制字符串，单位分。名额、在籍人数、周期里的日和星期是 JSON 数字。

内容 body 只有 `entryCopy`（最长 500）、`entryImageUrls`、`introTitle`（最长 200）、`introBody`（最长 20000）、`introImageUrls`。图片是字符串数组，最多 20 个，每个地址最长 512。空数组会清空这一组图片。多出来的字段会被接口拒绝。

设置 body 只有 `seatCap`（0 到 1000000）、`userButtonOpen`、`activationAmountFen`、`payoutMode`、`schedule`、`poolThresholdFen`、`perPersonThresholdFen`。`payoutMode` 是 `immediate`、`periodic`、`pool_total`、`per_person` 之一。`schedule` 含 `cycle`（`daily` / `weekly` / `monthly` / `interval`）、`time`（`HH:mm`，Asia/Shanghai）、`weekday`（周一 1 至周日 7）、`monthDay`、`intervalDays`、`anchorDate`。按池子总额时门槛必须大于 0，按人均额度时人均门槛必须大于 0。不提交分红比例。返回里的 `lockedRates.startupDividendRatioBps` 和 `lockedRates.mallDividendRatioBps` 只展示。`enrolledCount` 和 `poolFen` 也只展示。改分配方式或定期周期后，池子由服务端处理，页面没有另一次清池请求。

开通金额为 0 时按接口原样显示。取消身份会把 `userButtonOpen` 写成 false，名额与分配页仍可以再打开。

名单 query 的 `status` 为 `active` 或 `cancelled`，不传则两种都返回。指定 body 是 `{ "userId": "<会员编号>" }`，不收款，名额已满也可以指定。取消审核展示按奖励类型的累计入账、`cofounderDividendFen`、当前可提现余额（含冻结和可用）、已完成提现的笔数、申请金额合计、实付合计和每笔明细。已提现合计和联合创始人分红分开显示。`POST .../cancel` 只取消身份。

工作室：

```http
GET /api/v1/admin/studios?status=&page=&pageSize=
POST /api/v1/admin/studios
POST /api/v1/admin/studios/:userId/cancel
GET /api/v1/admin/studio/settings
PUT /api/v1/admin/studio/settings
Authorization: Bearer <token>
```

对齐 `aurel-mall-api` main 上已合并的工作室管理接口（PR #11，合并提交 `0f21b9a8c7002ca96b625586a3b81de751ca60d0`）。页面不计算补贴，也不发起退款或钱包划转。失败时展示接口 `message`。编号是十进制字符串。

名单 query 的 `status` 为 `active` 或 `cancelled`，不传则两种都返回。`page` 与 `pageSize` 和其它列表相同，默认每页 20，`pageSize` 最大 100。列表项是 `id`、`userId`、`nickname`、`member`、`status`、`enrolledAt`、`cancelledAt`。指定 body 只有 `{ "userId": "<会员编号>" }`。对方必须已经是会员。没有人数上限，也不收款，用户也不能自己付款开通。指定不会取消联合创始人身份。同一人当前已是工作室时接口拒绝。取消后可以再指定，会另写一行。

`POST /admin/studios/:userId/cancel` 只取消身份。不退款，也不动钱包。取消后不再计提补贴，已经入账的保留。没有取消审核接口，也没有退款按钮。

设置的 `data` 只有 `{ "externalName" }`。未配置时接口返回默认「补贴」。`PUT` body 只有 `externalName`（去掉首尾空白后 1 到 64 字）。不提交补贴比例，也不提交每日报单检查时间。改名称不会改可提现显示分类，来源 `studio` 的分类默认仍是「系统激励」。

运营团队：

```http
GET /api/v1/admin/ops-team
POST /api/v1/admin/ops-team
POST /api/v1/admin/ops-team/cancel
Authorization: Bearer <token>
```

对齐 `aurel-mall-api` main 上已合并的运营团队管理接口（PR #12，合并提交 `3a839fc29e12a3086c3e2d80b2ad9a5147015c9d`）。页面不计算分红，也不发起退款或钱包划转。失败时展示接口 `message`。编号是十进制字符串。

`GET` 的 `data` 是 `{ "holder": null }`，或 `holder` 含 `id`、`userId`、`nickname`、`member`、`status`、`enrolledAt`、`cancelledAt`。有人在籍时 `status` 为 `active`，`cancelledAt` 为 null。全网同时只有一名持有人，也称运营负责人。

`POST /admin/ops-team` 的 body 只有 `{ "userId": "<会员编号>" }`。对方必须已经是会员。没有人在籍时指定这名会员。已经有别人在籍时，同一次请求改派：上一任立刻不再领取之后的分红，已经入账的留在原账户。不退款，也不把余额转给新持有人。没有另一个改派地址。非会员是「非会员不能被指定为运营团队」。用户不存在是「会员不存在」。已经是当前持有人是「该会员已是运营团队」。指定不取消联合创始人或工作室身份。没有用户自助开通，也不收款。

`POST /admin/ops-team/cancel` 没有请求体。取消后没有持有人，之后的订单不发给任何人。不退款，也不动钱包。已经入账的保留。取消不取消联合创始人或工作室身份。当前没有运营团队是「当前没有运营团队」。没有退款按钮。

没有运营团队设置接口。不提交 `OPS_TEAM_STARTUP_DIVIDEND_RATIO_BPS` 或 `OPS_TEAM_MALL_DIVIDEND_RATIO_BPS`。页面写明官方示例是创业专区 5%（500 基点）和会员商城 7%（700 基点）。这两项只在进程启动时锁定，本页不读取当前值，也不提供编辑。

运营总览：

```http
GET /api/v1/admin/ops/overview?period=today|yesterday|last7days|month|custom
Authorization: Bearer <token>
```

`period` 默认 `today`。`custom` 同时传 `from` 和 `to`：`YYYY-MM-DD` 按 Asia/Shanghai 自然日，含首尾；带时区的时刻按 `[from, to)`。登录后进入这一页。页面每 30 秒用同一个 GET 再请求一次；上一次还没回来就跳过。没有 WebSocket。全屏按钮只把这一页铺满屏幕，不增加发货、打款或修改。

`data` 里的合计金额是十进制字符串，单位分，页面用已有的 `formatDecimalFen` / `decimalFenText` 显示，不在浏览器里重算区间合计。笔数、件数、序号和 `delta` 是 JSON 数字。编号是十进制字符串。订单列表里的单笔 `*Fen` 仍是 JSON 数字，和这里的合计字符串不是同一种 JSON 类型。

`data.period` 含 `fromBizDate`、`untilBizDate`，页面用这两个业务日做区间标签。七块数据是 `kpis`、`trend`、`composition`、`withdrawals`、`wallets`、`filing`、`organization`。微信现金和三个钱包负债分开。不返回成本或区间利润，职位资格只返回人数，不返回分红金额。`composition.cash.cofounderActivationFen` 单独一行，没有这笔微信支付时为 `"0"`。`filing` 不随 `period` 变化。`organization.positionQualifications.available` 为真时，职位名用接口的 `positionName`。

点指标会打开已经有的列表，并带上该列表本来就有的筛选（例如待审核提现、专区和订单状态、报单日期）。没有对应列表的数字，例如联合创始人开通，只展示。

首页轮播图、资讯知识和滚动字幕：

```http
GET /api/v1/admin/home/banners?status=&page=&pageSize=
GET /api/v1/admin/home/banners/:id
POST /api/v1/admin/home/banners
PUT /api/v1/admin/home/banners/:id
POST /api/v1/admin/home/banners/:id/status
GET /api/v1/admin/home/tickers?status=&page=&pageSize=
GET /api/v1/admin/home/tickers/:id
POST /api/v1/admin/home/tickers
PUT /api/v1/admin/home/tickers/:id
POST /api/v1/admin/home/tickers/:id/status
GET /api/v1/admin/home/articles?kind=&status=&page=&pageSize=
GET /api/v1/admin/home/articles/:id
POST /api/v1/admin/home/articles
PUT /api/v1/admin/home/articles/:id
POST /api/v1/admin/home/articles/:id/status
Authorization: Bearer <token>
```

对齐 `aurel-mall-api` main 上已合并的首页内容接口（PR #13，合并提交 `a7ab217f6c716c3ad707128da721bdc9d38b03e8`）。失败时展示接口 `message`。编号是十进制字符串。列表 `data` 是 `{ "items", "total", "page", "pageSize" }`，默认每页 20。管理端列表包含草稿和已下架。下架把状态写成 `off`，不删除记录。`PUT` 只提交内容，不带 `status`。

轮播图字段是 `title`、`imageUrl`、`pagePath`、`sortOrder`、`status`、`createdAt`、`updatedAt`。`status` 为 `draft` / `on` / `off`。创建时不传 `status` 则接口写成草稿；选「立即展示」才传 `on`。`pagePath` 是小程序页面路径，填 `http://` 或 `https://` 时接口拒绝，文案为「跳转页面必须是小程序页面」。图片地址须是 http 或 https。这里不上传文件。排序是整数，首页按从小到大、再按编号排列。

滚动字幕字段是 `content`、`sortOrder`、`status`、`createdAt`、`updatedAt`。状态与轮播图相同。创建时省略 `status` 同样是草稿。

资讯和知识的类型 `kind` 只有 `article`（文章）、`news`（新闻）、`notice`（通知）。状态是 `draft` / `published` / `off`。字段还有 `title`、`summary`、`body`、`coverUrl`、`publishedAt`、`createdAt`、`updatedAt`。封面可空，填写时须是 http 或 https。创建时不传 `status` 为草稿；选「立即发布」才传 `published`，并写入发布时间。再次发布会用当前业务时间覆盖 `publishedAt`。修改内容不改状态，也不改发布时间。下架后离开 `published`，已有的发布时间保留。

不在这三页修改第 1.1 节锁定比例，也不做消息推送、文件上传或正式 H5。

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
    dashboard/            运营总览（登录后第一屏）
    catalog/              商品：列表、新建、编辑、上下架、库存、分类
    order/                订单：列表、详情、发货；商城退款审核
    member/               会员：列表、详情、停用和启用
    org/                  组织：邀请关系、市场关系、报单与公排
    rewards/              奖励：职位分红、奖励明细、会员钱包
    welfare/              福利专场：入口文案和图片、报名记录、参与资格
    cofounder/            联合创始人：入口与介绍、名额与分配、在籍与取消审核
    studio/               工作室：名单与指定、取消身份、对外名称
    ops-team/             运营团队：当前持有人、指定或改派、取消身份
    home/                 首页轮播图、资讯和知识、滚动字幕
    finance/              提现审核；财务总览仍是占位
    settings/             微信支付配置、提现分类显示名
  components/             跨页面的小组件
  utils/                  会话读写，以及上海时区的时间显示
```

约定：

- 按功能模块放代码，一个文件只做一件事。页面变大时拆组件，不要堆成一个大单文件。
- 接口调用放在 `src/api/`，按模块分文件。
- 不建大而全的 `utils.ts`。
- 不留注释掉的废代码。

侧栏第一项是运营总览，登录后就进这一页。其余是：商品、订单、商城退款、会员、组织（邀请关系 / 市场关系 / 报单公排）、奖励（职位分红 / 奖励明细 / 会员钱包）、福利专场（入口配置 / 报名记录 / 参与资格）、联合创始人（入口与介绍 / 名额与分配 / 在籍名单）、工作室（名单 / 对外名称）、运营团队、首页轮播图、资讯知识和滚动字幕（轮播图 / 资讯和知识 / 滚动字幕）、提现审核、财务、设置（微信支付、提现分类）。商品、会员、订单、商城退款、提现审核、组织、奖励、福利专场、联合创始人、工作室、运营团队、首页轮播图、资讯知识和滚动字幕、微信支付和提现分类可用。运营总览只读。财务总览仍写明「待实现」。

组织页可以沿邀请链和市场树查看，报单页查看全网公排和幸运返还结算。职位分红页可以改次月发放日、停止某会员的自动发放，并为已停止的会员登记手工发放。营销经理门槛 T 只写入下月。奖励明细按订单、层级和收款人查询销售奖与见点奖。会员钱包只查询三个账户、冻结和消费划转。福利专场只配置首页入口文案和图片，并查看报名、参与资格和本轮已领额度。联合创始人可以配置首页入口和介绍页、名额、用户按钮、微信支付开通金额，以及互斥的四种分配方式和对应参数；可以指定在籍，并在看过取消审核明细后只取消身份。工作室可以指定已经是会员的人，并只取消身份；对外名称默认「补贴」，保存时只提交这个名称。没有用户自助开通，没有名额上限，也没有四种分配方式或分红池。运营团队可以查看当前唯一持有人，指定一名已经是会员的人；已有持有人时同一次指定就是改派，也可以取消到没有人持有。不在这里做内容发布、消息推送、财务总览，也不修改锁定配置（运营团队分红比例、工作室补贴比例、联合创始人分红比例、轮次门槛、单轮额度、每日计提、每日报单检查时间等）。页面不发起开通退款或钱包划转，也不提前执行整期自动发放，也不另做一次清池。运营总览不增加福利专场、联合创始人、工作室或运营团队卡片；联合创始人开通金额仍用接口里已有的 `cofounderActivationFen`。

## 权限

管理端只有一种管理员角色，可以有多个管理员账户，权限相同。`src/stores/permission.ts` 的 `canAccess` 在登录后放行全部菜单。不在页面上做权限矩阵。
