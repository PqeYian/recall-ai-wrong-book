export type Confidence = "high" | "medium" | "low";
export type ReviewMode = "today" | "free";
export type SourceType = "image" | "text" | "chat" | "manual";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  sessionToken?: string;
  createdAt: string;
}

export interface Notebook {
  id: string;
  userId: string;
  name: string;
  color: string;
  defaultSubject: string;
  sortOrder?: number;
  createdAt: string;
  deletedAt?: string;
}

export interface Question {
  id: string;
  userId: string;
  notebookId?: string;
  subject: string;
  knowledgePoint: string;
  wrongReason: string;
  stem: string;
  answer: string;
  analysis: string;
  imageUrl?: string;
  confidence?: Confidence;
  mastery: number;
  source: SourceType;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  metadata: Record<string, unknown>;
}

export interface ReviewPlan {
  id: string;
  questionId: string;
  repetitionCount: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string;
  paused: boolean;
  mastered: boolean;
  updatedAt: string;
}

export interface ReviewLog {
  id: string;
  questionId: string;
  score: number;
  isCorrect: boolean;
  quality: number;
  aiFeedback: string;
  reviewedAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  containsQuestion?: boolean;
  addedToBook?: boolean;
  createdAt: string;
}

export interface ContactRequest {
  id: string;
  userId?: string;
  email: string;
  category: string;
  content: string;
  createdAt: string;
}

export interface RecognitionCandidate {
  id: string;
  stem: string;
  answer: string;
  analysis: string;
  subject: string;
  knowledgePoint: string;
  wrongReason: string;
  confidence: Confidence;
  selected: boolean;
}

export interface Variant {
  id: string;
  questionId: string;
  stem: string;
  options?: string[];
  answer: string;
  knowledgePoint: string;
}

export interface GradeResult {
  score: number;
  isCorrect: boolean;
  modelAnswer: string;
  analysis: string;
  wrongReasonDiagnosis: string;
  quality: number;
}

export interface ReviewQuestion {
  variant: Variant;
  originalQuestion: Question;
}

export interface ReviewAnswer {
  questionId: string;
  variantId: string;
  answer: string;
  skipped?: boolean;
}

export interface TrendPoint {
  date: string;
  added: number;
  reviewed: number;
  accuracy: number;
}

export interface SubjectStat {
  subject: string;
  count: number;
  mastery: number;
  color: string;
}

export interface KnowledgeNode {
  id: string;
  subject: string;
  name: string;
  mastery: number;
  questionCount: number;
}

export interface WeakPoint {
  subject: string;
  name: string;
  mastery: number;
  questionCount: number;
}

export interface StatsData {
  summary: {
    totalQuestions: number;
    totalReviews: number;
    overallAccuracy: number;
    dueToday: number;
  };
  trend: TrendPoint[];
  subjects: SubjectStat[];
  knowledge: KnowledgeNode[];
  weakTop: WeakPoint[];
}

export interface DayCount {
  date: string;
  count: number;
  minutes: number;
}

export interface PlansData {
  dueToday: number;
  next7: DayCount[];
  weekly: DayCount[];
  todayQuestions: Question[];
  upcomingQuestions: Array<{ date: string; questions: Question[] }>;
  settings: {
    reminderTime: string;
    notifyEnabled: boolean;
    examDate?: string;
    examDays: number;
    onboardingDone?: boolean;
  };
}

export interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  warning: boolean;
  demo: boolean;
}

export interface DBShape {
  users: UserProfile[];
  notebooks: Notebook[];
  questions: Question[];
  reviewPlans: ReviewPlan[];
  reviewLogs: ReviewLog[];
  conversations: Conversation[];
  messages: Message[];
  contactRequests: ContactRequest[];
  usage: { ocrUsed: number };
  settings: Record<string, {
    reminderTime: string;
    notifyEnabled: boolean;
    examDate?: string;
    examDays: number;
    onboardingDone: boolean;
  }>;
}
