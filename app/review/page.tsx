"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { api } from "@/lib/api";
import type {
  GradeResult,
  Notebook,
  ReviewQuestion
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { toMathNotation } from "@/lib/math-format";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/ui/toast";

export default function ReviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [notebooks, setNotebooks] = React.useState<Notebook[]>([]);
  const [mode, setMode] = React.useState<"today" | "free">("today");
  const [subject, setSubject] = React.useState("");
  const [notebookId, setNotebookId] = React.useState("");
  const [count, setCount] = React.useState(10);
  const [startLoading, setStartLoading] = React.useState(false);
  const [questions, setQuestions] = React.useState<ReviewQuestion[]>([]);
  const [results, setResults] = React.useState<
    Array<{ question: ReviewQuestion; grade: GradeResult }>
  >([]);
  const [current, setCurrent] = React.useState(0);
  const [answer, setAnswer] = React.useState("");
  const [grade, setGrade] = React.useState<GradeResult | null>(null);
  const [gradeLoading, setGradeLoading] = React.useState(false);
  const [skipOpen, setSkipOpen] = React.useState(false);

  React.useEffect(() => {
    api.notebooks().then(setNotebooks).catch(() => {});
  }, []);

  const start = async () => {
    setStartLoading(true);
    try {
      const result = await api.reviewStart({
        subject: subject || undefined,
        notebookId: notebookId || undefined,
        count,
        mode
      });
      setQuestions(result.questions);
      setResults([]);
      setCurrent(0);
      setGrade(null);
      setAnswer("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast({
        type: "error",
        title: "无法开始复习",
        description: error instanceof Error ? error.message : "请调整范围后重试"
      });
    } finally {
      setStartLoading(false);
    }
  };

  const gradeCurrent = async (skipped = false) => {
    if (!questions[current] || gradeLoading) return;
    setGradeLoading(true);
    try {
      const question = questions[current];
      const result = await api.reviewGrade({
        questionId: question.originalQuestion.id,
        variantId: question.variant.id,
        variant: question.variant,
        answer: skipped ? "" : answer,
        skipped
      });
      setGrade(result);
      setResults((prev) => [
        ...prev,
        { question, grade: result }
      ]);
    } catch (error) {
      toast({
        type: "error",
        title: "批改失败",
        description: error instanceof Error ? error.message : "已作答内容已保留，请重试"
      });
    } finally {
      setGradeLoading(false);
    }
  };

  const next = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setAnswer("");
      setGrade(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      sessionStorage.setItem(
        "recall_review_result",
        JSON.stringify(results)
      );
      router.push("/review/result");
    }
  };

  if (questions.length) {
    const question = questions[current];
    return (
      <AppShell active="review" className="max-w-3xl">
        <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">一键复习</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                第 {current + 1} / {questions.length} 题 · {question.originalQuestion.subject}
              </p>
            </div>
            <div className="flex gap-1">
              {questions.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 w-5 rounded-full",
                    index < current ? "bg-success" : index === current ? "bg-primary" : "bg-black/10 dark:bg-white/10"
                  )}
                />
              ))}
            </div>
          </div>

          <Card className="mb-4">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning">
                  <Sparkles className="h-3 w-3" />
                  变体题
                </Badge>
                <Badge variant="secondary">{question.variant.knowledgePoint}</Badge>
              </div>
              <CardTitle className="text-base leading-7">
                {toMathNotation(question.variant.stem)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {question.variant.options?.length ? (
                <div className="space-y-2">
                  {question.variant.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => setAnswer(option)}
                      className={cn(
                        "block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        answer === option
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/40"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="输入你的作答，提交后由 AI 自动批改"
                  className="min-h-[120px]"
                  autoFocus
                />
              )}
            </CardContent>
          </Card>

          {grade ? (
            <Card
              className={cn(
                "mb-4",
                grade.isCorrect ? "border-2 border-success" : "border-2 border-error"
              )}
            >
              <CardContent className="pt-5">
                <div className="mb-3 flex items-center gap-2">
                  {grade.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-error" />
                  )}
                  <span className="text-lg font-semibold text-foreground">{grade.score} 分</span>
                  <Badge variant={grade.isCorrect ? "success" : "error"}>
                    {grade.isCorrect ? "正确" : "错误"}
                  </Badge>
                </div>
                <div className="space-y-3 text-sm leading-6">
                  <div>
                    <p className="font-medium text-foreground">标准答案</p>
                    <p className="mt-1 text-muted-foreground">
                      {toMathNotation(grade.modelAnswer)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">解析</p>
                    <p className="mt-1 text-muted-foreground">
                      {toMathNotation(grade.analysis)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">错因诊断</p>
                    <p className="mt-1 text-muted-foreground">
                      {toMathNotation(grade.wrongReasonDiagnosis)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            {!grade ? (
              <>
                <Button variant="ghost" onClick={() => setSkipOpen(true)} disabled={gradeLoading}>
                  跳过本题
                </Button>
                <Button onClick={() => gradeCurrent(false)} disabled={gradeLoading || !answer.trim()}>
                  {gradeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  提交本题
                </Button>
              </>
            ) : (
              <Button onClick={next}>
                {current < questions.length - 1 ? "下一题" : "查看复习小结"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <ConfirmDialog
            open={skipOpen}
            onOpenChange={setSkipOpen}
            title="本次将记录为未掌握，确定提交？"
            description="跳过本题会按未掌握处理，并缩短该题的复习间隔。"
            confirmText="确定"
            onConfirm={() => gradeCurrent(true)}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="review" className="max-w-3xl">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <h1 className="mb-1 text-xl font-semibold text-foreground">一键复习</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          AI 生成同考点变式题，逐题作答后自动批改
        </p>

        <Card>
          <CardContent className="space-y-5 pt-5">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">复习模式</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={mode === "today" ? "default" : "outline"}
                  onClick={() => setMode("today")}
                >
                  今日计划
                </Button>
                <Button
                  variant={mode === "free" ? "default" : "outline"}
                  onClick={() => setMode("free")}
                >
                  自由练习
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">学科</p>
              <div className="flex flex-wrap gap-2">
                {["数学", "英语", "物理", "化学", "语文", "生物"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSubject((prev) => (prev === s ? "" : s))}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      subject === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">错题本</p>
              <Select value={notebookId} onChange={(e) => setNotebookId(e.target.value)}>
                <option value="">全部错题本</option>
                {notebooks.map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">题目数量</p>
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value))))}
                className="h-10 w-28 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 flex justify-end">
          <Button onClick={start} disabled={startLoading}>
            {startLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {startLoading ? "AI 正在生成变体题…" : "开始复习"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
