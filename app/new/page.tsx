"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  ImagePlus,
  ClipboardType,
  MessageSquare,
  UploadCloud,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  FileText
} from "lucide-react";
import { api } from "@/lib/api";
import type { Notebook, RecognitionCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUBJECTS = ["数学", "英语", "物理", "化学", "语文", "生物", "通用"];

export default function NewEntryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = React.useState("upload");
  const [files, setFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [text, setText] = React.useState("");
  const [notebooks, setNotebooks] = React.useState<Notebook[]>([]);
  const [defaultNotebook, setDefaultNotebook] = React.useState("");
  const [recognizing, setRecognizing] = React.useState(false);
  const [stage, setStage] = React.useState<"idle" | "ocr" | "split" | "error">("idle");
  const [error, setError] = React.useState("");
  const [candidates, setCandidates] = React.useState<RecognitionCandidate[]>([]);
  const [importing, setImporting] = React.useState(false);
  const [ocrDemo, setOcrDemo] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("tab");
    if (initial && ["camera", "upload", "text", "chat"].includes(initial)) {
      setTab(initial);
    }
    api.notebooks().then(setNotebooks).catch(() => {});
    api.usage().then((usage) => setOcrDemo(usage.demo)).catch(() => {});
  }, []);

  const addFiles = (incoming: FileList | File[]) => {
    const next = [...files];
    const list = Array.from(incoming);
    for (const file of list) {
      if (!ALLOWED.has(file.type)) {
        toast({
          type: "error",
          title: "格式不支持",
          description: "支持 jpg/png/webp 图片，单张不超过 10MB，最多 9 张"
        });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          type: "error",
          title: "图片过大",
          description: "单张图片不能超过 10MB"
        });
        continue;
      }
      if (next.length >= 9) {
        toast({ type: "error", title: "最多上传 9 张图片" });
        break;
      }
      next.push(file);
    }
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
    setStage("idle");
    setCandidates([]);
  };

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const onPaste = (event: React.ClipboardEvent) => {
    const pasted = event.clipboardData?.files;
    if (pasted?.length) {
      event.preventDefault();
      addFiles(pasted);
    }
  };

  const recognize = async () => {
    if (!files.length && !text.trim()) {
      toast({ type: "error", title: "请先上传图片或粘贴题目内容" });
      return;
    }
    setRecognizing(true);
    setError("");
    setStage(files.length ? "ocr" : "split");
    setCandidates([]);
    try {
      const form = new FormData();
      files.forEach((file) => form.append("images", file));
      if (!files.length && text.trim()) form.append("text", text);
      const result = await api.recognize(form);
      setCandidates(result.candidates);
      setStage("idle");
      toast({
        type: "success",
        title: "识别完成",
        description: `共识别 ${result.candidates.length} 道错题`
      });
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "识别失败，请重试");
    } finally {
      setRecognizing(false);
    }
  };

  const updateCandidate = (
    id: string,
    patch: Partial<RecognitionCandidate>
  ) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  const toggleCandidate = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const toggleAll = () => {
    const allSelected = candidates.every((c) => c.selected);
    setCandidates((prev) =>
      prev.map((c) => ({ ...c, selected: !allSelected }))
    );
  };

  const importSelected = async () => {
    const selected = candidates.filter((c) => c.selected);
    if (!selected.length) {
      toast({ type: "error", title: "请至少勾选一道错题" });
      return;
    }
    setImporting(true);
    try {
      const result = await api.createQuestions(
        selected.map((c) => ({
          stem: c.stem,
          answer: c.answer,
          analysis: c.analysis,
          subject: c.subject,
          knowledgePoint: c.knowledgePoint,
          wrongReason: c.wrongReason,
          notebookId: defaultNotebook || undefined,
          confidence: c.confidence,
          source: files.length ? "image" : "text"
        }))
      );
      toast({
        type: "success",
        title: `已归档 ${result.created.length} 道错题`,
        description:
          result.duplicates.length > 0
            ? `其中 ${result.duplicates.length} 道疑似重复`
            : undefined
      });
      router.push("/");
    } catch (err) {
      toast({
        type: "error",
        title: "导入失败",
        description: err instanceof Error ? err.message : "请重试"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppShell active="new" className="max-w-3xl">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <h1 className="mb-4 text-xl font-semibold text-foreground">录入错题</h1>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value);
            if (value === "chat") router.push("/chat");
          }}
          className="mb-4"
          items={[
            { value: "camera", label: "拍照识图", icon: <Camera className="h-4 w-4" /> },
            { value: "upload", label: "图片上传", icon: <ImagePlus className="h-4 w-4" /> },
            { value: "text", label: "纯文本", icon: <ClipboardType className="h-4 w-4" /> },
            { value: "chat", label: "AI 对话", icon: <MessageSquare className="h-4 w-4" /> }
          ]}
        />

        {ocrDemo ? (
          <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            当前未配置 OCR.space Key，图片识别为演示模式，识别结果不来自你的图片。配置 Key 后即可真实识别。
          </div>
        ) : null}

        {!candidates.length ? (
          <div
            onPaste={onPaste}
            className="rounded-xl border-2 border-dashed border-border bg-card p-6 text-center transition-colors focus-within:border-primary"
          >
            {tab === "text" ? (
              <div className="mx-auto max-w-xl">
                <FileText className="mx-auto mb-3 h-8 w-8 text-primary" />
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="粘贴题目内容，支持一次粘贴多道题"
                  className="min-h-[180px]"
                />
                <p className="mt-2 text-left text-xs text-muted-foreground">
                  文本为空或纯空白时会提示请输入题目内容
                </p>
              </div>
            ) : (
              <div>
                <UploadCloud className="mx-auto mb-3 h-10 w-10 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  拖拽图片到这里，或点击选择
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  支持 jpg/png/webp，单张不超过 10MB，最多 9 张；Ctrl+V 可直接粘贴
                </p>
                <label className="mt-4 inline-flex cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture={tab === "camera" ? "environment" : undefined}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <span className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
                    {tab === "camera" ? <Camera className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                    {tab === "camera" ? "拍照" : "选择图片"}
                  </span>
                </label>
              </div>
            )}

            {files.length ? (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {previews.map((src, index) => (
                  <div key={src} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={src} alt={`待识别图片 ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white"
                      onClick={() => removeFile(index)}
                      aria-label="删除图片"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {recognizing || stage === "ocr" || stage === "split" ? (
          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <div className="space-y-3">
              {[
                { key: "ocr", label: "OCR 识别中" },
                { key: "split", label: "AI 拆题中" }
              ].map((step) => (
                <div key={step.key} className="flex items-center gap-3 text-sm">
                  {step.key === "ocr" ? (
                    stage === "ocr" || recognizing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )
                  ) : stage === "split" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : stage === "idle" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                  <span className={stage === "ocr" && step.key === "ocr" ? "text-foreground" : "text-muted-foreground"}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {stage === "error" ? (
          <div className="mt-4 rounded-xl border border-error/30 bg-error/5 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">识别失败</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={recognize}>
                    <RotateCcw className="h-4 w-4" />
                    重试
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStage("idle");
                      setTab("text");
                    }}
                  >
                    转手动输入
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {candidates.length ? (
          <>
            <div className="mt-4 space-y-3">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Checkbox
                      checked={candidate.selected}
                      onCheckedChange={() => toggleCandidate(candidate.id)}
                      ariaLabel="选择本题"
                    />
                    <Badge
                      variant={
                        candidate.confidence === "high"
                          ? "success"
                          : candidate.confidence === "medium"
                            ? "warning"
                            : "error"
                      }
                    >
                      {candidate.confidence === "high"
                        ? "高置信度"
                        : candidate.confidence === "medium"
                          ? "中置信度"
                          : "低置信度"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">可编辑后导入</span>
                  </div>
                  <div className="space-y-3">
                    <Textarea
                      value={candidate.stem}
                      onChange={(e) => updateCandidate(candidate.id, { stem: e.target.value })}
                      placeholder="题干"
                      className="min-h-[72px] border-l-4 border-l-stem"
                    />
                    <Textarea
                      value={candidate.answer}
                      onChange={(e) => updateCandidate(candidate.id, { answer: e.target.value })}
                      placeholder="答案"
                    />
                    <Textarea
                      value={candidate.analysis}
                      onChange={(e) => updateCandidate(candidate.id, { analysis: e.target.value })}
                      placeholder="解析"
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Select
                        value={candidate.subject}
                        onChange={(e) => updateCandidate(candidate.id, { subject: e.target.value })}
                      >
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                      <Input
                        value={candidate.knowledgePoint}
                        onChange={(e) => updateCandidate(candidate.id, { knowledgePoint: e.target.value })}
                        placeholder="知识点"
                      />
                      <Input
                        value={candidate.wrongReason}
                        onChange={(e) => updateCandidate(candidate.id, { wrongReason: e.target.value })}
                        placeholder="错因"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-border bg-card/95 p-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
              <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {candidates.every((c) => c.selected) ? "取消全选" : "全选"}
                </Button>
                <Select
                  value={defaultNotebook}
                  onChange={(e) => setDefaultNotebook(e.target.value)}
                  className="h-8 w-40 text-xs"
                >
                  <option value="">不指定错题本</option>
                  {notebooks.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </Select>
                <Button
                  className="ml-auto"
                  size="sm"
                  onClick={importSelected}
                  disabled={importing}
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  导入 {candidates.filter((c) => c.selected).length} 道错题
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {!recognizing &&
        !candidates.length &&
        stage !== "error" &&
        tab !== "text" &&
        !files.length ? null : !recognizing && !candidates.length && stage !== "error" && tab === "text" ? (
          <div className="mt-4 flex justify-end">
            <Button onClick={recognize} disabled={!text.trim()}>
              识别并拆题
            </Button>
          </div>
        ) : null}

        {!recognizing && !candidates.length && stage === "idle" && files.length ? (
          <div className="mt-4 flex justify-end">
            <Button onClick={recognize}>开始识别</Button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
