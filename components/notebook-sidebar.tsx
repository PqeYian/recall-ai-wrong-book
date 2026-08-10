"use client";

import * as React from "react";
import {
  BookMarked,
  FolderPlus,
  Settings2,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowUpDown
} from "lucide-react";
import { api } from "@/lib/api";
import type { Notebook } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Badge } from "./ui/badge";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./ui/toast";

const COLORS = [
  "#007AFF",
  "#34C759",
  "#FF9500",
  "#AF52DE",
  "#FF2D55",
  "#5AC8FA",
  "#FFCC00",
  "#5856D6"
];

export function NotebookSidebar({
  activeNotebookId,
  onSelect,
  refreshKey,
  onChanged
}: {
  activeNotebookId?: string;
  onSelect: (id?: string) => void;
  refreshKey?: number;
  onChanged?: () => void;
}) {
  const { toast } = useToast();
  const [notebooks, setNotebooks] = React.useState<
    Array<Notebook & { questionCount: number }>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Notebook | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<
    (Notebook & { questionCount: number }) | null
  >(null);
  const [sortMode, setSortMode] = React.useState<"default" | "name" | "count">(
    "default"
  );
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(COLORS[0]);
  const [subject, setSubject] = React.useState("数学");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setNotebooks(await api.notebooks());
    } catch (error) {
      toast({
        type: "error",
        title: "加载错题本失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    load();
  }, [load, refreshKey]);

  const openCreate = () => {
    setName("");
    setColor(COLORS[0]);
    setSubject("数学");
    setCreateOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editTarget) {
        await api.updateNotebook(editTarget.id, { name, color, defaultSubject: subject });
        toast({ type: "success", title: "错题本已更新" });
      } else {
        await api.createNotebook({ name, color, defaultSubject: subject });
        toast({ type: "success", title: "错题本已创建" });
      }
      setCreateOpen(false);
      setEditTarget(null);
      await load();
      onChanged?.();
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

  const displayNotebooks = React.useMemo(() => {
    const list = [...notebooks];
    if (sortMode === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    }
    if (sortMode === "count") {
      list.sort((a, b) => a.questionCount - b.questionCount);
    }
    return list;
  }, [notebooks, sortMode]);

  const moveNotebook = async (id: string, direction: -1 | 1) => {
    const index = notebooks.findIndex((n) => n.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= notebooks.length) return;
    const next = [...notebooks];
    [next[index], next[target]] = [next[target], next[index]];
    setNotebooks(next);
    try {
      await api.reorderNotebooks(next.map((n) => n.id));
      await load();
      onChanged?.();
    } catch (error) {
      toast({
        type: "error",
        title: "排序失败",
        description: error instanceof Error ? error.message : "请重试"
      });
      await load();
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteNotebook(deleteTarget.id);
      toast({ type: "success", title: "错题本已删除" });
      if (activeNotebookId === deleteTarget.id) onSelect(undefined);
      await load();
      onChanged?.();
    } catch (error) {
      toast({
        type: "error",
        title: "删除失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const total = notebooks.reduce((sum, n) => sum + n.questionCount, 0);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookMarked className="h-4 w-4 text-primary" />
            错题本
          </h2>
          <button
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => setManageOpen(true)}
            aria-label="管理错题本"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => onSelect(undefined)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
            !activeNotebookId
              ? "bg-primary/10 text-primary"
              : "text-foreground hover:bg-black/5 dark:hover:bg-white/10"
          )}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="flex-1 font-medium">全部错题</span>
          <Badge variant="secondary">{total}</Badge>
        </button>
        <div className="relative mt-2">
          <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Select
            value={sortMode}
            onChange={(e) =>
              setSortMode(e.target.value as "default" | "name" | "count")
            }
            className="h-8 text-xs"
            aria-label="错题本排序"
          >
            <option value="default">默认顺序</option>
            <option value="name">按名称排序</option>
            <option value="count">按题数排序</option>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        {displayNotebooks.map((notebook) => (
          <div
            key={notebook.id}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
              activeNotebookId === notebook.id
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-black/5 dark:hover:bg-white/10"
            )}
          >
            <button className="flex min-w-0 flex-1 items-center gap-3" onClick={() => onSelect(notebook.id)}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: notebook.color }} />
              <span className="min-w-0 flex-1 truncate font-medium">{notebook.name}</span>
              <Badge variant="secondary">{notebook.questionCount}</Badge>
            </button>
            <div className="hidden gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                className="rounded-md p-1 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => {
                  setEditTarget(notebook);
                  setName(notebook.name);
                  setColor(notebook.color);
                  setSubject(notebook.defaultSubject);
                  setCreateOpen(true);
                }}
                aria-label="重命名"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded-md p-1 text-muted-foreground hover:bg-error/10 hover:text-error"
                onClick={() => setDeleteTarget(notebook)}
                aria-label="删除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" className="w-full" onClick={openCreate}>
        <FolderPlus className="h-4 w-4" />
        新建错题本
      </Button>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setEditTarget(null);
        }}
        title={editTarget ? "重命名错题本" : "新建错题本"}
        description="名称 1-20 字，同用户下不可重名"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={save} disabled={saving || !name.trim()}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="错题本名称" maxLength={20} />
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">颜色</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`选择颜色 ${c}`}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 border-transparent transition-transform",
                    color === c && "scale-110 border-foreground"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">默认学科</p>
            <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
              {["数学", "英语", "物理", "化学", "语文", "生物", "通用"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        title="错题本管理"
        description="使用上下按钮调整顺序，也可重命名或删除"
        className="max-w-lg"
      >
        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {notebooks.map((notebook, index) => (
            <div
              key={notebook.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"
            >
              <div className="flex flex-col">
                <button
                  className="rounded p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => moveNotebook(notebook.id, -1)}
                  aria-label="上移"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  className="rounded p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30"
                  disabled={index === notebooks.length - 1}
                  onClick={() => moveNotebook(notebook.id, 1)}
                  aria-label="下移"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: notebook.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {notebook.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {notebook.questionCount} 题 · {notebook.defaultSubject || "通用"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setManageOpen(false);
                  setEditTarget(notebook);
                  setName(notebook.name);
                  setColor(notebook.color);
                  setSubject(notebook.defaultSubject);
                  setCreateOpen(true);
                }}
                aria-label="重命名"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-error"
                onClick={() => {
                  setManageOpen(false);
                  setDeleteTarget(notebook);
                }}
                aria-label="删除"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {!notebooks.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              还没有错题本
            </p>
          ) : null}
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="删除这个错题本？"
        description={
          deleteTarget
            ? `将同时移除其中 ${deleteTarget.questionCount} 道错题，删除后这些错题会进入未分类。`
            : ""
        }
        confirmText="删除"
        onConfirm={remove}
      />
    </div>
  );
}
