# 部署指南

本文档涵盖 PicBed 的生产环境部署流程，包括 Supabase、S3 存储、Vercel 三部分配置。

---

## 1. 前置准备

- [Node.js](https://nodejs.org/) 18+
- [Supabase](https://supabase.com/) 账号
- S3 兼容存储（推荐 [Cloudflare R2](https://www.cloudflare.com/products/r2/) / AWS S3 / MinIO）
- [Vercel](https://vercel.com/) 账号（或其他 Next.js 托管平台）

---

## 2. Supabase 配置

### 2.1 创建项目

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)，创建新项目
2. 记录 **Project URL**、**anon key**、**service_role key**（Settings → API）

### 2.2 初始化数据库

在 Supabase Dashboard 的 **SQL Editor** 中，按顺序执行以下迁移脚本：

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_storage_rpc.sql
supabase/migrations/0003_album_password.sql
supabase/migrations/0004_rate_limits.sql
supabase/migrations/0005_live_photos.sql
supabase/migrations/0006_hidden_visibility.sql
```

或使用 Supabase CLI：

```bash
supabase db push
```

### 2.3 创建管理员账号

1. 在 Supabase Dashboard → **Authentication → Users** 中创建用户
2. 记录该用户的邮箱，填入环境变量 `ADMIN_EMAIL`

### 2.4 配置 Storage Bucket

1. 进入 **Storage** 页面，创建 Bucket（如 `picbed`）
2. 设置为 **Public**（如果需要直链访问）或保持 Private（通过代理访问）

---

## 3. S3 存储配置

### Cloudflare R2

1. 创建 R2 Bucket
2. 在 **Settings** 中获取 S3 API 端点：`https://<account_id>.r2.cloudflarestorage.com`
3. 创建 **API Token**，记录 Access Key ID 和 Secret Access Key
4. （可选）配置自定义域名用于 CDN 直链

### AWS S3

1. 创建 Bucket，关闭 "Block all public access"（如果需要直链）
2. 添加 Bucket Policy 允许公开读取（仅限直链场景）
3. 创建 IAM 用户，授予 `s3:PutObject`、`s3:GetObject`、`s3:DeleteObject` 权限

### MinIO（自托管）

```bash
# 启动 MinIO
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=admin \
  -e MINIO_ROOT_PASSWORD=your-password \
  minio/minio server /data --console-address ":9001"
```

- 端点：`http://your-server:9000`
- 需要在 MinIO Console 中创建 Bucket 并设置公开访问策略

---

## 4. 环境变量

复制 `.env.example` 为 `.env.local`（开发）或在 Vercel 中逐项配置：

```bash
cp .env.example .env.local
```

| 变量 | 必填 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key（可公开） |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase 服务端密钥，**严禁泄露** |
| `ADMIN_EMAIL` | ✅ | 管理员邮箱 |
| `S3_ENDPOINT` | ✅ | S3 兼容端点 |
| `S3_REGION` | | 区域（R2 填 `auto`） |
| `S3_BUCKET` | ✅ | Bucket 名称 |
| `S3_ACCESS_KEY_ID` | ✅ | S3 Access Key |
| `S3_SECRET_ACCESS_KEY` | ✅ | S3 Secret Key |
| `S3_PUBLIC_BASE` | | CDN 直链域名，如 `https://cdn.example.com` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 站点公网地址 |
| `SESSION_SECRET` | | Cookie 签名密钥，**生产务必更换** |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | | Cesium Ion token（地图瓦片） |

---

## 5. Vercel 部署

### 5.1 连接仓库

1. 推送代码到 GitHub/GitLab
2. 在 Vercel 中 Import 项目，Framework 选 **Next.js**
3. 配置环境变量（Vercel → Settings → Environment Variables）

### 5.2 构建设置

- **Build Command**：`npm run build`
- **Output Directory**：默认
- **Node.js Version**：18+

### 5.3 部署

点击 **Deploy**，等待构建完成。

---

## 6. 其他平台部署

### Docker

```dockerfile
FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

需要在 `next.config.ts` 中设置 `output: 'standalone'`。

### PM2（传统服务器）

```bash
npm run build
pm2 start npm --name "picbed" -- start
pm2 save
```

---

## 7. 部署后验证

1. **前台首页**：访问 `/，检查 Hero 背景图、标题是否正常
2. **后台登录**：访问 `/admin/login`，使用管理员账号登录
3. **上传测试**：上传一张图片，确认缩略图生成正常
4. **图片详情**：点击图片进入详情页，检查 EXIF、外链
5. **分享功能**：创建分享链接，测试密码访问
6. **外链代理**：访问 `/f/{id}/display`，确认图片返回正常
7. **3D 地图**：访问 `/map`，检查地图加载（需配置 Cesium token）

---

## 8. 常见问题

### 图片上传失败

- 检查 S3 凭证和 Bucket 权限
- 确认 `S3_ENDPOINT` 格式正确（含 `https://`）
- 查看 Vercel/服务器日志中的错误信息

### 数据库连接失败

- 确认 Supabase 项目状态为 Active
- 检查 `NEXT_PUBLIC_SUPABASE_URL` 是否包含 `https://`
- 确认 RLS 策略已正确配置（迁移脚本会自动设置）

### 地图不显示

- 检查 `NEXT_PUBLIC_CESIUM_ION_TOKEN` 是否有效
- 留空时会回退到 OpenStreetMap（无 3D 建筑）

### 构建内存不足

在 Vercel 中设置：
```
NODE_OPTIONS=--max-old-space-size=4096
```

---

## 9. 备份与恢复

### 数据库备份

- Supabase 开启每日自动备份（免费版保留 7 天，Pro 版支持 PITR）
- 手动导出：Dashboard → Database → Backups → Download

### 对象存储备份

```bash
# R2/S3 同步到本地
aws s3 sync s3://your-bucket ./backup --endpoint-url https://your-r2-endpoint

# 恢复
aws s3 sync ./backup s3://your-bucket --endpoint-url https://your-r2-endpoint
```

### 恢复顺序

1. 恢复数据库（含 `images.s3_key`）
2. 恢复 S3 对象（路径格式：`images/{yyyy}/{mm}/{id}/...`）
