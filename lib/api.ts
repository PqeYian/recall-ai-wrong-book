import type {
  Conversation,
  GradeResult,
  Message,
  Notebook,
  PlansData,
  Question,
  RecognitionCandidate,
  ReviewAnswer,
  ReviewQuestion,
  StatsData,
  UsageData,
  Variant
} from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body as { error?: string }).error;
    throw new Error(message || `请求失败（${response.status}）`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  me: () =>
    request<{ user: { id: string; email: string; name: string } | null }>(
      "/api/auth/me"
    ),
  login: (email: string, password: string) =>
    request<{ ok: boolean }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  register: (email: string, password: string, name: string) =>
    request<{ ok: boolean; needsEmailConfirmation?: boolean }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name })
    }),
  logout: () =>
    request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  updateName: (name: string) =>
    request<{ ok: boolean; name: string }>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({ name })
    }),
  forgotPassword: (email: string) =>
    request<{ ok: boolean }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email })
    }),
  resetPassword: (token: string, password: string) =>
    request<{ ok: boolean }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password })
    }),
  sendOtp: (email: string) =>
    request<{ ok: boolean }>("/api/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ email })
    }),
  verifyOtp: (email: string, token: string, type: "email" | "signup" = "email") =>
    request<{ ok: boolean }>("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, token, type })
    }),
  notebooks: () =>
    request<Array<Notebook & { questionCount: number }>>("/api/notebooks"),
  createNotebook: (input: {
    name: string;
    color: string;
    defaultSubject: string;
  }) =>
    request<Notebook>("/api/notebooks", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  updateNotebook: (
    id: string,
    input: Partial<
      Pick<Notebook, "name" | "color" | "defaultSubject" | "sortOrder">
    >
  ) =>
    request<Notebook>(`/api/notebooks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }),
  reorderNotebooks: (ids: string[]) =>
    request<{ reordered: number }>("/api/notebooks/reorder", {
      method: "POST",
      body: JSON.stringify({ ids })
    }),
  deleteNotebook: (id: string) =>
    request<{ removedQuestions: number }>(`/api/notebooks/${id}`, {
      method: "DELETE"
    }),
  questions: (filters: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    return request<{
      items: Array<
        Question & {
          reviewLevel: string;
          accuracy: number;
          reviewPlan?: {
            dueDate: string;
            repetitionCount: number;
            paused: boolean;
            mastered: boolean;
          };
        }
      >;
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/questions?${params.toString()}`);
  },
  question: (id: string) =>
    request<
      Question & {
        reviewLevel: string;
        accuracy: number;
        reviewPlan?: {
          dueDate: string;
          repetitionCount: number;
          paused: boolean;
          mastered: boolean;
        };
      }
    >(`/api/questions/${id}`),
  createQuestions: (
    questions: Array<{
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
  ) =>
    request<{ created: Question[]; duplicates: string[] }>("/api/questions", {
      method: "POST",
      body: JSON.stringify({ questions })
    }),
  updateQuestion: (
    id: string,
    input: Partial<Question>
  ) =>
    request<Question>(`/api/questions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }),
  deleteQuestions: (ids: string[]) =>
    request<{ deleted: number }>("/api/questions", {
      method: "DELETE",
      body: JSON.stringify({ ids })
    }),
  moveQuestions: (ids: string[], notebookId?: string) =>
    request<{ moved: number }>("/api/questions", {
      method: "PATCH",
      body: JSON.stringify({ ids, notebookId })
    }),
  recognize: (body: FormData) =>
    request<{ candidates: RecognitionCandidate[]; ocrText: string }>(
      "/api/recognize",
      {
        method: "POST",
        body,
        headers: {}
      }
    ),
  reviewStart: (input: {
    subject?: string;
    notebookId?: string;
    count: number;
    mode: string;
  }) =>
    request<{ questions: ReviewQuestion[] }>("/api/review/start", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  reviewGrade: (input: ReviewAnswer & { variant: Variant }) =>
    request<GradeResult>("/api/review/grade", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  stats: () => request<StatsData>("/api/stats"),
  plans: () => request<PlansData>("/api/plans"),
  updatePlanSettings: (input: Record<string, unknown>) =>
    request<PlansData["settings"]>("/api/plans", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  usage: () => request<UsageData>("/api/usage/ocr"),
  conversations: () => request<Conversation[]>("/api/chat"),
  createConversation: (input: { title: string; subject: string }) =>
    request<Conversation>("/api/chat", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  updateConversation: (
    id: string,
    input: { title?: string; subject?: string }
  ) =>
    request<Conversation>(`/api/chat/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    }),
  deleteConversation: (id: string) =>
    request<{ deleted: boolean }>(`/api/chat/${id}`, {
      method: "DELETE"
    }),
  messages: (conversationId: string) =>
    request<Message[]>(`/api/chat/${conversationId}/messages`),
  sendMessage: (
    conversationId: string,
    input: { content: string; subject: string }
  ) =>
    request<Message>(`/api/chat/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(input)
    }),
  chatQuestion: (input: {
    conversationId: string;
    messageId: string;
    stem: string;
    answer?: string;
    subject?: string;
    knowledgePoint?: string;
  }) =>
    request<{ created: Question[] }>("/api/chat/question", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  contact: (input: { email: string; category: string; content: string }) =>
    request<{ ok: boolean }>("/api/help/contact", {
      method: "POST",
      body: JSON.stringify(input)
    })
};
