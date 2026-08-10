"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  BookPlus,
  RotateCcw,
  Home
} from "lucide-react";
import { api } from "@/lib/api";
import type { GradeResult, ReviewQuestion } from "@/lib/types";
import { toMathNotation } from "@/lib/math-format";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

type ResultItem = {
  question: ReviewQuestion;
  grade: GradeResult;
};

export default function ReviewResultPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [results, setResults] = React.useState<ResultItem[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem("recall_review_result");
      if (raw) setResults(JSON.parse(raw) as ResultItem[]);
    } catch {
      setResults([]);
    }
  }, []);

  const correct = results.filter((r) => r.grade.isCorrect).length;
  const accuracy = results.length ? Math.round((correct / results.length) * 100) : 0;
  const weak = results
    .filter((r) => !r.grade.isCorrect)
    .slice(0, 3)
    .map((r) => r.question.variant.knowledgePoint);

  const collectWeak = async () => {
    const wrong = results.filter((r) => !r.grade.isCorrect);
    if (!wrong.length) {
      toast({ type: "info", title: "本次没有薄弱题需要收藏" });
      return;
    }
    setSaving(true);
    try {
      await api.createQuestions(
        wrong.map((r) => ({
          stem: r.question.originalQuestion.stem,
          answer: r.question.originalQuestion.answer,
          analysis: r.grade.analysis,
          subject: r.question.originalQuestion.subject,
          knowledgePoint: r.question.variant.knowledgePoint,
          wrongReason: r.grade.wrongReasonDiagnosis,
          source: "review"
        }))
      );
      toast({
        type: "success",
        title: `已收藏 ${wrong.length} 道薄弱题`
      });
      router.push("/");
    } catch (error) {
      toast({
        type: "error",
        title: "收藏失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell active="review" className="max-w-3xl">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        {!results.length ? (
          <EmptyState
            icon={<RotateCcw className="h-6 w-6" />}
            title="还没有复习结果"
            description="先完成一组复习后再查看小结"
            action={
              <Button onClick={() => router.push("/review")}>去复习</Button>
            }
          />
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-black/10 dark:stroke-white/10" strokeWidth="3.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke={accuracy >= 80 ? "var(--color-success)" : accuracy >= 50 ? "var(--color-warning)" : "var(--color-error)"}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={`${accuracy} 100`}
                  />
                </svg>
                <span className="absolute text-xl font-semibold text-foreground">{accuracy}%</span>
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-foreground">本次复习小结</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  完成 {results.length} 题，答对 {correct} 题
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">薄弱知识点：</span>
                  {weak.length ? (
                    weak.map((point) => (
                      <Badge key={point} variant="error">{point}</Badge>
                    ))
                  ) : (
                    <Badge variant="success">本次无薄弱点</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {results.map((result, index) => (
                <Card
                  key={result.question.variant.id}
                  className={result.grade.isCorrect ? "border-2 border-success" : "border-2 border-error"}
                >
                  <CardContent className="pt-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {result.grade.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-error" />
                      )}
                      <span className="font-medium text-foreground">
                        第 {index + 1} 题 · {result.grade.score} 分
                      </span>
                      <Badge variant={result.grade.isCorrect ? "success" : "error"}>
                        {result.grade.isCorrect ? "正确" : "错误"}
                      </Badge>
                      <Badge variant="secondary">
                        {result.question.variant.knowledgePoint}
                      </Badge>
                    </div>
                    <p className="text-sm leading-6 text-foreground">
                      {toMathNotation(result.question.variant.stem)}
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <p><span className="font-medium text-foreground">标准答案：</span>{toMathNotation(result.grade.modelAnswer)}</p>
                      <p><span className="font-medium text-foreground">解析：</span>{toMathNotation(result.grade.analysis)}</p>
                      <p><span className="font-medium text-foreground">错因：</span>{toMathNotation(result.grade.wrongReasonDiagnosis)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-border bg-card/95 p-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => router.push("/")}>
                  <Home className="h-4 w-4" />
                  返回首页
                </Button>
                <Button variant="outline" onClick={() => router.push("/review")}>
                  <RotateCcw className="h-4 w-4" />
                  再来一组
                </Button>
                <Button onClick={collectWeak} disabled={saving}>
                  <BookPlus className="h-4 w-4" />
                  收藏薄弱题到错题本
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
