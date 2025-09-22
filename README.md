# SubHub

SubHub 是一个运行在 Cloudflare Workers 上的简洁机场订阅管理面板。它为最终用户提供订阅查询与手动刷新，为管理员提供基于 KV 的订阅数据维护能力，并内置帮助文档与客户端下载页，适合个人或团队快速搭建轻量化的订阅后台。

## 功能特性

- 🔐 **双角色登录**：用户以 UUID 登录查看订阅信息，管理员使用口令登录后台。
- 🗃️ **KV 存储抽象**：默认使用 Cloudflare KV，后续可扩展到 D1 或其他外部数据库。
- 🔄 **订阅刷新**：调用订阅链接并解析 Header，实时更新流量用量与过期时间。
- 🧭 **模块化路由**：登录、用户、刷新、管理员接口分层管理，便于扩展。
- 🧩 **原生界面**：使用原生 HTML + Tailwind CDN 构建，支持用户面板、管理后台与静态帮助页。

## 快速开始

1. 安装依赖：
   ```bash
   npm install
   ```
2. 创建 KV 命名空间并绑定：
   ```bash
   npx wrangler kv:namespace create USERS_KV
   ```
   将生成的 id/preview_id 写入 `wrangler.toml` 对应位置。
3. 配置环境变量：
   ```bash
   wrangler secret put ADMIN_KEY
   wrangler secret put JWT_SECRET
   ```
4. 本地开发：
   ```bash
   npm run dev
   ```
5. 部署：
   ```bash
   npm run deploy
   ```

默认情况下，管理员应首先使用口令登录 `/admin` 后台，添加用户 UUID 及订阅链接等信息。用户随后即可凭自身 UUID 登录 `/user` 查看面板。

## 目录结构

```
subhub/
├── src/
│   ├── routes/              # 路由处理函数
│   │   ├── login.ts         # 登录 / 登出
│   │   ├── user.ts          # 用户面板
│   │   ├── admin.ts         # 管理后台 + CRUD API
│   │   ├── refresh.ts       # 订阅刷新逻辑
│   │   └── static.ts        # 登录页、Docs、Clients 静态输出
│   ├── utils/
│   │   ├── jwt.ts           # JWT 签发与校验
│   │   ├── storage.ts       # Storage 抽象与 KV 实现
│   │   ├── render.ts        # 原生 HTML 渲染
│   │   └── parser.ts        # 解析订阅 Header
│   └── worker.ts            # Worker 入口，注册路由
├── static/
│   ├── docs.html            # 帮助文档
│   └── clients.html         # 客户端下载
├── wrangler.toml
├── package.json
└── README.md
```

## 数据结构

用户记录固定为以下结构存储在 `USERS_KV` 中：

```json
{
  "sub": "https://airport.example.com/sub/<uuid>",
  "expire": "2025-12-31T23:59:59Z",
  "note": "VIP",
  "traffic": { "upload": 0, "download": 0, "total": 0 }
}
```

未来可在保持兼容的前提下扩展字段，如多条订阅、分组标签等。

## 架构设计

- **存储层**：`Storage` 接口封装 `getUser`/`putUser`/`deleteUser`/`listUsers`，默认实现为 Cloudflare KV，便于后续接入 D1。
- **认证层**：使用 `JWT_SECRET` 对 payload 进行 HS256 签名，token 通过 Cookie 下发。管理员口令来自 `ADMIN_KEY`。
- **路由层**：`src/routes` 下按功能拆分，`worker.ts` 中集中注册，便于扩展新模块。
- **UI 层**：原生 HTML + 少量 JS 与 Tailwind CDN 实现，开箱即用，同时保留进一步替换前端框架的空间。

## 截图预览

下图展示了用户面板和管理后台的示意（可根据实际部署效果替换）：

![用户面板预览](https://user-images.example.com/subhub-user.png)
![管理后台预览](https://user-images.example.com/subhub-admin.png)

## 许可

本项目以 MIT License 开源，欢迎提交 Issue 与 PR 共同完善。
