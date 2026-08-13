"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookOpenText, Loader2, LogIn, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(email, password, name);
      if (
        mode === "register" &&
        "needsEmailConfirmation" in result &&
        result.needsEmailConfirmation
      ) {
        toast({
          type: "success",
          title: "注册成功",
          description: "请查收确认邮件后再登录"
        });
        return;
      }
      const next =
        new URLSearchParams(window.location.search).get("next") ?? "/";
      router.replace(next);
      router.refresh();
    } catch (error) {
      toast({
        type: "error",
        title: mode === "login" ? "登录失败" : "注册失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    setLoading(true);
    try {
      await api.login("demo@recall.app", "recall123");
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast({
        type: "error",
        title: "演示登录失败",
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
          <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpenText className="h-6 w-6" />
          </span>
          <CardTitle>Recall · AI 智能错题本</CardTitle>
          <CardDescription>
            把整理错题的时间还给学习，把复习交给科学算法
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              注册
            </button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "register" ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="昵称"
                required
              />
            ) : null}
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱"
              required
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              required
              minLength={6}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {mode === "login" ? "登录" : "注册"}
            </Button>
          </form>
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={demoLogin}
            disabled={loading}
          >
            使用演示账号进入
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
