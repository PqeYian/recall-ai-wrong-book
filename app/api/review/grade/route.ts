import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readDb } from "@/lib/db";
import { getAiProvider } from "@/lib/providers/ai";
import { addReviewLog, updateSm2 } from "@/lib/repository";

const schema = z.object({
  questionId: z.string(),
  variant: z.object({
    id: z.string(),
    questionId: z.string(),
    stem: z.string(),
    options: z.array(z.string()).optional(),
    answer: z.string(),
    knowledgePoint: z.string()
  }),
  answer: z.string().default(""),
  skipped: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const db = await readDb();
    const question = db.questions.find((q) => q.id === input.questionId);
    if (!question) {
      return NextResponse.json({ error: "原题不存在" }, { status: 404 });
    }

    const ai = getAiProvider();
    const grade = input.skipped
      ? {
          score: 0,
          isCorrect: false,
          modelAnswer: input.variant.answer,
          analysis: "本次未作答，已记录为未掌握。",
          wrongReasonDiagnosis: "未作答",
          quality: 1
        }
      : await ai.gradeAnswer(question, input.variant, input.answer);

    await addReviewLog({
      questionId: question.id,
      score: grade.score,
      isCorrect: grade.isCorrect,
      quality: grade.quality,
      aiFeedback: `${grade.analysis}\n${grade.wrongReasonDiagnosis}`,
      reviewedAt: new Date().toISOString()
    });
    await updateSm2(question.id, grade.quality);

    return NextResponse.json(grade);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批改失败，请重试" },
      { status: 500 }
    );
  }
}
