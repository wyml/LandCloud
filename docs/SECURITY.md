# 安全清单核查

> 对应里程碑 M9。每项给出实现位置与核查结论。
> 自检时间：2026-08-21（M9 代码冻结前）。

## 1. 数据库访问控制（RLS）

| 项                 | 结论 | 实现                                                                      |
| ------------------ | ---- | ------------------------------------------------------------------------- |
| 全部业务表启用 RLS | ✅   | `supabase/migrations/0001_init.sql`（9 张表 `enable row level security`） |
| 非公开数据默认拒绝 | ✅   | 默认 deny-all；`app_config` 无策略 = 完全拒绝（仅 service_role 可操作）   |
| 写入仅限管理员     | ✅   | 所有 DML 策略均含 `is_admin()`；`0001_init.sql`                           |
| 公开数据只读策略   | ✅   | `albums/images/album_images/image_tags/site_settings` 的 select 策略      |
| 策略回归测试       | ✅   | `src/lib/security/rls.test.ts`（解析 migration 断言 7 项）                |

## 2. 密钥与角色

| 项                          | 结论 | 实现                                                                            |
| --------------------------- | ---- | ------------------------------------------------------------------------------- |
| service_role 未泄露到客户端 | ✅   | 仅 `src/lib/supabase/admin.ts`（`server-only`）使用 `SUPABASE_SERVICE_ROLE_KEY` |
| 客户端仅用 anon key         | ✅   | `src/lib/supabase/client.ts`                                                    |
| 环境变量不被构建期打包      | ✅   | `server-only` 标记 + Next 服务端变量；`.env*` 已 gitignore                      |

## 3. 上传与存储

| 项                                          | 结论 | 实现                                                                     |
| ------------------------------------------- | ---- | ------------------------------------------------------------------------ |
| 预签名限制（≤50MB / 10 分钟 / MIME 白名单） | ✅   | `src/app/api/upload/presign/route.ts`、`src/lib/images/variants.ts`      |
| MIME 魔数校验                               | ✅   | `detectMimeByMagic()` 在 complete 阶段校验；`src/lib/images/variants.ts` |
| 重复上传去重                                | ✅   | SHA-256 比对返回 duplicate；`src/app/api/upload/complete/route.ts`       |
| 路径不可被篡改                              | ✅   | 处理流水线由服务端生成 key，不含用户输入目录段                           |

## 4. 代理与分享（/f、/s）

| 项                              | 结论 | 实现                                                   |
| ------------------------------- | ---- | ------------------------------------------------------ |
| 私密内容 404 语义               | ✅   | `/f` 未授权一律 404，不泄露存在性                      |
| 权限分支单测                    | ✅   | `src/lib/images/access.ts` + `access.test.ts`（11 项） |
| 公开图强缓存、私密 no-store     | ✅   | `proxyCacheControl()`；单测覆盖                        |
| 分享密码限频（5 次/分/IP）      | ✅   | `src/lib/rate-limit.ts` + `rate_limits` 表（`0004`）   |
| 分享 cookie HMAC 签名 + 24h TTL | ✅   | `src/lib/security.ts`（13 项单测）                     |
| 相册密码 scrypt 哈希            | ✅   | `hashAlbumPassword()`（salt=`picbed-album-{id}`）      |
| 过期/撤销即时失效               | ✅   | 查询时校验 `revoked`/`expires_at`，无需定时任务        |

## 5. 其它

| 项                                    | 结论 | 实现                                                 |
| ------------------------------------- | ---- | ---------------------------------------------------- |
| 未登录访问后台跳登录；非管理员 403 页 | ✅   | `requireAdmin()`；`/admin/forbidden`                 |
| 搜索引擎屏蔽后台/代理/分享            | ✅   | `robots.ts` disallow `/admin /f /s /api/`            |
| 响应头安全                            | ✅   | `/f` 设置 `X-Content-Type-Options: nosniff`          |
| 页面错误不泄露堆栈                    | ✅   | 自定义 `error.tsx`/`global-error.tsx`，仅显示 digest |

## 6. 上线前待办（需真实环境操作）

- [ ] Vercel 正式域名 + 生产环境变量（`.env.example` 逐项填写）
- [ ] Supabase 生产项目 + 自动备份确认
- [ ] S3 生产桶开启版本控制（防误删恢复）
- [ ] 直传域名 CORS 白名单（仅允许站点域名 PUT）
- [ ] 运行一次 E2E 冒烟（见 README「E2E」）
- [ ] `SESSION_SECRET` 更换为随机长字符串
