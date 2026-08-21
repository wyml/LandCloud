<p align="center">
  <img src="public/logo.png" alt="LandCloud" width="360" />
</p>

<h1 align="center">LandCloud</h1>

<p align="center">
  <strong>个人图床 · 相册展示 · 3D 地图轨迹</strong>
</p>

<p align="center">
  一个开源自托管的图片管理与展示平台，将你的照片与地理位置可视化呈现。
</p>

<p align="center">
  <a href="#-功能特性">功能特性</a> · <a href="#-快速开始">快速开始</a> · <a href="#-技术栈">技术栈</a> · <a href="#-部署">部署</a> · <a href="#-文档">文档</a>
</p>

---

## 功能特性

### 图片管理

- **拖拽上传** — 支持批量上传，自动识别 Google/三星/小米/OPPO/vivo 动态照片（Live Photo）
- **智能处理** — 自动生成 WebP 展示图 + 三级缩略图，提取 EXIF/GPS 元数据
- **多种可见性** — 公开 / 私密 / 密码保护 / 隐藏 四种模式
- **图片外链** — 一键获取 Markdown / HTML / BBCode / URL 格式外链，支持代理链接和 CDN 直链

### 相册展示

- **沉浸式首页** — 全屏随机背景图 + 站点标题副标题
- **瀑布流画廊** — 响应式网格布局，无限滚动加载，Lightbox 大图浏览
- **密码分享** — 生成加密分享链接，支持设置过期时间，HMAC 签名安全验证
- **私密模式** — 一键开启全站隐私保护，仅展示背景图和标题，管理员不受限

### 3D 地球

- **Cesium 地球** — 照片以点聚合形式展示在 3D 地球上，自动飞行到拍摄地点
- **轨迹浏览** — 按时间线浏览照片拍摄轨迹
- **聚合交互** — 点击聚合点展开查看照片缩略图预览

### 其他

- **暗色模式** — 自动跟随系统或手动切换
- **全文搜索** — 按标题、描述、文件名、标签、年份搜索
- **标签系统** — 灵活的标签管理，支持批量操作
- **浏览统计** — 图片和相册浏览量统计
- **后台管理** — 完整的管理后台，支持图片/相册/标签/分享/站点设置

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16+（App Router，Turbopack） |
| UI | HeroUI v3 + Tailwind CSS v4 |
| 数据库 | Supabase（PostgreSQL + Auth + RLS） |
| 存储 | S3 兼容（Cloudflare R2 / AWS S3 / MinIO） |
| 图片处理 | sharp（缩略图 / WebP / EXIF） |
| 地图 | Cesium 3D 地球 |
| 部署 | Vercel / Docker / PM2 |

---

## 快速开始

### 前置条件

- Node.js 18+
- [Supabase](https://supabase.com/) 项目
- S3 兼容存储（推荐 [Cloudflare R2](https://www.cloudflare.com/products/r2/)）

### 安装

```bash
git clone https://github.com/wyml/LandCloud.git
cd LandCloud
cp .env.example .env.local   # 填入你的配置
npm install
npm run dev
```

访问 `http://localhost:3000`。

### 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase 服务端密钥 |
| `ADMIN_EMAIL` | ✅ | 管理员邮箱 |
| `S3_ENDPOINT` | ✅ | S3 端点 |
| `S3_BUCKET` | ✅ | Bucket 名称 |
| `S3_ACCESS_KEY_ID` | ✅ | S3 Access Key |
| `S3_SECRET_ACCESS_KEY` | ✅ | S3 Secret Key |
| `S3_PUBLIC_BASE` | | CDN 直链域名 |
| `NEXT_PUBLIC_SITE_URL` | | 站点公网地址 |
| `SESSION_SECRET` | | Cookie 签名密钥 |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | | Cesium Ion token |

完整说明见 [`.env.example`](.env.example)。

### 数据库初始化

在 Supabase SQL Editor 中按顺序执行 `supabase/migrations/` 下的迁移脚本，或使用 CLI：

```bash
supabase db push
```

---

## 部署

详见 [部署指南](docs/DEPLOY.md)。

### Vercel（推荐）

1. 推送仓库到 GitHub
2. 在 Vercel 中 Import 项目
3. 配置环境变量
4. 部署

### Docker

```bash
docker build -t landcloud .
docker run -p 3000:3000 --env-file .env.local landcloud
```

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test` | 单元/集成测试 |
| `npm run test:e2e` | E2E 测试 |

---

## 文档

| 文档 | 说明 |
|------|------|
| [产品需求](docs/PRD.md) | 功能需求与设计 |
| [里程碑规划](docs/MILESTONES.md) | 开发计划与进度 |
| [安全清单](docs/SECURITY.md) | 安全策略 |
| [部署指南](docs/DEPLOY.md) | 生产环境部署 |

---

## 项目结构

```
src/
├── app/
│   ├── (home)/          # 首页
│   ├── (site)/          # 公开站点（相册/图片/标签/搜索）
│   ├── (globe)/         # 3D 地球
│   ├── admin/           # 后台管理
│   ├── api/             # API 路由
│   ├── f/[id]/[variant] # 图片代理
│   └── s/[share_id]/    # 分享页
├── components/
│   ├── admin/           # 后台组件
│   ├── shared/          # 公共组件
│   └── site/            # 前台组件
├── lib/                 # 工具库
├── server/
│   ├── actions/         # Server Actions
│   └── queries/         # Server Queries
└── types/               # 类型声明
```

---

## 备份

- **数据库**：Supabase 自动备份（Pro 版支持 PITR）
- **对象存储**：S3 开启版本控制，定期 `aws s3 sync` 归档

---

## 许可证

[MIT](LICENSE)
