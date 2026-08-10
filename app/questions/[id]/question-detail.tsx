"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Notebook, Question } from "@/lib/types";
import { dueLabel } from "@/lib/date";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

export function QuestionDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [question, setQuestion] = React.useState<
    | (Question & {
        reviewLevel: string;
        accuracy: number;
        reviewPlan?: {
          dueDate: string;
          repetitionCount: number;
          paused: boolean;
          mastered: boolean;
        };
      })
    | null
  >(null);
  const [notebooks, setNotebooks] = React.useState<Notebook[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [draft, setDraft] = React.useState({
    stem: "",
    answer: "",
    analysis: "",
    subject: "",
    knowledgePoint: "",
    wrongReason: "",
    notebookId: ""
  });

  React.useEffect(() => {
    api.question(id).then((q) => {
      setQuestion(q);
      setDraft({
        stem: q.stem,
        answer: q.answer,
        analysis: q.analysis,
        subject: q.subject,
        knowledgePoint: q.knowledgePoint,
        wrongReason: q.wrongReason,
        notebookId: q.notebookId ?? ""
      });
    }).catch((error) => {
      toast({
        type: "error",
        title: "加载失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    }).finally(() => setLoading(false));
    api.notebooks().then(setNotebooks).catch(() => {});
  }, [id, toast]);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateQuestion(id, {
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
      const updated = await api.question(id);
      setQuestion(updated);
      setDraft({
        stem: updated.stem,
        answer: updated.answer,
        analysis: updated.analysis,
        subject: updated.subject,
        knowledgePoint: updated.knowledgePoint,
        wrongReason: updated.wrongReason,
        notebookId: updated.notebookId ?? ""
      });
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

  return (
    <AppShell active="home" className="max-w-3xl">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" />
          返回错题列表
        </Button>
        {loading ? (
          <Skeleton className="mt-4 h-80" />
        ) : question ? (
          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge>{question.subject}</Badge>
              <Badge variant="secondary">{question.knowledgePoint}</Badge>
              <Badge variant={question.reviewLevel === "待复习" ? "error" : "warning"}>
                {question.reviewLevel}
              </Badge>
              {question.reviewPlan ? (
                <span className="text-xs text-muted-foreground">
                  下次复习：{dueLabel(question.reviewPlan.dueDate)}
                </span>
              ) : null}
            </div>

            {editing ? (
              <div className="space-y-3">
                <Textarea value={draft.stem} onChange={(e) => setDraft((d) => ({ ...d, stem: e.target.value }))} className="min-h-[90px]" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}>
                    {["数学", "英语", "物理", "化学", "语文", "生物", "通用"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                  <Input value={draft.knowledgePoint} onChange={(e) => setDraft((d) => ({ ...d, knowledgePoint: e.target.value }))} />
                </div>
                <Input value={draft.wrongReason} onChange={(e) => setDraft((d) => ({ ...d, wrongReason: e.target.value }))} />
                <Select value={draft.notebookId} onChange={(e) => setDraft((d) => ({ ...d, notebookId: e.target.value }))}>
                  <option value="">未分类</option>
                  {notebooks.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </Select>
                <Textarea value={draft.answer} onChange={(e) => setDraft((d) => ({ ...d, answer: e.target.value }))} />
                <Textarea value={draft.analysis} onChange={(e) => setDraft((d) => ({ ...d, analysis: e.target.value }))} />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4" />取消</Button>
                  <Button onClick={save} disabled={saving}><Check className="h-4 w-4" />{saving ? "保存中…" : "保存"}</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="border-l-4 border-l-stem pl-4 text-lg leading-7 text-foreground">{question.stem}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">掌握度</span>
                  <Progress value={question.mastery} className="w-44" />
                  <span className="text-sm font-medium">{question.mastery}%</span>
                </div>
                <div className="mt-5 rounded-lg border-l-4 border-l-analysis bg-black/[0.02] p-4 dark:bg-white/[0.04]">
                  <p className="text-sm font-medium text-foreground">答案</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{question.answer || "暂无"}</p>
                  <p className="mt-3 text-sm font-medium text-foreground">解析</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{question.analysis || "暂无"}</p>
                  <p className="mt-3 text-xs text-muted-foreground">错因：{question.wrongReason}</p>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" />
                    编辑
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="mt-10 text-center text-sm text-muted-foreground">错题不存在</p>
        )}
      </div>
    </AppShell>
  );
}
