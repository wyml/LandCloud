import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

const TABLES = [
  "profiles",
  "app_config",
  "albums",
  "images",
  "album_images",
  "tags",
  "image_tags",
  "shares",
  "site_settings",
];

function readMigration(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), "utf8");
}

/** 无策略 = 默认拒绝一切（deny-all），属有意为之的受控表。 */
const DENY_ALL_TABLES = ["app_config"];

describe("RLS 安全策略（0001_init.sql）", () => {
  const sql = readMigration("0001_init.sql");

  it("所有业务表启用行级安全（RLS）", () => {
    for (const table of TABLES) {
      expect(
        sql.includes(`alter table public.${table} enable row level security;`),
        `${table} 未启用 RLS`,
      ).toBe(true);
    }
  });

  it("存在 is_admin() 校验函数", () => {
    expect(sql).toContain("create or replace function public.is_admin()");
  });

  it("除受控表外，每张表至少有一个 RLS 策略；受控表为默认拒绝", () => {
    for (const table of TABLES) {
      if (DENY_ALL_TABLES.includes(table)) {
        expect(sql.includes(`on public.${table}`), `${table} 应保持默认拒绝（无策略）`).toBe(false);
      } else {
        expect(sql.includes(`on public.${table}`), `${table} 没有策略定义`).toBe(true);
      }
    }
  });

  it("每张可访问表都有基于 is_admin() 的管理员授权策略", () => {
    for (const table of TABLES) {
      if (DENY_ALL_TABLES.includes(table)) continue;
      const pattern = new RegExp(
        `create policy "[^"]+" on public\\.${table}\\s+for (select|insert|update|delete|all)[\\s\\S]*?;`,
        "g",
      );
      const blocks = [...sql.matchAll(pattern)].map((m) => m[0]);
      expect(blocks.length, `${table} 缺少策略`).toBeGreaterThan(0);
      const hasAdmin = blocks.some((b) => b.includes("is_admin()"));
      expect(hasAdmin, `${table} 所有策略均未引用 is_admin()`).toBe(true);
    }
  });

  it("不向 anon 角色显式授予特权", () => {
    const grants = sql.split("\n").filter((line) => /^grant\s+/i.test(line.trim()));
    expect(grants).toEqual([]);
  });
});

describe("后续 migration 完整性", () => {
  it("所有 migration 文件均可被读取且非空", () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const file of files) {
      expect(readMigration(file).trim().length).toBeGreaterThan(0);
    }
  });

  it("密码相关字段使用哈希（不存明文）", () => {
    const sql = readMigration("0003_album_password.sql");
    expect(sql.toLowerCase()).toContain("password_hash");
    expect(sql.toLowerCase()).not.toContain("password text");
  });
});
