# PicBed 个人图床相册

个人图床 + 相册展示网站：对外相册展示、图片/相册管理、图片外链获取、分享密码、3D 地图轨迹。

## 技术栈

- **框架**：Next.js 16+（App Router，Node.js Runtime，Turbopack）
- **UI**：HeroUI v3 + Tailwind CSS v4（暗色模式）
- **数据/认证**：Supabase（Postgres + Auth + RLS）
- **对象存储**：通用 S3 协议服务（Cloudflare R2 / AWS S3 / MinIO）
- **图片处理**：sharp（缩略图 / WebP / EXIF）
- **地图**：Cesium 3D 地球（路由级按需加载）
- **部署**：Vercel

## 文档

- 产品需求：`docs/PRD.md`
- 里程碑规划：`docs/MILESTONES.md`
- 安全清单：`docs/SECURITY.md`

## 开发

```bash
cp .env.example .env.local   # 填入真实配置（见下方环境变量）
npm install                  # postinstall 会自动拷贝 Cesium 静态资源到 public/cesium
npm run dev                  # http://localhost:3000
```

数据库变更一律走 `supabase/migrations/`，禁止手工改生产 schema。

## 环境变量

| 变量                                        | 必填 | 说明                                                                 |
| ------------------------------------------- | ---- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                  | ✅   | Supabase 项目 URL                                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`             | ✅   | 客户端 anon key（可公开）                                            |
| `SUPABASE_SERVICE_ROLE_KEY`                 | ✅   | 服务端密钥，**严禁泄露到客户端**                                     |
| `ADMIN_EMAIL`                               | ✅   | 唯一管理员邮箱（Supabase Auth 中已存在的账号）                       |
| `S3_ENDPOINT`                               | ✅   | S3 兼容端点（R2 为 `https://<account_id>.r2.cloudflarestorage.com`） |
| `S3_REGION`                                 |      | 区域（R2 为 `auto`）                                                 |
| `S3_BUCKET`                                 | ✅   | 桶名                                                                 |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | ✅   | 存储访问凭证                                                         |
| `S3_PUBLIC_BASE`                            |      | 直链公网前缀（CDN），留空则仅提供 `/f/` 代理链接                     |
| `NEXT_PUBLIC_SITE_URL`                      |      | 站点公网地址（sitemap/外链用），默认 `http://localhost:3000`         |
| `SESSION_SECRET`                            |      | 访客相册/分享 cookie 签名密钥，**生产务必更换为随机长字符串**        |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN`              |      | Cesium Ion token（地图瓦片），留空自动回退 OSM                       |

## 常用命令

| 命令                | 说明                               |
| ------------------- | ---------------------------------- |
| `npm run dev`       | 开发服务器（Turbopack）            |
| `npm run build`     | 生产构建                           |
| `npm run start`     | 运行生产构建                       |
| `npm run lint`      | ESLint 检查                        |
| `npm run typecheck` | TypeScript 类型检查                |
| `npm run format`    | Prettier 格式化                    |
| `npm test`          | Vitest 单元/集成测试（43 项）      |
| `npm run test:e2e`  | Playwright E2E（需真实环境，见下） |

## 测试

- **单元/集成（Vitest）**：变体生成、分享/相册密码安全、代理权限分支、RLS migration 策略。
- **E2E（Playwright，`e2e/critical-paths.spec.ts`）**：登录 → 上传 → 建相册 → 前台访问 → 分享密码 → 外链代理 六条关键路径。

E2E 依赖一套可用环境，未配置时自动跳过：

```bash
# 本地起 dev 后执行（E2E_SKIP_WEBSERVER=1 表示服务已由 CI/staging 提供）
E2E_BASE_URL=http://localhost:3000 \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD=****** \
npm run test:e2e
```

## 部署（Vercel）

1. 推送仓库并连接 Vercel 项目；Framework 选 Next.js。
2. 在 Vercel 项目设置中逐项填入 `.env.example` 的环境变量（生产用真实 Supabase 项目与 S3 桶）。
3. 首次部署后在 Supabase 执行 `supabase/migrations/` 全部脚本（SQL Editor 或 `supabase db push`），并确认 `site_settings` 种子数据存在。
4. 部署后冒烟：前台首页 → 后台登录 → 上传一张图 → 确认公开页出现 → 私密图直链返回 404。

## 备份与恢复

- **数据库**：Supabase 开启每日自动备份。恢复：在备份时间点导出（PITR 或 SQL 导出），执行 `0001~0004` migration 后再导入业务数据。
- **对象存储**：S3 桶开启**版本控制**（R2 也支持），防止误删/覆盖；定期用 `aws s3 sync` 或生命周期规则将原图归档到冷存储。
- 恢复顺序：先恢复数据库（含 `images.s3_key`），再恢复 S3 对象（路径 `images/{yyyy}/{mm}/{id}/...`）。

## 里程碑状态

M0~M8 已完成并提交；M9 测试加固与上线（含生产部署冒烟）为收尾里程碑，见 `docs/MILESTONES.md`。
