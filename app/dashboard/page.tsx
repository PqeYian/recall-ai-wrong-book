"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  TrendingUp,
  GraduationCap,
  Layers,
  Target,
  ArrowRight
} from "lucide-react";
import { api } from "@/lib/api";
import type { StatsData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [range, setRange] = React.useState<"7d" | "30d">("7d");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.stats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <AppShell active="dashboard">
        <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6">
          <Skeleton className="h-10 w-40" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="mt-4 h-72" />
        </div>
      </AppShell>
    );
  }

  const trend = stats.trend.slice(range === "7d" ? -7 : undefined);
  const nodeColor = (mastery: number) =>
    mastery >= 80 ? "#34C759" : mastery >= 50 ? "#FF9500" : "#FF3B30";

  return (
    <AppShell active="dashboard">
      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-foreground">数据看板</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              已收录 {stats.summary.totalQuestions} 道错题 · 共复习 {stats.summary.totalReviews} 次
            </p>
          </div>
          <div className="flex rounded-lg border border-border bg-card p-1">
            {(["7d", "30d"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  range === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {key === "7d" ? "近 7 天" : "近 30 天"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={<TrendingUp className="h-5 w-5" />} label="本周复习量" value={stats.summary.totalReviews} tone="text-primary" />
          <SummaryCard icon={<GraduationCap className="h-5 w-5" />} label="整体正确率" value={`${stats.summary.overallAccuracy}%`} tone="text-success" />
          <SummaryCard icon={<Target className="h-5 w-5" />} label="今日待复习" value={stats.summary.dueToday} tone="text-warning" />
          <SummaryCard icon={<Layers className="h-5 w-5" />} label="薄弱知识点" value={stats.weakTop.length} tone="text-error" />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>学习趋势</CardTitle>
              <div className="text-xs text-muted-foreground">收录量 · 复习量 · 正确率</div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                    tickFormatter={(value: string) => value.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)"
                    }}
                  />
                  <Line type="monotone" dataKey="added" name="收录" stroke="#007AFF" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reviewed" name="复习" stroke="#34C759" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="accuracy" name="正确率" stroke="#FF9500" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>学科分布</CardTitle>
              <div className="text-xs text-muted-foreground">错题数 · 平均掌握度</div>
            </CardHeader>
            <CardContent>
              {stats.subjects.length ? (
                <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={stats.subjects}
                        dataKey="count"
                        nameKey="subject"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {stats.subjects.map((subject) => (
                          <Cell key={subject.subject} fill={subject.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-card)"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {stats.subjects.map((subject) => (
                      <div key={subject.subject} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
                        <span className="w-12 text-foreground">{subject.subject}</span>
                        <span className="text-muted-foreground">{subject.count} 题</span>
                        <Badge
                          variant={subject.mastery >= 80 ? "success" : subject.mastery >= 50 ? "warning" : "error"}
                          className="ml-auto"
                        >
                          {subject.mastery}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState title="暂无学科数据" description="录入错题后即可查看分布" />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>知识点掌握度图谱</CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-success" />≥80 掌握良好</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-warning" />50-79 需要巩固</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-error" />&lt;50 薄弱</span>
            </div>
          </CardHeader>
          <CardContent>
            {stats.knowledge.length ? (
              <div className="space-y-5">
                {Object.entries(
                  stats.knowledge.reduce<Record<string, typeof stats.knowledge>>((acc, node) => {
                    (acc[node.subject] ??= []).push(node);
                    return acc;
                  }, {})
                ).map(([subject, nodes]) => (
                  <div key={subject}>
                    <p className="mb-2 text-sm font-medium text-foreground">{subject}</p>
                    <div className="flex flex-wrap gap-3">
                      {nodes.map((node) => (
                        <button
                          key={node.id}
                          onClick={() =>
                            router.push(
                              `/?subject=${encodeURIComponent(node.subject)}&knowledgePoint=${encodeURIComponent(node.name)}`
                            )
                          }
                          className="group flex min-w-[160px] items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary/50"
                        >
                          <span
                            className="h-8 w-8 shrink-0 rounded-lg"
                            style={{ backgroundColor: nodeColor(node.mastery) }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">{node.name}</span>
                            <span className="block text-xs text-muted-foreground">
                              {node.mastery}% · {node.questionCount} 题
                            </span>
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="完成第一次复习后即可查看趋势" description="复习数据会生成掌握度图谱" action={<Button onClick={() => router.push("/review")}>去复习</Button>} />
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>薄弱知识点 Top 5</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {stats.weakTop.map((weak, index) => (
                <div key={`${weak.subject}-${weak.name}`} className="flex items-center gap-3 py-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-error/10 text-xs font-semibold text-error">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{weak.name}</p>
                    <p className="text-xs text-muted-foreground">{weak.subject} · {weak.questionCount} 题</p>
                  </div>
                  <Badge variant="error">{weak.mastery}%</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/?subject=${encodeURIComponent(weak.subject)}&knowledgePoint=${encodeURIComponent(weak.name)}`
                      )
                    }
                  >
                    查看
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10", tone)}>
          {icon}
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
