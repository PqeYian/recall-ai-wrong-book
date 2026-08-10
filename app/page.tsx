"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Camera,
  ClipboardType,
  Filter,
  RotateCcw,
  Trash2,
  FileDown,
  Loader2,
  BookOpenText
} from "lucide-react";
import { api } from "@/lib/api";
import type { Notebook, Question } from "@/lib/types";
import { AppShell } from "@/components/app-shell";
import { NotebookSidebar } from "@/components/notebook-sidebar";
import { QuestionCard, type QuestionRow } from "@/components/question-card";
import { ExportDialog } from "@/components/export-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

const SUBJECTS = ["数学", "英语", "物理", "化学", "语文", "生物"];
const LEVELS = ["待复习", "即将到期", "远期", "已掌握", "已暂停"];

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [notebooks, setNotebooks] = React.useState<Notebook[]>([]);
  const [items, setItems] = React.useState<QuestionRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false);
  const [onboardingOpen, setOnboardingOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({
    search: "",
    subject: "",
    knowledgePoint: "",
    notebookId: "",
    reviewLevel: "",
    timeRange: "",
    sort: "due"
  });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters((f) => ({
      ...f,
      search: params.get("q") ?? "",
      subject: params.get("subject") ?? "",
      knowledgePoint: params.get("knowledgePoint") ?? "",
      notebookId: params.get("notebookId") ?? ""
    }));
  }, []);

  React.useEffect(() => {
    api.plans().then((plans) => {
      if (!plans.settings.onboardingDone) setOnboardingOpen(true);
    }).catch(() => {});
  }, []);

  const loadNotebooks = React.useCallback(async () => {
    try {
      setNotebooks(await api.notebooks());
    } catch {
      // The question list still renders when notebook loading fails.
    }
  }, []);

  React.useEffect(() => {
    loadNotebooks();
  }, [loadNotebooks, refreshKey]);

  React.useEffect(() => {
    setPage(1);
  }, [filters]);

  React.useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.questions({
          ...filters,
          page,
          pageSize: 20
        });
        if (cancelled) return;
        setItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
        setTotal(data.total);
      } catch (error) {
        if (!cancelled) {
          toast({
            type: "error",
            title: "加载错题失败",
            description: error instanceof Error ? error.message : "请重试"
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, filters.search ? 300 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filters, page, toast]);

  const allSelected = items.length > 0 && items.every((q) => selected.has(q.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) {
      items.forEach((q) => next.delete(q.id));
    } else {
      items.forEach((q) => next.add(q.id));
    }
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      subject: "",
      knowledgePoint: "",
      notebookId: "",
      reviewLevel: "",
      timeRange: "",
      sort: "due"
    });
  };

  const batchMove = async (notebookId: string) => {
    if (!notebookId || !selected.size) return;
    try {
      await api.moveQuestions(Array.from(selected), notebookId);
      toast({ type: "success", title: `已移动 ${selected.size} 道错题` });
      setSelected(new Set());
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast({
        type: "error",
        title: "移动失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    }
  };

  const batchDelete = async () => {
    try {
      await api.deleteQuestions(Array.from(selected));
      toast({ type: "success", title: `已删除 ${selected.size} 道错题` });
      setSelected(new Set());
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast({
        type: "error",
        title: "删除失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    }
  };

  const knowledgePoints = Array.from(
    new Set(items.map((q) => q.knowledgePoint).filter(Boolean))
  ).slice(0, 12);

  const hasFilters =
    filters.subject ||
    filters.knowledgePoint ||
    filters.notebookId ||
    filters.reviewLevel ||
    filters.timeRange ||
    filters.search;

  return (
    <AppShell
      active="home"
      left={
        <NotebookSidebar
          activeNotebookId={filters.notebookId || undefined}
          onSelect={(id) => setFilters((f) => ({ ...f, notebookId: id ?? "" }))}
          refreshKey={refreshKey}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      }
    >
      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-foreground">
              {filters.notebookId
                ? notebooks.find((n) => n.id === filters.notebookId)?.name
                : "全部错题"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">共 {total} 道错题</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
              <FileDown className="h-4 w-4" />
              导出
            </Button>
            <Button size="sm" onClick={() => router.push("/new")}>
              录入错题
            </Button>
          </div>
        </div>

        <div className="mb-4 space-y-2 rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {SUBJECTS.map((subject) => (
              <button
                key={subject}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    subject: f.subject === subject ? "" : subject
                  }))
                }
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filters.subject === subject
                    ? "bg-primary text-primary-foreground"
                    : "bg-black/5 text-muted-foreground dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15"
                }`}
              >
                {subject}
              </button>
            ))}
            {LEVELS.map((level) => (
              <button
                key={level}
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    reviewLevel: f.reviewLevel === level ? "" : level
                  }))
                }
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filters.reviewLevel === level
                    ? "bg-primary text-primary-foreground"
                    : "bg-black/5 text-muted-foreground dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.knowledgePoint}
              onChange={(e) =>
                setFilters((f) => ({ ...f, knowledgePoint: e.target.value }))
              }
              className="w-40"
            >
              <option value="">全部知识点</option>
              {knowledgePoints.map((point) => (
                <option key={point} value={point}>{point}</option>
              ))}
            </Select>
            <Select
              value={filters.timeRange}
              onChange={(e) =>
                setFilters((f) => ({ ...f, timeRange: e.target.value }))
              }
              className="w-36"
            >
              <option value="">全部时间</option>
              <option value="7d">近 7 天</option>
              <option value="30d">近 30 天</option>
            </Select>
            <Select
              value={filters.sort}
              onChange={(e) =>
                setFilters((f) => ({ ...f, sort: e.target.value }))
              }
              className="w-40"
            >
              <option value="due">复习紧迫度</option>
              <option value="created">收录时间</option>
              <option value="mastery">掌握度升序</option>
              <option value="accuracy">正确率升序</option>
            </Select>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" />
              重置筛选
            </Button>
          </div>
        </div>

        {selected.size > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <span className="text-sm font-medium text-primary">已选择 {selected.size} 道</span>
            <Select
              value=""
              onChange={(e) => batchMove(e.target.value)}
              className="h-8 w-40 text-xs"
            >
              <option value="">移动到错题本…</option>
              {notebooks.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </Select>
            <Button variant="ghost" size="sm" onClick={() => setBatchDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              删除
            </Button>
          </div>
        ) : null}

        {loading && page === 1 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : items.length ? (
          <div className="space-y-3">
            {items.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                notebooks={notebooks}
                selected={selected.has(question.id)}
                onToggle={toggleOne}
                onChanged={() => setRefreshKey((k) => k + 1)}
              />
            ))}
            {items.length < total ? (
              <div className="flex justify-center py-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  加载更多
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={<BookOpenText className="h-6 w-6" />}
            title={hasFilters ? "未找到匹配的错题" : "还没有错题"}
            description={
              hasFilters
                ? "试试重置筛选，或录入第一道错题"
                : "从拍照识图、粘贴文本或 AI 对话开始录入"
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  重置筛选
                </Button>
              ) : (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button size="sm" onClick={() => router.push("/chat")}>
                    <MessageSquare className="h-4 w-4" />
                    AI 对话
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push("/new?tab=image")}>
                    <Camera className="h-4 w-4" />
                    拍照识图
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push("/new?tab=text")}>
                    <ClipboardType className="h-4 w-4" />
                    粘贴文本
                  </Button>
                </div>
              )
            }
          />
        )}
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        questions={items as Question[]}
        selectedIds={Array.from(selected)}
        notebooks={notebooks}
      />
      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        title={`删除 ${selected.size} 道错题？`}
        description="删除后将从列表和复习计划中移除，此操作不可撤销。"
        confirmText="删除"
        onConfirm={batchDelete}
      />
      <Dialog
        open={onboardingOpen}
        onOpenChange={async (open) => {
          setOnboardingOpen(open);
          if (!open) {
            await api.updatePlanSettings({ onboardingDone: true }).catch(() => {});
          }
        }}
        title="4 步快速上手 Recall"
        description="从录入到复习，一页看懂核心流程"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={async () => {
                setOnboardingOpen(false);
                await api.updatePlanSettings({ onboardingDone: true }).catch(() => {});
              }}
            >
              跳过
            </Button>
            <Button
              onClick={async () => {
                setOnboardingOpen(false);
                await api.updatePlanSettings({ onboardingDone: true }).catch(() => {});
              }}
            >
              知道了
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["录入", "拍照、粘贴文本或 AI 对话加题"],
            ["确认", "AI 识别后逐题编辑并确认"],
            ["复习", "按今日计划完成变式题"],
            ["看板", "查看趋势与薄弱知识点"]
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg border border-border bg-background p-3">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </Dialog>
    </AppShell>
  );
}
