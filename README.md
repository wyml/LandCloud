# PicBed 个人图床相册

个人图床 + 相册展示网站：对外相册展示、图片/相册管理、图片外链获取、3D 地图轨迹。

## 技术栈

- **框架**：Next.js 16+（App Router，Node.js Runtime）
- **UI**：HeroUI v3 + Tailwind CSS v4
- **数据/认证**：Supabase（Postgres + Auth + RLS）
- **对象存储**：通用 S3 协议服务（Cloudflare R2 / AWS S3 / MinIO）
- **图片处理**：sharp（缩略图 / WebP / EXIF）
- **地图**：Cesium 3D 地球
- **部署**：Vercel

## 文档

- 产品需求：`docs/PRD.md`
- 里程碑规划：`docs/MILESTONES.md`

## 开发

```bash
cp .env.example .env.local   # 填入真实配置
npm install
npm run dev                  # http://localhost:3000
```

## 常用命令

| 命令                | 说明                    |
| ------------------- | ----------------------- |
| `npm run dev`       | 开发服务器（Turbopack） |
| `npm run build`     | 生产构建                |
| `npm run lint`      | ESLint 检查             |
| `npm run typecheck` | TypeScript 类型检查     |
| `npm run format`    | Prettier 格式化         |
