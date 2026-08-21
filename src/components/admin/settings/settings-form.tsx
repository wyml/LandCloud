"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, FieldError, Form, Input, Label, Switch, TextField, toast } from "@heroui/react";
import type { ExternalLinkSettings, SiteSettings } from "@/lib/types";
import { updateExternalLinkSettings, updateSiteSettings } from "@/server/actions/settings";

export function SettingsForm({
  site,
  externalLink,
}: {
  site: SiteSettings;
  externalLink: ExternalLinkSettings;
}) {
  const router = useRouter();
  const [siteState, setSiteState] = useState(site);
  const [linkState, setLinkState] = useState(externalLink);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveSite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateSiteSettings(siteState);
      toast.success("站点信息已保存");
      router.refresh();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "保存失败");
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function saveLinks(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateExternalLinkSettings(linkState);
      toast.success("外链设置已保存");
      router.refresh();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "保存失败");
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">站点信息</h2>
        <Form onSubmit={saveSite} className="flex flex-col gap-4">
          <TextField
            name="name"
            value={siteState.name}
            onChange={(v: string) => setSiteState((s) => ({ ...s, name: v }))}
            isRequired
          >
            <Label>站点名称</Label>
            <Input placeholder="PicBed 个人图床" />
            <FieldError />
          </TextField>
          <TextField
            name="logo"
            value={siteState.logo}
            onChange={(v: string) => setSiteState((s) => ({ ...s, logo: v }))}
          >
            <Label>Logo 图片 URL（可选）</Label>
            <Input placeholder="https://…/logo.png" />
            <FieldError />
          </TextField>
          <TextField
            name="description"
            value={siteState.description}
            onChange={(v: string) => setSiteState((s) => ({ ...s, description: v }))}
          >
            <Label>站点简介</Label>
            <Input placeholder="个人图床相册网站" />
            <FieldError />
          </TextField>
          <TextField
            name="footer"
            value={siteState.footer}
            onChange={(v: string) => setSiteState((s) => ({ ...s, footer: v }))}
          >
            <Label>页脚文案（支持 HTML）</Label>
            <Input placeholder="© PicBed" />
            <FieldError />
          </TextField>
          <p className="text-xs opacity-60">
            支持 HTML 标签，可用于放置访问统计代码、ICP 备案信息等。
          </p>
          <Switch
            isSelected={siteState.defaultPublic}
            onChange={(isSelected: boolean) => setSiteState((s) => ({ ...s, defaultPublic: isSelected }))}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              上传图片默认公开
            </Switch.Content>
          </Switch>
          <p className="text-xs opacity-60">
            开启后，新上传的图片默认为公开状态；关闭则默认为私密状态。
          </p>
          <Switch
            isSelected={siteState.privateMode}
            onChange={(isSelected: boolean) => setSiteState((s) => ({ ...s, privateMode: isSelected }))}
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              私密模式
            </Switch.Content>
          </Switch>
          <p className="text-xs opacity-60">
            开启后，前端界面不展示图片内容，仅显示背景图、标题和副标题。图片分享、外链和详情页不受影响。管理员登录后可见完整内容。
          </p>
          <div>
            <span className="text-sm">首页模板</span>
            <div className="mt-1 flex gap-2">
              {(["classic", "globe"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSiteState((s) => ({ ...s, homepageTemplate: t }))}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    siteState.homepageTemplate === t
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-black"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  {t === "classic" ? "经典 Hero" : "3D 地球"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs opacity-60">
              经典模板：背景图 + 标题；地球模板：沉浸式 3D 虚拟地球，每次随机飞往一个照片地点
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" isDisabled={saving}>
              {saving ? "保存中…" : "保存站点信息"}
            </Button>
          </div>
        </Form>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">外链设置</h2>
        <Form onSubmit={saveLinks} className="flex flex-col gap-4">
          <TextField
            name="directBase"
            value={linkState.directBase}
            onChange={(v: string) => setLinkState((s) => ({ ...s, directBase: v }))}
          >
            <Label>直链域名前缀（S3/CDN 公网地址，可选）</Label>
            <Input placeholder="https://cdn.example.com" />
            <FieldError />
          </TextField>
          <div>
            <Label>默认外链类型</Label>
            <div className="mt-1 flex gap-2">
              {(["proxy", "direct"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLinkState((s) => ({ ...s, defaultType: t }))}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    linkState.defaultType === t
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-black"
                      : "border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  {t === "proxy" ? "代理链接" : "直链"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs opacity-60">
              仅影响外链面板默认选中的链接类型；未配置直链域名时始终回退代理链接。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" isDisabled={saving}>
              {saving ? "保存中…" : "保存外链设置"}
            </Button>
          </div>
        </Form>
      </section>
    </div>
  );
}
