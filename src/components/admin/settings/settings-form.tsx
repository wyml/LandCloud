"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Checkbox, FieldError, Form, Input, Label, TextField } from "@heroui/react";
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
  const [siteStatus, setSiteStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [linkStatus, setLinkStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function saveSite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSiteStatus("saving");
    try {
      await updateSiteSettings(siteState);
      setSiteStatus("saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      setSiteStatus("idle");
    }
  }

  async function saveLinks(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLinkStatus("saving");
    try {
      await updateExternalLinkSettings(linkState);
      setLinkStatus("saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      setLinkStatus("idle");
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">上传图片默认公开</p>
              <p className="text-xs opacity-60">
                开启后，新上传的图片默认为公开状态；关闭则默认为私密状态。
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={siteState.defaultPublic}
              onClick={() => setSiteState((s) => ({ ...s, defaultPublic: !s.defaultPublic }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 ${
                siteState.defaultPublic ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-200 dark:bg-neutral-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  siteState.defaultPublic ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" isDisabled={siteStatus === "saving"}>
              {siteStatus === "saving" ? "保存中…" : "保存站点信息"}
            </Button>
            {siteStatus === "saved" ? (
              <span className="text-sm text-green-600">已保存 ✓</span>
            ) : null}
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
            <Button type="submit" variant="primary" isDisabled={linkStatus === "saving"}>
              {linkStatus === "saving" ? "保存中…" : "保存外链设置"}
            </Button>
            {linkStatus === "saved" ? (
              <span className="text-sm text-green-600">已保存 ✓</span>
            ) : null}
          </div>
        </Form>
      </section>
    </div>
  );
}
