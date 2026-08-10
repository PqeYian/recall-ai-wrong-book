const base = process.env.RECALL_BASE_URL ?? "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

const login = await request("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: "demo@recall.app", password: "recall123" })
});
if (login.response.status !== 200) {
  console.error("LOGIN FAILED", login.response.status, login.body);
  process.exit(1);
}
const cookie = (login.response.headers.get("set-cookie") ?? "").split(";")[0];
const headers = { cookie };

const questions = await request("/api/questions?subject=" + encodeURIComponent("数学"), {
  headers
});
console.log("QUESTIONS", questions.response.status, questions.body?.total);

const review = await request("/api/review/start", {
  method: "POST",
  headers,
  body: JSON.stringify({ mode: "free", count: 2, subject: "数学" })
});
console.log("REVIEW_START", review.response.status, review.body?.questions?.length);

const recognize = await request("/api/recognize", {
  method: "POST",
  headers,
  body: JSON.stringify({
    text: "1. 已知二次函数 y=x^2-4x+3，求顶点坐标。答案：(2,-1)。"
  })
});
console.log("RECOGNIZE", recognize.response.status, recognize.body?.candidates?.length);

const stats = await request("/api/stats", { headers });
const plans = await request("/api/plans", { headers });
const usage = await request("/api/usage/ocr", { headers });
console.log("STATS", stats.response.status, stats.body?.summary?.totalQuestions);
console.log("PLANS", plans.response.status, plans.body?.dueToday);
console.log("USAGE", usage.response.status, usage.body?.remaining);

if (
  questions.body?.total > 0 &&
  review.response.status === 200 &&
  recognize.body?.candidates?.length > 0 &&
  stats.response.status === 200 &&
  plans.response.status === 200 &&
  usage.response.status === 200
) {
  console.log("SMOKE PASS");
} else {
  console.error("SMOKE FAIL");
  process.exit(1);
}
