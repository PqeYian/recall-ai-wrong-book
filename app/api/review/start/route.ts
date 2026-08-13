import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/auth";
import { getCurrentUserId } from "@/lib/context";
import { readDb } from "@/lib/db";
import { getAiProvider } from "@/lib/providers/ai";
import { toISODate, todayISO } from "@/lib/date";

const schema = z.object({
  subject: z.string().optional(),
  notebookId: z.string().optional(),
  count: z.number().min(1).max(50).default(10),
  mode: z.enum(["today", "free"]).default("today")
});

export async function POST(request: NextRequest) {
  return withUser(request, async () => {
    try {
    const input = schema.parse(await request.json());
    const db = await readDb();
    const today = todayISO();

    let questions = db.questions.filter(
      (q) => q.userId === getCurrentUserId() && !q.deletedAt
    );
    if (input.subject) questions = questions.filter((q) => q.subject === input.subject);
    if (input.notebookId) {
      questions = questions.filter((q) => q.notebookId === input.notebookId);
    }

    if (!questions.length) {
      return NextResponse.json(
        { error: "暂无符合条件的错题，请先录入或调整范围" },
        { status: 400 }
      );
    }

    if (input.mode === "today") {
      const due = questions.filter((q) => {
        const plan = db.reviewPlans.find((p) => p.questionId === q.id);
        return (
          plan &&
          !plan.paused &&
          !plan.mastered &&
          toISODate(new Date(plan.dueDate)) <= today
        );
      });
      if (!due.length) {
        return NextResponse.json(
          { error: "今日暂无到期题目，可切换自由练习模式" },
          { status: 400 }
        );
      }
      questions = due;
    }

    questions.sort((a, b) => {
      const planA = db.reviewPlans.find((p) => p.questionId === a.id);
      const planB = db.reviewPlans.find((p) => p.questionId === b.id);
      if (planA && planB) {
        const dueDiff =
          new Date(planA.dueDate).getTime() - new Date(planB.dueDate).getTime();
        if (dueDiff !== 0) return dueDiff;
      }
      return a.mastery - b.mastery;
    });

    const selected = questions.slice(0, input.count);
    const ai = getAiProvider();
    const reviewQuestions = await Promise.all(
      selected.map(async (question) => ({
        originalQuestion: question,
        variant: await ai.generateVariant(question)
      }))
    );

    return NextResponse.json({ questions: reviewQuestions });
    } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成复习题失败" },
      { status: 500 }
    );
    }
  });
}
