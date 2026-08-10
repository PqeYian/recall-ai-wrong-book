"use client";

import * as React from "react";
import {
  Camera,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  Search,
  Send,
  ChevronDown,
  Gauge,
  MessageSquare
} from "lucide-react";
import { api } from "@/lib/api";
import type { UsageData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { HelpNav } from "@/components/help-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

const FAQS = [
  {
    category: "录入",
    question: "支持哪些图片格式和大小？",
    answer: "支持 jpg/png/webp，单张不超过 10MB，每次最多上传 9 张。"
  },
  {
    category: "录入",
    question: "OCR 识别失败怎么办？",
    answer: "页面会提供「重试」和「转手动输入」两个兜底按钮，已上传图片会保留。"
  },
  {
    category: "录入",
    question: "AI 拆题结果不准怎么办？",
    answer: "识别结果每题都可以行内编辑题干、答案、学科、知识点和错因后再导入。"
  },
  {
    category: "复习",
    question: "今日计划没有到期题怎么办？",
    answer: "可以切换到自由练习模式，按掌握度升序补足题目。"
  },
  {
    category: "复习",
    question: "变体题会写入题库吗？",
    answer: "变体题默认不落库，只记录作答和批改结果；薄弱题可手动收藏到错题本。"
  },
  {
    category: "复习",
    question: "SM-2 是什么？",
    answer: "SM-2 是间隔重复算法，根据每次复习质量调整间隔和易度因子，错得多的题更早再出现。"
  },
  {
    category: "导出",
    question: "PDF 最多导出多少题？",
    answer: "单次最多导出 100 题，超出请分次导出。"
  },
  {
    category: "导出",
    question: "Markdown 导出包含什么？",
    answer: "包含学科、知识点、错因表格，以及每道题的题干、答案和解析。"
  },
  {
    category: "账户",
    question: "数据如何隔离？",
    answer: "所有数据按用户隔离，Supabase RLS 保证只能访问自己的错题和会话。"
  },
  {
    category: "账户",
    question: "如何导出全部数据？",
    answer: "在首页导出弹窗选择范围，可生成 PDF 或 Markdown 备份。"
  }
];

const GUIDE_STEPS = [
  { icon: Camera, title: "录入", description: "拍照、粘贴文本或 AI 对话加题" },
  { icon: CheckCircle2, title: "确认", description: "AI 识别后逐题编辑并确认归档" },
  { icon: GraduationCap, title: "复习", description: "按今日计划完成变式题与批改" },
  { icon: LayoutDashboard, title: "看板", description: "查看趋势与薄弱知识点" }
];

export default function HelpPage() {
  const { toast } = useToast();
  const [section, setSection] = React.useState("guide");
  const [faqSearch, setFaqSearch] = React.useState("");
  const [openFaq, setOpenFaq] = React.useState<string | null>(null);
  const [usage, setUsage] = React.useState<UsageData | null>(null);
  const [email, setEmail] = React.useState("");
  const [category, setCategory] = React.useState("功能咨询");
  const [content, setContent] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    api.usage().then(setUsage).catch(() => {});
  }, []);

  const filteredFaqs = FAQS.filter(
    (faq) =>
      !faqSearch.trim() ||
      faq.question.includes(faqSearch) ||
      faq.category.includes(faqSearch)
  );

  const submitContact = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.contact({ email, category, content });
      toast({ type: "success", title: "反馈已提交", description: "我们会尽快回复" });
      setEmail("");
      setContent("");
    } catch (error) {
      toast({
        type: "error",
        title: "提交失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const percent = usage ? Math.round((usage.used / usage.limit) * 100) : 0;

  return (
    <AppShell
      active="help"
      left={<HelpNav active={section} onChange={setSection} />}
    >
      <div className="mx-auto max-w-[760px] px-4 py-5 sm:px-6">
        {section === "guide" ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">新手引导</h1>
              <p className="mt-1 text-sm text-muted-foreground">四步完成从录入到复习的闭环</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {GUIDE_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card key={step.title}>
                    <CardContent className="pt-5">
                      <div className="mb-3 flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <Badge variant="secondary">Step {index + 1}</Badge>
                      </div>
                      <p className="font-medium text-foreground">{step.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Button onClick={() => setSection("faq")}>查看常见问题</Button>
          </div>
        ) : null}

        {section === "faq" ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">常见问题</h1>
              <p className="mt-1 text-sm text-muted-foreground">按录入、复习、导出、账户分类</p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="搜索问题"
                className="pl-9"
              />
            </div>
            <div className="space-y-2">
              {filteredFaqs.map((faq) => (
                <Card key={faq.question}>
                  <button
                    className="flex w-full items-center gap-3 p-4 text-left"
                    onClick={() => setOpenFaq((v) => (v === faq.question ? null : faq.question))}
                  >
                    <Badge variant="secondary">{faq.category}</Badge>
                    <span className="flex-1 text-sm font-medium text-foreground">{faq.question}</span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", openFaq === faq.question && "rotate-180")} />
                  </button>
                  {openFaq === faq.question ? (
                    <p className="px-4 pb-4 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                  ) : null}
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {section === "ocr" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                OCR 额度
              </CardTitle>
              <div className="text-xs text-muted-foreground">OCR.space 免费额度每月 25,000 次</div>
            </CardHeader>
            <CardContent>
              {usage ? (
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-foreground">{usage.remaining.toLocaleString("zh-CN")} 次剩余</span>
                    <Badge variant={usage.warning ? "warning" : "success"}>
                      已用 {percent}%
                    </Badge>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        usage.warning ? "bg-warning" : "bg-success"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  {usage.warning ? (
                    <p className="mt-3 text-sm text-warning">
                      本月 OCR 额度不足 20%，建议优先使用文本粘贴录入。
                    </p>
                  ) : null}
                  {usage.demo ? (
                    <p className="mt-3 text-sm text-warning">
                      当前未配置 OCR.space Key，图片识别为演示模式，不会读取图片真实内容。
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">额度信息加载中…</p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {section === "contact" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                联系客服
              </CardTitle>
              <div className="text-xs text-muted-foreground">提交后我们会尽快回复</div>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitContact} className="space-y-3">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="联系邮箱" required />
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>功能咨询</option>
                  <option>识别问题</option>
                  <option>导出问题</option>
                  <option>账户问题</option>
                  <option>其他</option>
                </Select>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="请描述你遇到的问题" required minLength={5} />
                <Button type="submit" disabled={submitting}>
                  <Send className="h-4 w-4" />
                  {submitting ? "提交中…" : "提交反馈"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
