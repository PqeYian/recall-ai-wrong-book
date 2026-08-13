import { readDb, persistDb } from "./db";
import { getCurrentUserId } from "./context";
import { uid, similarity, clampScore } from "./utils";
import { addDays, toISODate, todayISO, startOfWeek } from "./date";
import type {
  DBShape,
  GradeResult,
  KnowledgeNode,
  Message,
  Notebook,
  PlansData,
  Question,
  RecognitionCandidate,
  ReviewLog,
  ReviewPlan,
  StatsData,
  SubjectStat,
  TrendPoint,
  UsageData,
  WeakPoint
} from "./types";

export async function listNotebooks() {
  const db = await readDb();
  return db.notebooks
    .filter((n) => n.userId === getCurrentUserId() && !n.deletedAt)
    .sort(
      (a, b) =>
        (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    .map((n) => ({
      ...n,
      questionCount: db.questions.filter(
        (q) =>
          q.userId === getCurrentUserId() &&
          q.notebookId === n.id &&
          !q.deletedAt
      ).length
    }));
}

export async function createNotebook(input: {
  name: string;
  color: string;
  defaultSubject: string;
}) {
  const db = await readDb();
  const name = input.name.trim();
  if (!name) throw new Error("错题本名称不能为空");
  if (name.length > 20) throw new Error("错题本名称不能超过 20 个字");
  if (
    db.notebooks.some(
      (n) =>
        n.userId === getCurrentUserId() && !n.deletedAt && n.name === name
    )
  ) {
    throw new Error("已存在同名错题本");
  }
  const notebook: Notebook = {
    id: uid(),
    userId: getCurrentUserId(),
    name,
    color: input.color,
    defaultSubject: input.defaultSubject,
    sortOrder:
      db.notebooks
        .filter((n) => n.userId === getCurrentUserId() && !n.deletedAt)
        .reduce((max, n) => Math.max(max, n.sortOrder ?? 0), -1) + 1,
    createdAt: new Date().toISOString()
  };
  db.notebooks.push(notebook);
  await persistDb(db);
  return notebook;
}

export async function updateNotebook(
  id: string,
  input: Partial<
    Pick<Notebook, "name" | "color" | "defaultSubject" | "sortOrder">
  >
) {
  const db = await readDb();
  const notebook = db.notebooks.find(
    (n) => n.userId === getCurrentUserId() && n.id === id && !n.deletedAt
  );
  if (!notebook) throw new Error("错题本不存在");
  if (input.name) {
    const name = input.name.trim();
    if (!name) throw new Error("错题本名称不能为空");
    if (
      db.notebooks.some(
        (n) =>
          n.userId === getCurrentUserId() &&
          n.id !== id &&
          !n.deletedAt &&
          n.name === name
      )
    ) {
      throw new Error("已存在同名错题本");
    }
    notebook.name = name;
  }
  if (input.color) notebook.color = input.color;
  if (input.defaultSubject !== undefined) {
    notebook.defaultSubject = input.defaultSubject;
  }
  if (input.sortOrder !== undefined) {
    notebook.sortOrder = input.sortOrder;
  }
  await persistDb(db);
  return notebook;
}

export async function reorderNotebooks(ids: string[]) {
  const db = await readDb();
  ids.forEach((id, index) => {
    const notebook = db.notebooks.find(
      (n) => n.userId === getCurrentUserId() && n.id === id && !n.deletedAt
    );
    if (notebook) notebook.sortOrder = index;
  });
  await persistDb(db);
  return { reordered: ids.length };
}

export async function deleteNotebook(id: string) {
  const db = await readDb();
  const notebook = db.notebooks.find(
    (n) => n.userId === getCurrentUserId() && n.id === id && !n.deletedAt
  );
  if (!notebook) throw new Error("错题本不存在");
  notebook.deletedAt = new Date().toISOString();
  const affected = db.questions.filter(
    (q) =>
      q.userId === getCurrentUserId() && q.notebookId === id && !q.deletedAt
  );
  affected.forEach((q) => {
    q.notebookId = undefined;
  });
  await persistDb(db);
  return { removedQuestions: affected.length };
}

export interface QuestionFilters {
  search?: string;
  subject?: string;
  knowledgePoint?: string;
  notebookId?: string;
  reviewLevel?: string;
  timeRange?: string;
  sort?: "due" | "created" | "mastery" | "accuracy";
  page?: number;
  pageSize?: number;
}

function reviewLevelOf(plan?: ReviewPlan) {
  if (!plan) return "未计划";
  if (plan.paused) return "已暂停";
  if (plan.mastered) return "已掌握";
  const due = toISODate(new Date(plan.dueDate));
  const today = todayISO();
  if (due <= today) return "待复习";
  if (due <= addDays(new Date(), 3).toISOString().slice(0, 10)) return "即将到期";
  return "远期";
}

export async function listQuestions(filters: QuestionFilters = {}) {
  const db = await readDb();
  const search = filters.search?.trim().toLowerCase() ?? "";
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));

  const rows = db.questions
    .filter((q) => q.userId === getCurrentUserId() && !q.deletedAt)
    .filter((q) => {
      if (filters.subject && q.subject !== filters.subject) return false;
      if (filters.notebookId && q.notebookId !== filters.notebookId) return false;
      if (
        filters.knowledgePoint &&
        q.knowledgePoint !== filters.knowledgePoint
      ) {
        return false;
      }
      if (
        filters.reviewLevel &&
        reviewLevelOf(planForQuestion(db, q.id)) !== filters.reviewLevel
      ) {
        return false;
      }
      if (filters.timeRange === "7d") {
        const cut = toISODate(addDays(new Date(), -7));
        if (toISODate(new Date(q.createdAt)) < cut) return false;
      }
      if (filters.timeRange === "30d") {
        const cut = toISODate(addDays(new Date(), -30));
        if (toISODate(new Date(q.createdAt)) < cut) return false;
      }
      if (
        search &&
        ![q.stem, q.knowledgePoint, q.subject, q.answer, q.analysis]
          .join(" ")
          .toLowerCase()
          .includes(search)
      ) {
        return false;
      }
      return true;
    });

  const sort = filters.sort ?? "due";
  rows.sort((a, b) => {
    if (sort === "created") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sort === "mastery") {
      return a.mastery - b.mastery;
    }
    if (sort === "accuracy") {
      return accuracyOf(db, a.id) - accuracyOf(db, b.id);
    }
    const aDue = planForQuestion(db, a.id)?.dueDate ?? a.createdAt;
    const bDue = planForQuestion(db, b.id)?.dueDate ?? b.createdAt;
    return new Date(aDue).getTime() - new Date(bDue).getTime();
  });

  const total = rows.length;
  const items = rows.slice((page - 1) * pageSize, page * pageSize);
  return {
    items: items.map((q) => ({
      ...q,
      reviewPlan: planForQuestion(db, q.id),
      reviewLevel: reviewLevelOf(planForQuestion(db, q.id)),
      accuracy: accuracyOf(db, q.id)
    })),
    total,
    page,
    pageSize
  };
}

function planForQuestion(db: DBShape, questionId: string) {
  const question = db.questions.find((q) => q.id === questionId);
  if (!question || question.userId !== getCurrentUserId()) return undefined;
  return db.reviewPlans.find((p) => p.questionId === questionId);
}

function accuracyOf(db: DBShape, questionId: string) {
  const question = db.questions.find((q) => q.id === questionId);
  if (!question || question.userId !== getCurrentUserId()) return 0;
  const logs = db.reviewLogs
    .filter((l) => l.questionId === questionId)
    .slice(-10);
  if (!logs.length) return 0;
  return Math.round(
    (logs.filter((l) => l.isCorrect).length / logs.length) * 100
  );
}

export async function createQuestions(
  inputs: Array<{
    stem: string;
    answer: string;
    analysis: string;
    subject: string;
    knowledgePoint: string;
    wrongReason: string;
    notebookId?: string;
    confidence?: string;
    source?: string;
  }>
) {
  const db = await readDb();
  const now = new Date().toISOString();
  const created: Question[] = [];
  const duplicates: string[] = [];

  for (const input of inputs) {
    if (!input.stem?.trim()) continue;
    const duplicate = db.questions.some(
      (q) =>
        q.userId === getCurrentUserId() &&
        !q.deletedAt &&
        similarity(q.stem, input.stem) > 0.9 &&
        q.subject === input.subject
    );
    if (duplicate) {
      duplicates.push(input.stem);
      continue;
    }
    const question: Question = {
      id: uid(),
      userId: getCurrentUserId(),
      notebookId: input.notebookId,
      subject: input.subject || "未分类",
      knowledgePoint: input.knowledgePoint || "未归类",
      wrongReason: input.wrongReason || "待确认",
      stem: input.stem,
      answer: input.answer,
      analysis: input.analysis,
      confidence: (input.confidence as Question["confidence"]) || "medium",
      mastery: 0,
      source: (input.source as Question["source"]) || "manual",
      createdAt: now,
      updatedAt: now,
      metadata: {}
    };
    db.questions.push(question);
    db.reviewPlans.push({
      id: uid(),
      questionId: question.id,
      repetitionCount: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      dueDate: now,
      paused: false,
      mastered: false,
      updatedAt: now
    });
    created.push(question);
  }

  await persistDb(db);
  return { created, duplicates };
}

export async function updateQuestion(
  id: string,
  input: Partial<Pick<Question, "stem" | "answer" | "analysis" | "subject" | "knowledgePoint" | "wrongReason" | "mastery">> & {
    notebookId?: string | null;
  }
) {
  const db = await readDb();
  const question = db.questions.find(
    (q) => q.userId === getCurrentUserId() && q.id === id && !q.deletedAt
  );
  if (!question) throw new Error("错题不存在");
  const { notebookId, ...rest } = input;
  Object.assign(question, rest, { updatedAt: new Date().toISOString() });
  if (notebookId !== undefined) {
    question.notebookId = notebookId ?? undefined;
  }
  await persistDb(db);
  return question;
}

export async function deleteQuestions(ids: string[]) {
  const db = await readDb();
  const now = new Date().toISOString();
  ids.forEach((id) => {
    const q = db.questions.find(
      (item) =>
        item.userId === getCurrentUserId() && item.id === id && !item.deletedAt
    );
    if (q) q.deletedAt = now;
  });
  await persistDb(db);
  return { deleted: ids.length };
}

export async function moveQuestions(ids: string[], notebookId?: string) {
  const db = await readDb();
  ids.forEach((id) => {
    const q = db.questions.find(
      (item) =>
        item.userId === getCurrentUserId() && item.id === id && !item.deletedAt
    );
    if (q) q.notebookId = notebookId;
  });
  await persistDb(db);
  return { moved: ids.length };
}

export async function getQuestion(id: string) {
  const db = await readDb();
  const question = db.questions.find(
    (q) => q.userId === getCurrentUserId() && q.id === id && !q.deletedAt
  );
  if (!question) return null;
  return {
    ...question,
    reviewPlan: planForQuestion(db, id),
    reviewLevel: reviewLevelOf(planForQuestion(db, id)),
    accuracy: accuracyOf(db, id)
  };
}

export async function getStats(): Promise<StatsData> {
  const db = await readDb();
  const questionIds = new Set(
    db.questions
      .filter((q) => q.userId === getCurrentUserId() && !q.deletedAt)
      .map((q) => q.id)
  );
  const questions = db.questions.filter((q) => questionIds.has(q.id));
  const logs = db.reviewLogs.filter((l) => questionIds.has(l.questionId));
  const today = todayISO();

  const trend: TrendPoint[] = Array.from({ length: 30 }, (_, i) => {
    const date = toISODate(addDays(new Date(), i - 29));
    const dayLogs = logs.filter((l) => toISODate(new Date(l.reviewedAt)) === date);
    const added = questions.filter(
      (q) => toISODate(new Date(q.createdAt)) === date
    ).length;
    const correct = dayLogs.filter((l) => l.isCorrect).length;
    return {
      date,
      added,
      reviewed: dayLogs.length,
      accuracy: dayLogs.length ? Math.round((correct / dayLogs.length) * 100) : 0
    };
  });

  const subjectMap = new Map<string, Question[]>();
  questions.forEach((q) => {
    const list = subjectMap.get(q.subject) ?? [];
    list.push(q);
    subjectMap.set(q.subject, list);
  });

  const colorMap: Record<string, string> = {
    数学: "#007AFF",
    英语: "#34C759",
    物理: "#FF9500",
    化学: "#AF52DE"
  };

  const subjects: SubjectStat[] = Array.from(subjectMap.entries()).map(
    ([subject, list]) => ({
      subject,
      count: list.length,
      mastery: Math.round(
        list.reduce((sum, q) => sum + q.mastery, 0) / list.length
      ),
      color: colorMap[subject] ?? "#5AC8FA"
    })
  );

  const knowledgeMap = new Map<string, KnowledgeNode>();
  questions.forEach((q) => {
    const key = `${q.subject}|${q.knowledgePoint}`;
    const node = knowledgeMap.get(key) ?? {
      id: key,
      subject: q.subject,
      name: q.knowledgePoint,
      mastery: 0,
      questionCount: 0
    };
    node.mastery = Math.round(
      (node.mastery * node.questionCount + q.mastery) / (node.questionCount + 1)
    );
    node.questionCount += 1;
    knowledgeMap.set(key, node);
  });

  const knowledge = Array.from(knowledgeMap.values()).sort(
    (a, b) => a.mastery - b.mastery
  );
  const weakTop: WeakPoint[] = knowledge.slice(0, 5).map((n) => ({
    subject: n.subject,
    name: n.name,
    mastery: n.mastery,
    questionCount: n.questionCount
  }));

  const overallAccuracy = logs.length
    ? Math.round(
        (logs.filter((l) => l.isCorrect).length / logs.length) * 100
      )
    : 0;
  const dueToday = db.reviewPlans.filter(
    (p) =>
      questionIds.has(p.questionId) &&
      !p.paused &&
      !p.mastered &&
      toISODate(new Date(p.dueDate)) <= today
  ).length;

  return {
    summary: {
      totalQuestions: questions.length,
      totalReviews: logs.length,
      overallAccuracy,
      dueToday
    },
    trend,
    subjects,
    knowledge,
    weakTop
  };
}

export async function getPlans(): Promise<PlansData> {
  const db = await readDb();
  const today = todayISO();
  const questionIds = new Set(
    db.questions
      .filter((q) => q.userId === getCurrentUserId() && !q.deletedAt)
      .map((q) => q.id)
  );
  const activePlans = db.reviewPlans.filter(
    (p) => questionIds.has(p.questionId) && !p.paused && !p.mastered
  );
  const todayQuestions = db.questions.filter(
    (q) =>
      q.userId === getCurrentUserId() &&
      !q.deletedAt &&
      activePlans.some(
        (p) => p.questionId === q.id && toISODate(new Date(p.dueDate)) <= today
      )
  );

  const next7: PlansData["next7"] = Array.from({ length: 7 }, (_, i) => {
    const date = toISODate(addDays(new Date(), i));
    const count = activePlans.filter(
      (p) => toISODate(new Date(p.dueDate)) === date
    ).length;
    return { date, count, minutes: count * 3 };
  });

  const weekStart = startOfWeek();
  const weekly: PlansData["weekly"] = Array.from({ length: 7 }, (_, i) => {
    const date = toISODate(addDays(weekStart, i));
    const count = activePlans.filter(
      (p) => toISODate(new Date(p.dueDate)) === date
    ).length;
    return { date, count, minutes: count * 3 };
  });

  const upcomingQuestions = next7
    .map((day) => ({
      date: day.date,
      questions: db.questions.filter(
        (q) =>
          q.userId === getCurrentUserId() &&
          !q.deletedAt &&
          activePlans.some(
            (p) =>
              p.questionId === q.id && toISODate(new Date(p.dueDate)) === day.date
          )
      )
    }))
    .filter((day) => day.questions.length > 0);

  const settings = db.settings[getCurrentUserId()] ?? {
    reminderTime: "20:00",
    notifyEnabled: false,
    examDays: 7,
    onboardingDone: false
  };

  return {
    dueToday: todayQuestions.length,
    next7,
    weekly,
    todayQuestions,
    upcomingQuestions,
    settings
  };
}

export async function updatePlanSettings(input: {
  reminderTime?: string;
  notifyEnabled?: boolean;
  examDate?: string;
  examDays?: number;
  onboardingDone?: boolean;
}) {
  const db = await readDb();
  const settings = (db.settings[getCurrentUserId()] ??= {
    reminderTime: "20:00",
    notifyEnabled: false,
    examDays: 7,
    onboardingDone: false
  });
  Object.assign(settings, input);
  await persistDb(db);
  return settings;
}

export async function updateSm2(questionId: string, quality: number) {
  const db = await readDb();
  const plan = db.reviewPlans.find((p) => p.questionId === questionId);
  const q = db.questions.find(
    (item) => item.userId === getCurrentUserId() && item.id === questionId
  );
  if (!plan || !q) throw new Error("复习计划不存在");
  if (quality < 3) {
    plan.repetitionCount = 0;
    plan.intervalDays = 1;
    plan.easeFactor = Math.max(1.3, plan.easeFactor - 0.2);
  } else {
    plan.repetitionCount += 1;
    if (plan.repetitionCount === 1) plan.intervalDays = 1;
    else if (plan.repetitionCount === 2) plan.intervalDays = 6;
    else plan.intervalDays = Math.round(plan.intervalDays * plan.easeFactor);
    plan.easeFactor = Math.min(2.5, plan.easeFactor + 0.1);
  }
  plan.dueDate = addDays(new Date(), plan.intervalDays).toISOString();
  plan.updatedAt = new Date().toISOString();

  const recentLogs = db.reviewLogs
    .filter((l) => l.questionId === questionId)
    .slice(-9);
  const recentAccuracy = recentLogs.length
    ? recentLogs.filter((l) => l.isCorrect).length / recentLogs.length
    : 0;
  const sm2Level = plan.easeFactor / 2.5;
  q.mastery = clampScore(recentAccuracy * 70 + sm2Level * 30);

  await persistDb(db);
  return plan;
}

export async function addReviewLog(log: Omit<ReviewLog, "id">) {
  const db = await readDb();
  const reviewLog: ReviewLog = {
    ...log,
    id: uid()
  };
  db.reviewLogs.push(reviewLog);
  await persistDb(db);
  return reviewLog;
}

export async function gradeQuestion(
  question: Question,
  answer: string,
  modelAnswer: string
): Promise<GradeResult> {
  const normalizedAnswer = answer.trim();
  const normalizedModel = modelAnswer.trim();
  const isCorrect =
    normalizedAnswer.length > 0 &&
    (normalizedModel.includes(normalizedAnswer) ||
      normalizedAnswer.includes(normalizedModel.slice(0, 12)) ||
      normalizedAnswer === normalizedModel);
  const score = isCorrect ? 80 + Math.min(20, normalizedAnswer.length % 20) : 30;
  const quality = isCorrect ? (score >= 90 ? 5 : 4) : 2;
  return {
    score,
    isCorrect,
    modelAnswer: normalizedModel,
    analysis: isCorrect
      ? "作答与标准答案一致，说明该知识点掌握良好。"
      : `标准答案为：${normalizedModel}。建议先核对关键步骤，再重做一次同类变式题。`,
    wrongReasonDiagnosis: isCorrect
      ? "无显著错因"
      : "答案与标准答案不一致，可能是概念或计算环节出现偏差。",
    quality
  };
}

export async function addChatQuestion(input: {
  stem: string;
  answer?: string;
  subject?: string;
  knowledgePoint?: string;
  conversationId: string;
  messageId: string;
}) {
  const db = await readDb();
  const conversation = db.conversations.find(
    (c) => c.userId === getCurrentUserId() && c.id === input.conversationId
  );
  if (!conversation) throw new Error("会话不存在");
  const created = await createQuestions([
    {
      stem: input.stem,
      answer: input.answer ?? "",
      analysis: "来自 AI 对话，请根据题目内容补充解析。",
      subject: input.subject ?? "未分类",
      knowledgePoint: input.knowledgePoint ?? "对话摘录",
      wrongReason: "对话答疑中收录",
      source: "chat"
    }
  ]);
  const message = db.messages.find(
    (m) => m.id === input.messageId && m.conversationId === input.conversationId
  );
  if (message) message.addedToBook = true;
  await persistDb(db);
  return created;
}

export async function getUsage(): Promise<UsageData> {
  const db = await readDb();
  const limit = 25000;
  const used = db.usage.ocrUsed;
  const remaining = Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    warning: remaining / limit < 0.2,
    demo: !process.env.OCR_SPACE_API_KEY
  };
}

export async function incrementOcrUsage() {
  const db = await readDb();
  db.usage.ocrUsed += 1;
  await persistDb(db);
}

export async function listConversations() {
  const db = await readDb();
  return db.conversations
    .filter((c) => c.userId === getCurrentUserId())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function createConversation(input: { title: string; subject: string }) {
  const db = await readDb();
  const conversation = {
    id: uid(),
    userId: getCurrentUserId(),
    title: input.title,
    subject: input.subject,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.conversations.push(conversation);
  await persistDb(db);
  return conversation;
}

export async function updateConversation(
  id: string,
  input: { title?: string; subject?: string }
) {
  const db = await readDb();
  const conversation = db.conversations.find(
    (c) => c.userId === getCurrentUserId() && c.id === id
  );
  if (!conversation) throw new Error("会话不存在");
  Object.assign(conversation, input, { updatedAt: new Date().toISOString() });
  await persistDb(db);
  return conversation;
}

export async function deleteConversation(id: string) {
  const db = await readDb();
  const conversation = db.conversations.find(
    (c) => c.userId === getCurrentUserId() && c.id === id
  );
  if (!conversation) throw new Error("会话不存在");
  db.conversations = db.conversations.filter((c) => c.id !== id);
  db.messages = db.messages.filter((m) => m.conversationId !== id);
  await persistDb(db);
  return { deleted: true };
}

export async function getMessages(conversationId: string) {
  const db = await readDb();
  const conversation = db.conversations.find(
    (c) => c.userId === getCurrentUserId() && c.id === conversationId
  );
  if (!conversation) return [];
  return db.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function addMessage(
  input: Omit<Message, "id" | "createdAt">
) {
  const db = await readDb();
  const conversation = db.conversations.find(
    (c) => c.userId === getCurrentUserId() && c.id === input.conversationId
  );
  if (!conversation) throw new Error("会话不存在");
  const message: Message = {
    ...input,
    id: uid(),
    createdAt: new Date().toISOString()
  };
  db.messages.push(message);
  if (conversation) {
    conversation.updatedAt = message.createdAt;
    if (input.role === "user" && conversation.title === "新会话") {
      conversation.title = input.content.slice(0, 14);
    }
  }
  await persistDb(db);
  return message;
}

export async function addContactRequest(input: {
  email: string;
  category: string;
  content: string;
}) {
  const db = await readDb();
  db.contactRequests.push({
    id: uid(),
    userId: getCurrentUserId(),
    ...input,
    createdAt: new Date().toISOString()
  });
  await persistDb(db);
  return { ok: true };
}

export async function extractCandidatesFromChat(
  content: string
): Promise<RecognitionCandidate[]> {
  const candidates: RecognitionCandidate[] = [];
  const lines = content
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const subject = /数学|物理|化学|英语|语文|生物/.exec(content)?.[0] ?? "数学";
  const knowledgePoint =
    /(二次函数|三角函数|虚拟语气|牛顿第二定律|氧化还原|数列|电功率|概率|物质的量|定语从句)/.exec(
      content
    )?.[1] ?? "综合知识";
  const stemLine = lines.find(
    (line) => line.includes("？") || line.includes("?") || line.includes("求")
  );
  if (stemLine) {
    candidates.push({
      id: uid(),
      stem: stemLine,
      answer:
        lines.find((line) => line.startsWith("答案"))?.replace(/^答案[:：]/, "") ??
        "请结合知识点补全答案",
      analysis: `本题考察${knowledgePoint}，请先梳理已知条件，再按该知识点的标准步骤求解。`,
      subject,
      knowledgePoint,
      wrongReason: "对话摘录，待确认",
      confidence: "medium",
      selected: true
    });
  }
  return candidates;
}
