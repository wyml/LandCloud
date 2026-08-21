<p align="center">
  <img src="public/logo.png" alt="PicBed" width="320" />
</p>

<h1 align="center">PicBed 个人图床相册</h1>

<p align="center">
  个人图床 + 相册展示网站：对外相册展示、图片/相册管理、图片外链获取、分享密码、3D 地图轨迹。
</p>

---

## 技术栈

- **框架**：Next.js 16+（App Router，Node.js Runtime，Turbopack）
- **UI**：HeroUI v3 + Tailwind CSS v4（暗色模式）
- **数据/认证**：Supabase（Postgres + Auth + RLS）
- **对象存储**：通用 S3 协议服务（Cloudflare R2 / AWS S3 / MinIO）
- **图片处理**：sharp（缩略图 / WebP / EXIF）
- **地图**：Cesium 3D 地球（路由级按需加载）

## 文档

| 文档 | 说明 |
|------|------|
| [产品需求](docs/PRD.md) | 功能需求与设计 |
| [里程碑规划](docs/MILESTONES.md) | 开发计划与进度 |
| [安全清单](docs/SECURITY.md) | 安全策略 |
| [部署指南](docs/DEPLOY.md) | 生产环境部署 |

## 开发

```bash
cp .env.example .env.local   # 填入真实配置（见下方环境变量）
npm install                  # postinstall 会自动拷贝 Cesium 静态资源到 public/cesium
npm run dev                  # http://localhost:3000
```

数据库变更一律走 `supabase/migrations/`，禁止手工改生产 schema。

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 客户端 anon key（可公开） |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 服务端密钥，**严禁泄露到客户端** |
| `ADMIN_EMAIL` | ✅ | 唯一管理员邮箱（Supabase Auth 中已存在的账号） |
| `S3_ENDPOINT` | ✅ | S3 兼容端点（R2 为 `https://<account_id>.r2.cloudflarestorage.com`） |
| `S3_REGION` | | 区域（R2 为 `auto`） |
| `S3_BUCKET` | ✅ | 桶名 |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | ✅ | 存储访问凭证 |
| `S3_PUBLIC_BASE` | | 直链公网前缀（CDN），留空则仅提供 `/f/` 代理链接 |
| `NEXT_PUBLIC_SITE_URL` | | 站点公网地址（sitemap/外链用），默认 `http://localhost:3000` |
| `SESSION_SECRET` | | 访客相册/分享/手机上传令牌 cookie 签名密钥，**生产务必更换为随机长字符串** |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | | Cesium Ion token（地图瓦片），留空自动回退 OSM |

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器（Turbopack） |
| `npm run build` | 生产构建 |
| `npm run start` | 运行生产构建 |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run format` | Prettier 格式化 |
| `npm test` | Vitest 单元/集成测试 |
| `npm run test:e2e` | Playwright E2E（需真实环境） |

## 测试

- **单元/集成（Vitest）**：变体生成、分享/相册密码安全、代理权限分支、RLS migration 策略。
- **E2E（Playwright）**：登录 → 上传 → 建相册 → 前台访问 → 分享密码 → 外链代理 六条关键路径。

E2E 依赖一套可用环境，未配置时自动跳过：

```bash
E2E_BASE_URL=http://localhost:3000 \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD=****** \
npm run test:e2e
```

## 备份与恢复

- **数据库**：Supabase 开启每日自动备份。恢复：在备份时间点导出（PITR 或 SQL 导出），执行 migration 后再导入业务数据。
- **对象存储**：S3 桶开启版本控制，防止误删/覆盖；定期用 `aws s3 sync` 归档到冷存储。
- 恢复顺序：先恢复数据库（含 `images.s3_key`），再恢复 S3 对象（路径 `images/{yyyy}/{mm}/{id}/...`）。
