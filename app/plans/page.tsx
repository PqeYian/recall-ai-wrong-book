"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Bell,
  Clock,
  Play,
  Save,
  Target,
  ListTodo
} from "lucide-react";
import { api } from "@/lib/api";
import type { PlansData } from "@/lib/types";
import { formatShortDate, dueLabel } from "@/lib/date";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

export default function PlansPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [plans, setPlans] = React.useState<PlansData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reminderTime, setReminderTime] = React.useState("20:00");
  const [notifyEnabled, setNotifyEnabled] = React.useState(false);
  const [examDate, setExamDate] = React.useState("");
  const [examDays, setExamDays] = React.useState(7);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await api.plans();
      setPlans(data);
      setReminderTime(data.settings.reminderTime);
      setNotifyEnabled(data.settings.notifyEnabled);
      setExamDate(data.settings.examDate ?? "");
      setExamDays(data.settings.examDays);
    } catch (error) {
      toast({
        type: "error",
        title: "加载计划失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.updatePlanSettings({
        reminderTime,
        notifyEnabled,
        examDate: examDate || undefined,
        examDays
      });
      toast({ type: "success", title: "复习设置已保存" });
      await load();
    } catch (error) {
      toast({
        type: "error",
        title: "保存失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !plans) {
    return (
      <AppShell active="plans">
        <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6">
          <Skeleton className="h-10 w-40" />
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-40 lg:col-span-1" />
            <Skeleton className="h-40 lg:col-span-2" />
          </div>
        </div>
      </AppShell>
    );
  }

  const maxCount = Math.max(1, ...plans.next7.map((d) => d.count));

  return (
    <AppShell active="plans">
      <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-foreground">复习计划</h1>
            <p className="mt-1 text-sm text-muted-foreground">SM-2 自动调度 · 到期即复习</p>
          </div>
          <Button onClick={() => router.push("/review")}>
            <Play className="h-4 w-4" />
            开始今日复习
          </Button>
        </div>

        {plans.dueToday > 50 ? (
          <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            今日题量较大（{plans.dueToday} 题），建议按知识点分组完成。
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                今日到期
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-5xl font-semibold text-foreground">{plans.dueToday}</p>
              <p className="mt-2 text-sm text-muted-foreground">道错题今日需要复习</p>
              <Button className="mt-4 w-full" onClick={() => router.push("/review")} disabled={!plans.dueToday}>
                <Play className="h-4 w-4" />
                开始复习
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>未来 7 天到期分布</CardTitle>
              <div className="text-xs text-muted-foreground">按到期日期聚合，柱高代表题目数量</div>
            </CardHeader>
            <CardContent>
              <div className="flex h-40 items-end gap-3">
                {plans.next7.map((day) => (
                  <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-xs font-medium text-foreground">{day.count || ""}</span>
                    <div
                      className="w-full max-w-[42px] rounded-t-lg bg-primary/70 transition-all"
                      style={{ height: `${Math.max(4, (day.count / maxCount) * 100)}%` }}
                      title={`${formatShortDate(day.date)} ${day.count} 题`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {day.date === new Date().toISOString().slice(0, 10) ? "今天" : day.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>周度计划</CardTitle>
              <div className="text-xs text-muted-foreground">本周每日到期量 · 建议时长</div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {plans.weekly.map((day) => (
                  <div key={day.date} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="w-20 text-muted-foreground">{day.date.slice(5)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-success"
                        style={{ width: `${Math.min(100, (day.count / maxCount) * 100)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-foreground">{day.count} 题</span>
                    <span className="w-20 text-right text-xs text-muted-foreground">约 {day.minutes} 分钟</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                考前计划
              </CardTitle>
              <div className="text-xs text-muted-foreground">考前 N 天按掌握度升序分批排期</div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">目标考试日期</p>
                  <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">提前天数</p>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={examDays}
                    onChange={(e) => setExamDays(Math.min(30, Math.max(1, Number(e.target.value))))}
                  />
                </div>
              </div>
              <Button className="mt-4 w-full" variant="outline" onClick={saveSettings} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "保存中…" : "保存并重新排期"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              计划列表
            </CardTitle>
            <div className="text-xs text-muted-foreground">按到期日分组，点击开始复习</div>
          </CardHeader>
          <CardContent>
            {plans.upcomingQuestions.length ? (
              <div className="space-y-4">
                {plans.upcomingQuestions.map((group) => (
                  <div key={group.date}>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="secondary">{dueLabel(group.date)}</Badge>
                      <span className="text-xs text-muted-foreground">{formatShortDate(group.date)}</span>
                    </div>
                    <div className="space-y-2">
                      {group.questions.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => router.push("/review")}
                          className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left text-sm transition-colors hover:border-primary/50"
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: q.subject === "数学" ? "#007AFF" : q.subject === "英语" ? "#34C759" : q.subject === "物理" ? "#FF9500" : "#AF52DE" }} />
                          <span className="min-w-0 flex-1 truncate text-foreground">{q.stem}</span>
                          <Badge variant="secondary">{q.subject}</Badge>
                          <Badge variant={q.mastery >= 60 ? "success" : "warning"}>{q.mastery}%</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">近期暂无计划题目</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              复习提醒
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                每日提醒时间
              </div>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-32"
              />
              <div className="flex items-center gap-3">
                <Switch
                  checked={notifyEnabled}
                  onCheckedChange={setNotifyEnabled}
                  label="浏览器通知"
                />
                <span className="text-sm text-muted-foreground">浏览器通知</span>
              </div>
              <Button variant="outline" size="sm" onClick={saveSettings} disabled={saving}>
                <Save className="h-4 w-4" />
                保存提醒
              </Button>
            </div>
            {!notifyEnabled ? (
              <p className="mt-3 text-xs text-muted-foreground">
                未授权通知时将降级为站内提醒，在帮助中心可查看提醒说明。
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
