"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenText,
  KeyRound,
  Loader2,
  LogIn,
  MailCheck,
  UserPlus
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [loginView, setLoginView] = React.useState<
    "password" | "otp" | "forgot"
  >("password");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [needsConfirm, setNeedsConfirm] = React.useState(false);
  const [confirmCode, setConfirmCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setLoginView("password");
    setNeedsConfirm(false);
    setOtpSent(false);
  };

  const goHome = () => {
    const next =
      new URLSearchParams(window.location.search).get("next") ?? "/";
    router.replace(next);
    router.refresh();
  };

  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.login(email, password);
      goHome();
    } catch (error) {
      toast({
        type: "error",
        title: "登录失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api.register(email, password, name);
      if (result.needsEmailConfirmation) {
        setNeedsConfirm(true);
        toast({
          type: "success",
          title: "注册成功",
          description: "确认信已发送，请到邮箱查收验证码"
        });
        return;
      }
      goHome();
    } catch (error) {
      toast({
        type: "error",
        title: "注册失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (!otpSent) {
        await api.sendOtp(email);
        setOtpSent(true);
        toast({
          type: "success",
          title: "验证码已发送",
          description: "请到邮箱查收 6 位验证码"
        });
      } else {
        await api.verifyOtp(email, otpCode, "email");
        goHome();
      }
    } catch (error) {
      toast({
        type: "error",
        title: otpSent ? "验证码登录失败" : "发送失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(email);
      toast({
        type: "success",
        title: "重置邮件已发送",
        description: "请到邮箱点击链接设置新密码"
      });
    } catch (error) {
      toast({
        type: "error",
        title: "发送失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSignup = async () => {
    setLoading(true);
    try {
      await api.verifyOtp(email, confirmCode, "signup");
      toast({
        type: "success",
        title: "邮箱验证成功",
        description: "已自动登录"
      });
      goHome();
    } catch (error) {
      toast({
        type: "error",
        title: "验证失败",
        description: error instanceof Error ? error.message : "验证码错误或已过期"
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

  const switchLink =
    "text-sm font-medium text-primary hover:underline";

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
              onClick={() => switchMode("login")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              注册
            </button>
          </div>

          {mode === "login" && loginView === "password" && (
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱"
                required
                autoComplete="email"
              />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                required
                minLength={6}
                autoComplete="current-password"
              />
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => setLoginView("forgot")} className={switchLink}>
                  忘记密码？
                </button>
                <button type="button" onClick={() => setLoginView("otp")} className={switchLink}>
                  验证码登录
                </button>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                登录
              </Button>
            </form>
          )}

          {mode === "login" && loginView === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱"
                required
              />
              {otpSent ? (
                <>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="6 位验证码"
                    required
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                    验证并登录
                  </Button>
                </>
              ) : (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                  发送验证码
                </Button>
              )}
              <button
                type="button"
                onClick={() => {
                  setLoginView("password");
                  setOtpSent(false);
                }}
                className={switchLink + " w-full"}
              >
                返回密码登录
              </button>
            </form>
          )}

          {mode === "login" && loginView === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                输入注册邮箱，我们会发送一封重置密码邮件。
              </p>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱"
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                发送重置邮件
              </Button>
              <button
                type="button"
                onClick={() => setLoginView("password")}
                className={switchLink + " w-full"}
              >
                返回登录
              </button>
            </form>
          )}

          {mode === "register" && (
            <>
              <form onSubmit={handleRegister} className="space-y-3">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="昵称"
                  required
                />
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
                  placeholder="密码（至少 6 位）"
                  required
                  minLength={6}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  注册
                </Button>
              </form>
              {needsConfirm && (
                <div className="mt-3 space-y-3 rounded-lg border border-border p-3">
                  <p className="text-sm text-muted-foreground">
                    注册成功！请到邮箱查收确认信（发件人 2017617345@qq.com），把邮件里的{" "}
                    <span className="font-medium text-foreground">6 位验证码</span>{" "}
                    填到下面完成验证：
                  </p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    placeholder="6 位验证码"
                  />
                  <Button
                    className="w-full"
                    onClick={handleConfirmSignup}
                    disabled={loading || !confirmCode}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                    验证并登录
                  </Button>
                </div>
              )}
            </>
          )}

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
