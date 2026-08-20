import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PIXEL_PNG, requireE2E, uniqueName } from "./helpers";

/**
 * 六条关键路径：登录 → 上传 → 建相册 → 前台访问 → 分享密码 → 外链代理。
 * 依赖一套可用的环境（Supabase + S3 + 管理员账号 + 运行中的服务）。
 */
test.describe.serial("关键路径冒烟", () => {
  const state = { imageId: "", imageName: "", albumName: "" };

  test("1. 管理员登录", async ({ page }) => {
    requireE2E();
    await page.goto("/admin/login");
    await page.getByLabel("邮箱").fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel("密码").fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "登录" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "仪表盘" })).toBeVisible();
  });

  test("2. 上传图片", async ({ page }) => {
    requireE2E();
    state.imageName = uniqueName("e2e-pixel");
    await page.goto("/admin/images");
    await page.getByRole("button", { name: "上传图片" }).click();
    await page.setInputFiles('input[type="file"]', {
      name: `${state.imageName}.png`,
      mimeType: "image/png",
      buffer: PIXEL_PNG,
    });
    await page.getByRole("button", { name: /开始上传/ }).click();
    await expect(page.getByText("✅ 完成").or(page.getByText("⚠️ 已存在"))).toBeVisible({
      timeout: 90_000,
    });

    const img = page.locator('img[src*="/thumb_md"]').first();
    await expect(img).toBeVisible({ timeout: 30_000 });
    const src = await img.getAttribute("src");
    const match = src?.match(/\/f\/([^/]+)\/thumb_md/);
    expect(match, "未从列表提取到图片 id").not.toBeNull();
    state.imageId = match![1];
  });

  test("3. 创建相册并在前台可见", async ({ page }) => {
    requireE2E();
    state.albumName = uniqueName("e2e-album");
    await page.goto("/admin/albums");
    await page.getByPlaceholder("相册名称 *").fill(state.albumName);
    await page.getByRole("button", { name: "创建相册" }).click();
    await expect(page.getByText(state.albumName)).toBeVisible();

    await page.goto("/albums");
    await expect(page.getByText(state.albumName)).toBeVisible();
  });

  test("4. 前台访问相册与图片详情", async ({ page }) => {
    requireE2E();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto(`/images/${state.imageId}`);
    await expect(page.getByText(state.imageName)).toBeVisible();
  });

  test("5. 分享密码流程", async ({ page }) => {
    requireE2E();
    const password = "e2e-secret-123";
    await page.goto("/admin/shares");
    await page.locator("select").first().selectOption("image");
    await page.locator("select").nth(1).selectOption({ label: state.imageName });
    await page.getByPlaceholder("访问密码（留空表示免密）").fill(password);
    await page.getByRole("button", { name: "创建分享" }).click();

    const link = page.locator('a[href^="/s/"]').last();
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).not.toBeNull();

    await page.goto(href!);
    await page.getByPlaceholder("访问密码").fill(password);
    await page.getByRole("button", { name: "进入" }).click();
    await expect(page.getByText(state.imageName)).toBeVisible({ timeout: 15_000 });
  });

  test("6. 外链代理", async ({ request }) => {
    requireE2E();
    await expect
      .poll(async () => (await request.get(`/f/${state.imageId}/thumb_sm`)).status(), {
        timeout: 120_000,
        intervals: [2_000, 5_000],
      })
      .toBe(200);

    const res = await request.get(`/f/${state.imageId}/thumb_sm`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/webp");
    expect(res.headers()["cache-control"]).toContain("immutable");

    const missing = await request.get(`/f/${randomUUID()}/thumb_sm`);
    expect(missing.status()).toBe(404);
  });
});
