"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

// 重置密码页面：从重置邮件链接的 #access_token 拿到 recovery token，
// 让用户输入新密码，提交给 /api/auth/reset-password 完成修改。
export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    // Supabase 的重置链接形如 /reset-password#access_token=xxx&type=recovery
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get("access_token");
    if (!accessToken) {
      toast({
        type: "error",
        title: "链接无效",
        description: "请返回登录页重新申请重置邮件"
      });
      return;
    }
    setToken(accessToken);
  }, [toast]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast({
        type: "error",
        title: "两次输入不一致",
        description: "请重新输入新密码"
      });
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      toast({
        type: "success",
        title: "密码已重置",
        description: "请用新密码登录"
      });
      router.replace("/login");
    } catch (error) {
      toast({
        type: "error",
        title: "重置失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <CardTitle>重置密码</CardTitle>
          <CardDescription>设置一个新密码</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="新密码（至少 6 位）"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="再次输入新密码"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              确认修改
            </Button>
          </form>
          {!token && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              链接无效或已过期，请到登录页重新点击「忘记密码」
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
