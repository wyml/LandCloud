# Supabase 配置说明

## 1. 创建项目

在 [supabase.com](https://supabase.com) 创建项目，将以下值填入 `.env.local`：

- Project Settings → API：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`（anon public）
  - `SUPABASE_SERVICE_ROLE_KEY`（service_role，**仅服务端**）

## 2. 应用数据库结构

方式 A（推荐，本地 CLI）：

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

方式 B：将 `migrations/` 下的 SQL 依次粘贴到 Supabase SQL Editor 执行。

## 3. 配置管理员（重要）

数据库 RLS 通过 `app_config.admin_email` 判定管理员。应用 migration 后执行：

```sql
update public.app_config
set value = '你的管理员邮箱'
where key = 'admin_email';
```

同时在 `.env.local` 中保持 `ADMIN_EMAIL` 与之一致。

## 4. 创建管理员账号

Supabase Dashboard → Authentication → Users → Add user（邮箱 + 密码），
邮箱必须与上述管理员邮箱一致。本项目关闭公开注册（无需开启任何 Provider）。

建议：Authentication → Settings 中关闭 "Allow signups"。
