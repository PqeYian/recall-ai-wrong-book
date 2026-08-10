import { uid } from "../utils";
import type {
  GradeResult,
  Question,
  RecognitionCandidate,
  Variant
} from "../types";

const MATH_NOTATION_RULE =
  "数学公式必须使用人类可读的数学记号，例如 x²、xₙ、√4、½、Δ、π、≥、≤、≠；" +
  "禁止使用编程语法或标记，例如 ^、**、sqrt()、Math.pow、=>、==、\\(、\\)、\\[、\\]、$、\\frac、\\times；" +
  "不要输出 LaTeX 源码，直接用中文和数学符号书写。";

export interface AiProvider {
  splitAndStructure(text: string, subjectHint?: string): Promise<RecognitionCandidate[]>;
  chatStream(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    subject: string
  ): AsyncGenerator<string>;
  extractChatQuestion(content: string): Promise<RecognitionCandidate[]>;
  generateVariant(question: Question): Promise<Variant>;
  gradeAnswer(
    question: Question,
    variant: Variant,
    answer: string
  ): Promise<GradeResult>;
}

const VARIANT_TEMPLATES = [
  {
    stem: (q: Question) =>
      `将题目中的核心数据替换后重做：${q.knowledgePoint} 的一道变式题，请写出完整步骤。`,
    answer: (q: Question) => q.answer,
    options: undefined
  },
  {
    stem: (q: Question) =>
      `请判断以下说法是否与「${q.knowledgePoint}」的结论一致：${q.answer}。`,
    answer: () =>
      "需要依据原题推导过程判断，重点核对关键公式和符号。",
    options: ["正确", "错误", "无法判断"]
  },
  {
    stem: (q: Question) =>
      `换一种问法考查「${q.knowledgePoint}」：已知条件与本题相似，但所求变为取值范围，请求解。`,
    answer: (q: Question) => q.answer,
    options: undefined
  }
];

export class DemoAiProvider implements AiProvider {
  async splitAndStructure(text: string, subjectHint?: string) {
    const blocks = text
      .split(/\n{2,}|(?=\d+[.、])/)
      .map((block) => block.trim())
      .filter((block) => block.length >= 6);

    if (!blocks.length && text.trim().length >= 6) blocks.push(text.trim());
    if (!blocks.length) return [];

    return blocks.slice(0, 9).map((block, index) => {
      const subject = subjectHint ?? guessSubject(block);
      const knowledgePoint = guessKnowledgePoint(block, subject);
      const lines = block
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const answer =
        lines
          .find((line) => /^(答案|答)[:：]/.test(line))
          ?.replace(/^(答案|答)[:：]/, "") ?? "请结合解析补全答案";
      return {
        id: uid(),
        stem: block.replace(/^(答案|答)[:：].+$/m, "").trim(),
        answer,
        analysis: `本题对应「${subject}·${knowledgePoint}」，建议先还原标准步骤，再对照错因修正。`,
        subject,
        knowledgePoint,
        wrongReason: index % 2 === 0 ? "概念理解偏差" : "计算或推导失误",
        confidence: (index === 0 ? "high" : index < 3 ? "medium" : "low") as RecognitionCandidate["confidence"],
        selected: true
      };
    });
  }

  async *chatStream(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    subject: string
  ): AsyncGenerator<string> {
    const last = messages[messages.length - 1]?.content ?? "";
    const lines = [
      `我先从${subject || "通用"}角度分析这道问题。`,
      "先把已知条件和目标结果写清楚，再选择对应公式或定理。",
      `针对你的问题：${last.slice(0, 80)}。`,
      "关键步骤是列出等式并逐项检查符号，最后把答案代回验证。",
      "如果这道题需要加入错题本，可以直接点下方的「加入错题本」。"
    ];
    for (const line of lines) {
      for (const char of line) {
        yield char;
      }
      yield "\n";
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }

  async extractChatQuestion(content: string) {
    const stemMatch =
      content.match(/(?:练习|题目|题|求)[：: ]*([^\n。]{6,80})/) ?? null;
    if (!stemMatch) return [];
    const subject = guessSubject(content);
    const knowledgePoint = guessKnowledgePoint(content, subject);
    return [
      {
        id: uid(),
        stem: stemMatch[1],
        answer: content.match(/答案[：:]\s*([^\n。]+)/)?.[1] ?? "",
        analysis: `来自对话内容的「${knowledgePoint}」练习，建议按标准步骤补全解析。`,
        subject,
        knowledgePoint,
        wrongReason: "对话答疑中收录",
        confidence: "medium" as const,
        selected: true
      }
    ];
  }

  async generateVariant(question: Question): Promise<Variant> {
    const template = VARIANT_TEMPLATES[
      Math.abs(hashString(question.id)) % VARIANT_TEMPLATES.length
    ];
    return {
      id: uid(),
      questionId: question.id,
      stem: template.stem(question),
      options: template.options,
      answer: template.answer(question),
      knowledgePoint: question.knowledgePoint
    };
  }

  async gradeAnswer(
    question: Question,
    variant: Variant,
    answer: string
  ): Promise<GradeResult> {
    const normalizedAnswer = answer.trim();
    const normalizedModel = variant.answer.trim();
    const isCorrect =
      normalizedAnswer.length > 0 &&
      (normalizedModel.includes(normalizedAnswer) ||
        normalizedAnswer.includes(normalizedModel.slice(0, 12)) ||
        normalizedAnswer === normalizedModel);
    const score = isCorrect ? 85 + (normalizedAnswer.length % 15) : 30;
    return {
      score,
      isCorrect,
      modelAnswer: normalizedModel,
      analysis: isCorrect
        ? "答案方向正确，关键公式使用无误，可以进入下一题。"
        : `本题考察「${variant.knowledgePoint}」。标准答案：${normalizedModel}。请对照步骤找出偏差。`,
      wrongReasonDiagnosis: isCorrect
        ? "无明显错因"
        : "作答与标准答案不一致，建议回到原题重新推导。",
      quality: isCorrect ? (score >= 90 ? 5 : 4) : 2
    };
  }
}

export class DeepSeekProvider implements AiProvider {
  private baseUrl: string;
  private model: string;

  constructor(
    private apiKey: string,
    baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat"
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  private async complete(
    messages: Array<{ role: string; content: string }>,
    jsonMode = false
  ) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.3,
        response_format: jsonMode ? { type: "json_object" } : undefined
      })
    });
    if (!response.ok) {
      throw new Error(`DeepSeek 服务返回 ${response.status}`);
    }
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content ?? "";
  }

  async splitAndStructure(text: string, subjectHint?: string) {
    try {
      const content = await this.complete(
        [
          {
            role: "system",
            content:
              `你是错题结构化引擎。将用户提供的文本拆分为多道错题，输出 JSON：{candidates:[{stem,answer,analysis,subject,knowledgePoint,wrongReason,confidence}]}。confidence 只能是 high/medium/low。只输出 JSON，不要 Markdown 代码块，不要解释。${MATH_NOTATION_RULE}`
          },
          {
            role: "user",
            content: `学科提示：${subjectHint ?? "自动判断"}\n文本：\n${text}`
          }
        ],
        true
      );
      return parseCandidates(content);
    } catch (error) {
      if (isJsonParseError(error)) {
        return new DemoAiProvider().splitAndStructure(text, subjectHint);
      }
      throw error;
    }
  }

  async *chatStream(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    subject: string
  ): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `你是 Recall 的学习助手，当前学科上下文：${subject}。回答要简洁、步骤清晰。${MATH_NOTATION_RULE}`
          },
          ...messages
        ],
        stream: true
      })
    });
    if (!response.ok || !response.body) {
      throw new Error(`DeepSeek 流式服务返回 ${response.status}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.split("\n").find((l) => l.startsWith("data: "));
        if (!line || line.includes("[DONE]")) continue;
        try {
          const json = JSON.parse(line.slice(6)) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) yield delta;
        } catch {
          // Ignore malformed SSE frames.
        }
      }
    }
  }

  async extractChatQuestion(content: string) {
    try {
      const raw = await this.complete(
        [
          {
            role: "system",
            content:
              `从用户消息中提取题目。输出 JSON：{candidates:[{stem,answer,analysis,subject,knowledgePoint,wrongReason,confidence}]}。没有题目时 candidates 为空数组。只输出 JSON，不要 Markdown 代码块，不要解释。${MATH_NOTATION_RULE}`
          },
          { role: "user", content }
        ],
        true
      );
      return parseCandidates(raw);
    } catch (error) {
      if (isJsonParseError(error)) {
        return new DemoAiProvider().extractChatQuestion(content);
      }
      throw error;
    }
  }

  async generateVariant(question: Question) {
    try {
      const raw = await this.complete(
        [
          {
            role: "system",
            content:
              `你是出题老师。根据原题知识点生成一道同考点变式题，只改变数据与问法，不改变难度。输出 JSON：{stem,options,answer,knowledgePoint}。只输出 JSON，不要 Markdown 代码块，不要解释。${MATH_NOTATION_RULE}`
          },
          {
            role: "user",
            content: `学科：${question.subject}\n知识点：${question.knowledgePoint}\n原题：${question.stem}\n答案：${question.answer}`
          }
        ],
        true
      );
      const parsed = parseJsonContent(raw) as Partial<Variant> & { answer?: string };
      return {
        id: uid(),
        questionId: question.id,
        stem: parsed.stem ?? question.stem,
        options: parsed.options ?? undefined,
        answer: parsed.answer ?? question.answer,
        knowledgePoint: parsed.knowledgePoint ?? question.knowledgePoint
      };
    } catch (error) {
      if (isJsonParseError(error)) {
        return new DemoAiProvider().generateVariant(question);
      }
      throw error;
    }
  }

  async gradeAnswer(
    question: Question,
    variant: Variant,
    answer: string
  ) {
    try {
      const raw = await this.complete(
        [
          {
            role: "system",
            content:
              `你是自动批改老师。根据标准答案批改学生作答，输出 JSON：{score,isCorrect,modelAnswer,analysis,wrongReasonDiagnosis,quality}。score 0-100，quality 0-5。只输出 JSON，不要 Markdown 代码块，不要解释。${MATH_NOTATION_RULE}`
          },
          {
            role: "user",
            content: `题目：${variant.stem}\n标准答案：${variant.answer}\n学生作答：${answer}`
          }
        ],
        true
      );
      const parsed = parseJsonContent(raw) as Partial<GradeResult>;
      return {
        score: Math.min(100, Math.max(0, Number(parsed.score ?? 0))),
        isCorrect: Boolean(parsed.isCorrect),
        modelAnswer: parsed.modelAnswer ?? variant.answer,
        analysis: parsed.analysis ?? "请对照标准答案复习。",
        wrongReasonDiagnosis: parsed.wrongReasonDiagnosis ?? "待诊断",
        quality: Math.min(5, Math.max(0, Number(parsed.quality ?? 0)))
      };
    } catch (error) {
      if (isJsonParseError(error)) {
        return new DemoAiProvider().gradeAnswer(question, variant, answer);
      }
      throw error;
    }
  }
}

function parseCandidates(raw: string): RecognitionCandidate[] {
  try {
    const json = parseJsonContent(raw) as {
      candidates?: Array<Partial<RecognitionCandidate>>;
    };
    return (json.candidates ?? []).map((c) => ({
      id: uid(),
      stem: c.stem ?? "",
      answer: c.answer ?? "",
      analysis: c.analysis ?? "",
      subject: c.subject ?? "未分类",
      knowledgePoint: c.knowledgePoint ?? "未归类",
      wrongReason: c.wrongReason ?? "待确认",
      confidence: (c.confidence as RecognitionCandidate["confidence"]) ?? "medium",
      selected: true
    }));
  } catch {
    return [];
  }
}

function parseJsonContent(raw: string) {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  if (start === -1) {
    throw new Error("AI 未返回有效 JSON");
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, index + 1));
      }
    }
  }
  throw new Error("AI 返回的 JSON 不完整");
}

function isJsonParseError(error: unknown) {
  return (
    error instanceof Error &&
    /JSON|Unexpected token|position \d+|No number after minus sign/.test(
      error.message
    )
  );
}

export function getAiProvider(): AiProvider {
  const key = process.env.DEEPSEEK_API_KEY;
  if (key) return new DeepSeekProvider(key);
  return new DemoAiProvider();
}

function guessSubject(text: string) {
  if (/(函数|方程|数列|向量|概率|三角|几何|导数)/.test(text)) return "数学";
  if (/(physics|牛顿|力|电|磁|运动|光|热)/i.test(text)) return "物理";
  if (/(氧化|还原|mol|化学|配平|元素)/.test(text)) return "化学";
  if (/(if|grammar|clause|动词|时态|英语)/i.test(text)) return "英语";
  if (/(文言|古诗|阅读|作文)/.test(text)) return "语文";
  return "未分类";
}

function guessKnowledgePoint(text: string, subject: string) {
  const map: Array<[RegExp, string]> = [
    [/二次函数|抛物线|顶点/, "二次函数"],
    [/方程|判别式/, "一元二次方程"],
    [/数列|求和/, "数列求和"],
    [/三角|sin|cos|tan/, "三角函数"],
    [/向量/, "平面向量"],
    [/概率|组合|选法/, "概率计算"],
    [/虚拟|If I|were/, "虚拟语气"],
    [/定语从句|which|that|who/, "定语从句"],
    [/非谓语|enjoy|reading/, "非谓语动词"],
    [/牛顿|加速度|合外力/, "牛顿第二定律"],
    [/电功率|电压|电流/, "电功率"],
    [/平抛|落地/, "平抛运动"],
    [/氧化|还原|化合价/, "氧化还原反应"],
    [/配平/, "化学方程式配平"],
    [/mol|摩尔/, "物质的量"]
  ];
  for (const [regex, name] of map) {
    if (regex.test(text)) return name;
  }
  return subject === "未分类" ? "综合知识" : "综合练习";
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
