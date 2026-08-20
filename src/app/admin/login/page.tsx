"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    const next = searchParams.get("next");
    router.replace(next && next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>管理员登录</CardTitle>
      </CardHeader>
      <CardContent>
        <Form onSubmit={onSubmit} className="flex flex-col gap-4">
          <TextField name="email" type="email" isRequired>
            <Label>邮箱</Label>
            <Input placeholder="admin@example.com" autoComplete="email" />
            <FieldError />
          </TextField>
          <TextField name="password" type="password" isRequired>
            <Label>密码</Label>
            <Input autoComplete="current-password" />
            <FieldError />
          </TextField>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" isDisabled={loading}>
            {loading ? "登录中…" : "登录"}
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
