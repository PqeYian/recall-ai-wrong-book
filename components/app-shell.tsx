"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpenText,
  LayoutDashboard,
  CalendarDays,
  CircleHelp,
  Plus,
  Search,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ChevronDown,
  UserRound
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";

type ActiveKey =
  | "home"
  | "dashboard"
  | "plans"
  | "help"
  | "chat"
  | "new"
  | "review";

const NAV_ITEMS: Array<{ key: ActiveKey; label: string; href: string; icon: React.ElementType }> = [
  { key: "home", label: "首页", href: "/", icon: BookOpenText },
  { key: "dashboard", label: "数据看板", href: "/dashboard", icon: LayoutDashboard },
  { key: "plans", label: "复习计划", href: "/plans", icon: CalendarDays },
  { key: "help", label: "帮助中心", href: "/help", icon: CircleHelp }
];

export function AppShell({
  active,
  children,
  left,
  className
}: {
  active: ActiveKey;
  children: React.ReactNode;
  left?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [userMenu, setUserMenu] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [userName, setUserName] = React.useState("小昭");
  const [dark, setDark] = React.useState(false);
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    api.me().then((res) => {
      if (!res.user) {
        router.replace("/login");
        return;
      }
      if (res.user) setUserName(res.user.name);
    }).catch(() => {
      router.replace("/login");
    });
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("recall-theme", next ? "dark" : "light");
  };

  const logout = async () => {
    try {
      await api.logout();
      router.replace("/login");
    } catch {
      toast({ type: "error", title: "退出失败，请重试" });
    }
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    try {
      const res = await api.updateName(trimmed);
      setUserName(res.name);
      setEditingName(false);
      setUserMenu(false);
      toast({ type: "success", title: "昵称已更新" });
    } catch (error) {
      toast({
        type: "error",
        title: "修改失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    }
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    router.push(`/?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-border bg-card/90 backdrop-blur">
        <div className="flex h-full items-center gap-2 px-3 sm:gap-4 sm:px-5">
          <button
            className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="打开菜单"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              R
            </span>
            <span className="text-lg font-semibold tracking-normal">Recall</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active === item.key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <form onSubmit={submitSearch} className="hidden w-52 lg:block">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索错题"
                  className="h-9 pl-9"
                />
              </div>
            </form>
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push("/new")}
              className="hidden sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
              录入错题
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="切换深色模式"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="relative">
              <button
                className="flex h-9 items-center gap-2 rounded-lg px-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => setUserMenu((v) => !v)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {userName.slice(0, 1)}
                </span>
                <span className="hidden max-w-[80px] truncate sm:block">{userName}</span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
              </button>
              {userMenu ? (
                <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-border bg-card p-1">
                  {editingName ? (
                    <div className="space-y-2 p-2">
                      <Input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        placeholder="新昵称"
                        maxLength={20}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={saveName}
                          disabled={!nameDraft.trim()}
                        >
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingName(false)}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setNameDraft(userName);
                          setEditingName(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <UserRound className="h-4 w-4" />
                        修改昵称
                      </button>
                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-error hover:bg-error/10"
                      >
                        <LogOut className="h-4 w-4" />
                        退出登录
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {mobileOpen && left ? (
        <div className="fixed inset-x-0 top-14 z-30 max-h-[70vh] overflow-y-auto border-b border-border bg-background p-3 md:hidden">
          {left}
        </div>
      ) : null}

      <div className="flex pt-14">
        {left ? (
          <aside className="hidden w-[260px] shrink-0 border-r border-border bg-card/50 p-4 md:block">
            <div className="scrollbar-thin sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto">
              {left}
            </div>
          </aside>
        ) : null}
        <main className={cn("min-w-0 flex-1", className)}>{children}</main>
      </div>
    </div>
  );
}
