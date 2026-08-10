"use client";

import * as React from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { useToast } from "./ui/toast";
import type { Notebook, Question } from "@/lib/types";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: Question[];
  selectedIds: string[];
  notebooks: Notebook[];
}

export function ExportDialog({
  open,
  onOpenChange,
  questions,
  selectedIds,
  notebooks
}: ExportDialogProps) {
  const { toast } = useToast();
  const [scope, setScope] = React.useState("current");
  const [notebookId, setNotebookId] = React.useState("");
  const [format, setFormat] = React.useState("pdf");
  const [includeAnswers, setIncludeAnswers] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  const scoped = React.useMemo(() => {
    if (scope === "selected") {
      return questions.filter((q) => selectedIds.includes(q.id));
    }
    if (scope === "notebook" && notebookId) {
      return questions.filter((q) => q.notebookId === notebookId);
    }
    return questions;
  }, [scope, selectedIds, notebookId, questions]);

  const buildMarkdown = () => {
    const lines = ["# Recall 错题复习资料", "", `生成时间：${new Date().toLocaleString("zh-CN")}`, ""];
    lines.push("| 学科 | 知识点 | 错因 |", "| --- | --- | --- |");
    scoped.forEach((q) => {
      lines.push(`| ${q.subject} | ${q.knowledgePoint} | ${q.wrongReason} |`);
    });
    lines.push("");
    scoped.forEach((q, index) => {
      lines.push(`## ${index + 1}. ${q.stem}`, "");
      if (includeAnswers) {
        lines.push("### 答案", "", q.answer, "", "### 解析", "", q.analysis, "");
      } else {
        lines.push("### 作答区", "", "> ", "", "");
      }
      lines.push("---", "");
    });
    return lines.join("\n");
  };

  const downloadBlob = (content: string, type: string, filename: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;
    const doc = new jsPDF("p", "mm", "a4");
    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:-9999px;top:0;width:794px;background:#ffffff;color:#1d1d1f;font-family:sans-serif;padding:28px;z-index:-1;";
    document.body.appendChild(host);
    const chunks: Question[][] = [];
    for (let i = 0; i < scoped.length; i += 3) {
      chunks.push(scoped.slice(i, i + 3));
    }
    if (!chunks.length) chunks.push([]);

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const header = `<h2 style="font-size:24px;margin:0 0 16px;">Recall 错题复习卷 ${index + 1}/${chunks.length}</h2>`;
      const cards = chunk
        .map(
          (q, i) => `
            <div style="border:1px solid #e5e5ea;border-radius:12px;padding:16px;margin-bottom:14px;">
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;border-left:4px solid #3b82f6;padding-left:10px;">${escapeHtml(q.stem)}</p>
              <p style="margin:0;font-size:12px;color:#6e6e73;">${escapeHtml(q.subject)} · ${escapeHtml(q.knowledgePoint)}</p>
              ${
                includeAnswers
                  ? `<p style="margin-top:10px;font-size:13px;line-height:1.6;border-left:4px solid #10b981;padding-left:10px;"><b>答案：</b>${escapeHtml(q.answer)}</p><p style="margin-top:8px;font-size:13px;line-height:1.6;color:#6e6e73;">${escapeHtml(q.analysis)}</p>`
                  : `<p style="margin-top:36px;border-bottom:1px dashed #c7c7cc;min-height:40px;"></p>`
              }
            </div>
          `
        )
        .join("");
      host.innerHTML = header + cards;
      await new Promise((resolve) => setTimeout(resolve, 60));
      const canvas = await html2canvas(host, {
        backgroundColor: "#ffffff",
        scale: 1.5,
        useCORS: true
      });
      const ratio = canvas.height / canvas.width;
      doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 210 * ratio);
      if (index < chunks.length - 1) doc.addPage();
    }
    host.remove();
    doc.save("recall-review-paper.pdf");
  };

  const exportNow = async () => {
    if (!scoped.length) {
      toast({ type: "error", title: "没有可导出的错题" });
      return;
    }
    setExporting(true);
    try {
      if (format === "markdown") {
        downloadBlob(buildMarkdown(), "text/markdown;charset=utf-8", "recall-notes.md");
      } else {
        await downloadPdf();
      }
      toast({
        type: "success",
        title: "导出完成",
        description: `已导出 ${scoped.length} 道错题`
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        type: "error",
        title: "导出失败",
        description: error instanceof Error ? error.message : "请分次导出"
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="导出错题"
      description="PDF 单次最多导出 100 题，超量请分次导出"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={exportNow} disabled={exporting || !scoped.length}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {exporting ? "导出中…" : `导出 ${scoped.length} 题`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">导出范围</p>
          <Select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="current">当前筛选结果</option>
            <option value="selected">已勾选题目（{selectedIds.length}）</option>
            <option value="notebook">指定错题本</option>
          </Select>
        </div>
        {scope === "notebook" ? (
          <Select value={notebookId} onChange={(e) => setNotebookId(e.target.value)}>
            <option value="">选择错题本</option>
            {notebooks.map((n) => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </Select>
        ) : null}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">格式</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={format === "pdf" ? "default" : "outline"}
              onClick={() => setFormat("pdf")}
            >
              PDF 试卷
            </Button>
            <Button
              variant={format === "markdown" ? "default" : "outline"}
              onClick={() => setFormat("markdown")}
            >
              Markdown
            </Button>
          </div>
        </div>
        {format === "pdf" ? (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">答案模式</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={includeAnswers ? "default" : "outline"}
                onClick={() => setIncludeAnswers(true)}
              >
                含答案
              </Button>
              <Button
                variant={!includeAnswers ? "default" : "outline"}
                onClick={() => setIncludeAnswers(false)}
              >
                不含答案
              </Button>
            </div>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">当前可导出 {scoped.length} 题</p>
      </div>
    </Dialog>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
