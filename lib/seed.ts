import { uid } from "./utils";
import { addDays } from "./date";
import { hashPassword } from "./password";
import type { DBShape, Question, ReviewLog, ReviewPlan } from "./types";

function isoFrom(date: Date) {
  return date.toISOString();
}

export function createSeedDb(): DBShape {
  const now = new Date();
  const userId = "demo-user";
  const notebooks = [
    {
      id: "nb-math",
      userId,
      name: "数学冲刺",
      color: "#007AFF",
      defaultSubject: "数学",
      sortOrder: 0,
      createdAt: isoFrom(addDays(now, -18))
    },
    {
      id: "nb-english",
      userId,
      name: "英语语法",
      color: "#34C759",
      defaultSubject: "英语",
      sortOrder: 1,
      createdAt: isoFrom(addDays(now, -15))
    },
    {
      id: "nb-physics",
      userId,
      name: "物理错题",
      color: "#FF9500",
      defaultSubject: "物理",
      sortOrder: 2,
      createdAt: isoFrom(addDays(now, -9))
    },
    {
      id: "nb-chemistry",
      userId,
      name: "化学基础",
      color: "#AF52DE",
      defaultSubject: "化学",
      sortOrder: 3,
      createdAt: isoFrom(addDays(now, -5))
    }
  ];

  const rawQuestions = [
    {
      id: "q-math-1",
      notebookId: "nb-math",
      subject: "数学",
      knowledgePoint: "二次函数",
      wrongReason: "顶点公式记忆错误",
      stem: "已知二次函数 y = x² - 4x + 3，求该抛物线的顶点坐标。",
      answer: "顶点为 (2, -1)",
      analysis:
        "将一般式配方为 y = (x - 2)² - 1，因此顶点坐标为 (2, -1)，对称轴为 x = 2。",
      mastery: 42
    },
    {
      id: "q-math-2",
      notebookId: "nb-math",
      subject: "数学",
      knowledgePoint: "一元二次方程",
      wrongReason: "判别式符号判断错误",
      stem: "判断方程 x² - 2x + 5 = 0 的实数根情况。",
      answer: "无实数根，判别式 Δ = -16 < 0",
      analysis:
        "Δ = (-2)² - 4 × 1 × 5 = -16 < 0，因此方程无实数根，有两个共轭复数根。",
      mastery: 58
    },
    {
      id: "q-math-3",
      notebookId: "nb-math",
      subject: "数学",
      knowledgePoint: "数列求和",
      wrongReason: "错位相减漏项",
      stem: "求数列 1, 2, 3, ..., n 的前 n 项和公式。",
      answer: "Sₙ = n(n + 1) / 2",
      analysis: "等差数列首项 1、公差 1，前 n 项和公式为 n(a₁ + aₙ)/2。",
      mastery: 66
    },
    {
      id: "q-math-4",
      notebookId: "nb-math",
      subject: "数学",
      knowledgePoint: "三角函数最值",
      wrongReason: "未考虑定义域",
      stem: "求函数 y = 2sin(x) + 1 在 [0, π] 上的最大值。",
      answer: "最大值是 3，在 x = π/2 时取得",
      analysis: "sin(x) 在 [0, π] 上最大值为 1，因此 y 最大值为 2 × 1 + 1 = 3。",
      mastery: 31
    },
    {
      id: "q-math-5",
      notebookId: "nb-math",
      subject: "数学",
      knowledgePoint: "平面向量",
      wrongReason: "夹角余弦公式混淆",
      stem: "向量 a = (1, 2)，b = (3, 4)，求 a · b。",
      answer: "a · b = 1 × 3 + 2 × 4 = 11",
      analysis: "数量积为对应坐标乘积之和，与夹角无关。",
      mastery: 74
    },
    {
      id: "q-math-6",
      notebookId: "nb-math",
      subject: "数学",
      knowledgePoint: "概率计算",
      wrongReason: "计数时重复计算",
      stem: "从 5 本不同书中任选 2 本，有多少种选法？",
      answer: "C(5,2) = 10 种",
      analysis: "组合数 C(5,2) = 5 × 4 / 2 = 10，选法不区分顺序。",
      mastery: 81
    },
    {
      id: "q-english-1",
      notebookId: "nb-english",
      subject: "英语",
      knowledgePoint: "虚拟语气",
      wrongReason: "主句时态搭配错误",
      stem: "If I ___ you, I would study harder. 填入正确形式。",
      answer: "were",
      analysis: "与现在事实相反的虚拟条件句，be 动词一律用 were。",
      mastery: 45
    },
    {
      id: "q-english-2",
      notebookId: "nb-english",
      subject: "英语",
      knowledgePoint: "定语从句",
      wrongReason: "关系代词选择错误",
      stem: "This is the book ___ I told you about. 填入合适的关系词。",
      answer: "that / which",
      analysis: "先行词 book 在从句中作 about 的宾语，可用 that 或 which，也可省略。",
      mastery: 61
    },
    {
      id: "q-english-3",
      notebookId: "nb-english",
      subject: "英语",
      knowledgePoint: "非谓语动词",
      wrongReason: "动名词与不定式混用",
      stem: "He enjoys ___ (read) English novels every weekend.",
      answer: "reading",
      analysis: "enjoy 后接动名词作宾语，因此填 reading。",
      mastery: 36
    },
    {
      id: "q-physics-1",
      notebookId: "nb-physics",
      subject: "物理",
      knowledgePoint: "牛顿第二定律",
      wrongReason: "合外力分析漏力",
      stem: "质量为 2kg 的物体受到 10N 水平力和 2N 摩擦力，求加速度。",
      answer: "a = 4 m/s²",
      analysis: "合外力 F = 10 - 2 = 8N，由 F = ma 得 a = 8 / 2 = 4 m/s²。",
      mastery: 28
    },
    {
      id: "q-physics-2",
      notebookId: "nb-physics",
      subject: "物理",
      knowledgePoint: "电功率",
      wrongReason: "功率与电能混淆",
      stem: "额定电压 220V、电流 0.5A 的电器，电功率是多少？",
      answer: "P = 110W",
      analysis: "P = UI = 220 × 0.5 = 110W。",
      mastery: 52
    },
    {
      id: "q-physics-3",
      notebookId: "nb-physics",
      subject: "物理",
      knowledgePoint: "平抛运动",
      wrongReason: "水平竖直分解错误",
      stem: "小球从 20m 高处水平抛出，忽略空气阻力，落地需要多久？",
      answer: "t = 2s",
      analysis: "竖直方向 h = ½gt²，20 = 5t²，得 t = 2s。",
      mastery: 48
    },
    {
      id: "q-chem-1",
      notebookId: "nb-chemistry",
      subject: "化学",
      knowledgePoint: "氧化还原反应",
      wrongReason: "化合价升降判断错误",
      stem: "反应 2H₂ + O₂ → 2H₂O 中，氢元素的化合价如何变化？",
      answer: "由 0 价升高到 +1 价，发生氧化反应",
      analysis: "单质中 H 为 0 价，H₂O 中 H 为 +1 价，化合价升高，被氧化。",
      mastery: 39
    },
    {
      id: "q-chem-2",
      notebookId: "nb-chemistry",
      subject: "化学",
      knowledgePoint: "化学方程式配平",
      wrongReason: "配平顺序不当",
      stem: "配平：Al + O₂ → Al₂O₃",
      answer: "4Al + 3O₂ = 2Al₂O₃",
      analysis: "先配金属和氧，最终系数为 4、3、2。",
      mastery: 72
    },
    {
      id: "q-chem-3",
      notebookId: "nb-chemistry",
      subject: "化学",
      knowledgePoint: "物质的量",
      wrongReason: "摩尔质量单位错误",
      stem: "2mol H₂O 的质量是多少？（H₂O 摩尔质量为 18 g/mol）",
      answer: "36g",
      analysis: "m = n × M = 2 × 18 = 36g。",
      mastery: 64
    }
  ];

  const questions: Question[] = rawQuestions.map((q, index) => ({
    id: q.id,
    userId,
    notebookId: q.notebookId,
    subject: q.subject,
    knowledgePoint: q.knowledgePoint,
    wrongReason: q.wrongReason,
    stem: q.stem,
    answer: q.answer,
    analysis: q.analysis,
    confidence: "high",
    mastery: q.mastery,
    source: index % 3 === 0 ? "image" : index % 3 === 1 ? "text" : "manual",
    createdAt: isoFrom(addDays(now, -(18 - index))),
    updatedAt: isoFrom(addDays(now, -(18 - index))),
    metadata: {}
  }));

  const reviewPlans: ReviewPlan[] = questions.map((q, index) => {
    const offset = index % 9;
    const dueOffset = [0, 1, 2, 0, 3, 4, 1, 5, 6, 2, 0, 7, 3, 8, 1][index] ?? offset;
    return {
      id: `plan-${q.id}`,
      questionId: q.id,
      repetitionCount: (index % 5) + 1,
      intervalDays: [1, 6, 16, 35, 90][index % 5],
      easeFactor: Math.max(1.3, Math.min(2.5, 2.5 + (index % 5) * 0.1 - (index % 2) * 0.2)),
      dueDate: isoFrom(addDays(now, dueOffset)),
      paused: index === 4,
      mastered: index === 5 || index === 8,
      updatedAt: isoFrom(addDays(now, -Math.min(9, index + 1)))
    };
  });

  const reviewLogs: ReviewLog[] = questions.map((q, index) => ({
    id: `log-${q.id}`,
    questionId: q.id,
    score: q.mastery + (index % 3) * 5,
    isCorrect: q.mastery >= 60,
    quality: q.mastery >= 80 ? 5 : q.mastery >= 60 ? 4 : q.mastery >= 40 ? 3 : 2,
    aiFeedback:
      q.mastery >= 60
        ? "本题掌握良好，继续保持当前复习间隔。"
        : "建议重做同类题目并整理错因。",
    reviewedAt: isoFrom(addDays(now, -Math.max(1, (18 - index) % 10)))
  }));

  const conversations = [
    {
      id: "conv-1",
      userId,
      title: "二次函数答疑",
      subject: "数学",
      createdAt: isoFrom(addDays(now, -1)),
      updatedAt: isoFrom(addDays(now, -1))
    },
    {
      id: "conv-2",
      userId,
      title: "虚拟语气复习",
      subject: "英语",
      createdAt: isoFrom(addDays(now, -3)),
      updatedAt: isoFrom(addDays(now, -3))
    }
  ];

  const messages = [
    {
      id: "msg-1",
      conversationId: "conv-1",
      role: "user" as const,
      content: "为什么二次函数 y=x²-4x+3 的顶点是 (2,-1)？",
      createdAt: isoFrom(addDays(now, -1))
    },
    {
      id: "msg-2",
      conversationId: "conv-1",
      role: "assistant" as const,
      content:
        "把一般式配方：y=(x-2)²-1。顶点坐标直接读为 (2,-1)。练习：求 y=x²-6x+8 的顶点坐标，答案是 (3,-1)。",
      containsQuestion: true,
      createdAt: isoFrom(addDays(now, -1))
    },
    {
      id: "msg-3",
      conversationId: "conv-2",
      role: "user" as const,
      content: "If I were you, I would study harder 是什么从句？",
      createdAt: isoFrom(addDays(now, -3))
    },
    {
      id: "msg-4",
      conversationId: "conv-2",
      role: "assistant" as const,
      content:
        "这是与现在事实相反的虚拟条件句，if 从句用 were，主句用 would + 动词原形。",
      createdAt: isoFrom(addDays(now, -3))
    }
  ];

  return {
    users: [
      {
        id: userId,
        email: "demo@recall.app",
        passwordHash: hashPassword("recall123"),
        name: "小昭",
        createdAt: isoFrom(addDays(now, -20))
      }
    ],
    notebooks,
    questions,
    reviewPlans,
    reviewLogs,
    conversations,
    messages,
    contactRequests: [],
    usage: { ocrUsed: 823 },
    settings: {
      [userId]: {
        reminderTime: "20:00",
        notifyEnabled: false,
        examDays: 7,
        onboardingDone: false
      }
    }
  };
}
