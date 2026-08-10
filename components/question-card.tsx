"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Check,
  X
} from "lucide-react";
import { api } from "@/lib/api";
import type { Notebook, Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { dueLabel, formatDate } from "@/lib/date";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select } from "./ui/select";
import { Progress } from "./ui/progress";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./ui/toast";

export type QuestionRow = Question & {
  reviewLevel: string;
  accuracy: number;
  reviewPlan?: {
    dueDate: string;
    repetitionCount: number;
    paused: boolean;
    mastered: boolean;
  };
};

export function QuestionCard({
  question,
  notebooks,
  selected,
  onToggle,
  onChanged
}: {
  question: QuestionRow;
  notebooks: Notebook[];
  selected: boolean;
  onToggle: (id: string) => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [draft, setDraft] = React.useState({
    stem: question.stem,
    answer: question.answer,
    analysis: question.analysis,
    subject: question.subject,
    knowledgePoint: question.knowledgePoint,
    wrongReason: question.wrongReason,
    notebookId: question.notebookId ?? ""
  });

  const subjectColors: Record<string, string> = {
    数学: "#007AFF",
    英语: "#34C759",
    物理: "#FF9500",
    化学: "#AF52DE",
    语文: "#FF2D55",
    生物: "#5AC8FA"
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.updateQuestion(question.id, {
        stem: draft.stem,
        answer: draft.answer,
        analysis: draft.analysis,
        subject: draft.subject,
        knowledgePoint: draft.knowledgePoint,
        wrongReason: draft.wrongReason,
        notebookId: draft.notebookId || undefined
      });
      setEditing(false);
      toast({ type: "success", title: "错题已保存" });
      onChanged();
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

  const move = async (notebookId: string) => {
    if (!notebookId) return;
    try {
      await api.moveQuestions([question.id], notebookId);
      toast({ type: "success", title: "已移动到所选错题本" });
      onChanged();
    } catch (error) {
      toast({
        type: "error",
        title: "移动失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    }
  };

  const remove = async () => {
    try {
      await api.deleteQuestions([question.id]);
      toast({ type: "success", title: "错题已删除" });
      onChanged();
    } catch (error) {
      toast({
        type: "error",
        title: "删除失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    }
  };

  const levelVariant =
    question.reviewLevel === "待复习"
      ? "error"
      : question.reviewLevel === "已掌握"
        ? "success"
        : question.reviewLevel === "已暂停"
          ? "outline"
          : "warning";

  return (
    <CardShell selected={selected}>
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="pt-0.5">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggle(question.id)}
            ariaLabel={`选择 ${question.stem}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: subjectColors[question.subject] ?? "#6E6E73" }}
            />
            <Badge>{question.subject}</Badge>
            <Badge variant="secondary">{question.knowledgePoint}</Badge>
            <Badge variant={levelVariant}>{question.reviewLevel}</Badge>
            {question.reviewPlan ? (
              <span className="text-xs text-muted-foreground">
                下次复习：{dueLabel(question.reviewPlan.dueDate)}
              </span>
            ) : null}
          </div>

          {editing ? (
            <div className="space-y-3">
              <Textarea
                value={draft.stem}
                onChange={(e) => setDraft((d) => ({ ...d, stem: e.target.value }))}
                placeholder="题干"
                className="min-h-[72px]"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">学科</p>
                  <Select
                    value={draft.subject}
                    onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                  >
                    {["数学", "英语", "物理", "化学", "语文", "生物", "通用"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">知识点</p>
                  <Input
                    value={draft.knowledgePoint}
                    onChange={(e) => setDraft((d) => ({ ...d, knowledgePoint: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">错因</p>
                  <Input
                    value={draft.wrongReason}
                    onChange={(e) => setDraft((d) => ({ ...d, wrongReason: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">错题本</p>
                  <Select
                    value={draft.notebookId}
                    onChange={(e) => setDraft((d) => ({ ...d, notebookId: e.target.value }))}
                  >
                    <option value="">未分类</option>
                    {notebooks.map((n) => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <Textarea
                value={draft.answer}
                onChange={(e) => setDraft((d) => ({ ...d, answer: e.target.value }))}
                placeholder="答案"
              />
              <Textarea
                value={draft.analysis}
                onChange={(e) => setDraft((d) => ({ ...d, analysis: e.target.value }))}
                placeholder="解析"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4" />
                  取消
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  <Check className="h-4 w-4" />
                  {saving ? "保存中…" : "保存"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="border-l-4 border-l-stem pl-3 text-sm leading-6 text-foreground">
                {question.stem}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">掌握度</span>
                <Progress
                  value={question.mastery}
                  color={
                    question.mastery >= 80
                      ? "var(--color-success)"
                      : question.mastery >= 50
                        ? "var(--color-warning)"
                        : "var(--color-error)"
                  }
                  className="w-28"
                />
                <span className="text-xs font-medium text-foreground">{question.mastery}%</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  正确率 {question.accuracy}%
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
          {!editing ? (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? "收起" : "展开"}
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)} aria-label="编辑">
                <Pencil className="h-4 w-4" />
              </Button>
              <div className="hidden w-36 sm:block">
                <Select
                  value=""
                  onChange={(e) => move(e.target.value)}
                  aria-label="移动到错题本"
                  className="h-8 text-xs"
                >
                  <option value="">移动到…</option>
                  {notebooks.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </Select>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleteOpen(true)}
                aria-label="删除"
                className="text-muted-foreground hover:text-error"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {expanded && !editing ? (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-4 sm:px-5">
          <div className="rounded-lg border-l-4 border-l-analysis bg-black/[0.02] p-3 dark:bg-white/[0.04]">
            <p className="text-sm text-foreground">
              <span className="font-medium">答案：</span>
              {question.answer || "暂无"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              <span className="font-medium text-foreground">解析：</span>
              {question.analysis || "暂无"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              错因：{question.wrongReason} · 收录：{formatDate(question.createdAt)} · 来源：{question.source}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:hidden">
            <Select value="" onChange={(e) => move(e.target.value)} className="h-8 flex-1 text-xs">
              <option value="">移动到…</option>
              {notebooks.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </Select>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <ArrowRightLeft className="h-4 w-4" />
              编辑
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除这道错题？"
        description="删除后将从错题列表与复习计划中移除，此操作不可撤销。"
        confirmText="删除"
        onConfirm={remove}
      />
    </CardShell>
  );
}

function CardShell({
  selected,
  children
}: {
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card transition-colors",
        selected ? "border-primary/60 bg-primary/[0.03]" : ""
      )}
    >
      {children}
    </div>
  );
}
