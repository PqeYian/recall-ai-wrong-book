"use client";

import * as React from "react";
import {
  Send,
  Square,
  Plus,
  BookPlus,
  Sparkles,
  User,
  Bot,
  Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import type { Conversation, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toMathNotation } from "@/lib/math-format";
import { AppShell } from "@/components/app-shell";
import { HistorySidebar } from "@/components/history-sidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

export default function ChatPage() {
  const { toast } = useToast();
  const [activeId, setActiveId] = React.useState<string>();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [subject, setSubject] = React.useState("数学");
  const [streaming, setStreaming] = React.useState(false);
  const [waitingSeconds, setWaitingSeconds] = React.useState(0);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const stopRef = React.useRef<AbortController | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const loadMessages = React.useCallback(async (id: string) => {
    try {
      setMessages(await api.messages(id));
    } catch (error) {
      toast({
        type: "error",
        title: "加载消息失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    }
  }, [toast]);

  React.useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, [activeId]);

  const newConversation = async () => {
    try {
      const conversation = await api.createConversation({
        title: "新会话",
        subject
      });
      setActiveId(conversation.id);
      setRefreshKey((k) => k + 1);
      setMessages([]);
    } catch (error) {
      toast({
        type: "error",
        title: "创建会话失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    }
  };

  const send = async () => {
    const content = input.trim();
    if (!content) {
      toast({ type: "error", title: "请输入有效问题" });
      return;
    }
    if (streaming) return;

    let conversationId = activeId;
    if (!conversationId) {
      try {
        const conversation = await api.createConversation({
          title: content.slice(0, 14),
          subject
        });
        conversationId = conversation.id;
        setActiveId(conversationId);
        setRefreshKey((k) => k + 1);
      } catch (error) {
        toast({
          type: "error",
          title: "创建会话失败",
          description: error instanceof Error ? error.message : "请重试"
        });
        return;
      }
    }

    try {
      const userMessage = await api.sendMessage(conversationId, {
        content,
        subject
      });
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      await streamAssistant(conversationId);
    } catch (error) {
      toast({
        type: "error",
        title: "发送失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    }
  };

  const streamAssistant = async (conversationId: string) => {
    setStreaming(true);
    const controller = new AbortController();
    stopRef.current = controller;
    let assistantText = "";
    let completed = false;
    const thinkingTimer = window.setInterval(() => {
      setWaitingSeconds((seconds) => seconds + 1);
    }, 1000);
    setMessages((prev) => [
      ...prev,
      {
        id: "streaming-placeholder",
        conversationId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString()
      }
    ]);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, subject }),
        signal: controller.signal
      });
      if (!response.ok || !response.body) {
        throw new Error("无法连接到 AI 服务");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const marker = buffer.match(/__RECALL_(DONE|ERROR)__/);
        if (marker) {
          completed = true;
          const rest = buffer.slice(marker.index);
          buffer = buffer.slice(0, marker.index);
          assistantText = buffer;
          updateAssistantText(assistantText);
          if (marker[1] === "DONE") {
            const payload = rest
              .replace("__RECALL_DONE__", "")
              .trim();
            try {
              const saved = JSON.parse(payload) as Message;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === "streaming-placeholder" ? saved : m
                )
              );
              setRefreshKey((k) => k + 1);
            } catch {
              updateAssistantText(assistantText);
            }
          } else {
            const message = rest.replace("__RECALL_ERROR__", "").trim();
            updateAssistantText(
              `${assistantText}\n\n回答已中断：${message || "网络异常"}`
            );
          }
          break;
        }
        assistantText = buffer;
        updateAssistantText(buffer);
      }
      if (!completed) {
        updateAssistantText(assistantText || "回答已中断");
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        updateAssistantText(`${assistantText || ""}\n\n回答已中断`);
      } else {
        updateAssistantText(
          `${assistantText || ""}\n\n回答已中断：${
            error instanceof Error ? error.message : "网络异常"
          }`
        );
      }
    } finally {
      setStreaming(false);
      window.clearInterval(thinkingTimer);
      setWaitingSeconds(0);
      stopRef.current = null;
      setRefreshKey((k) => k + 1);
    }
  };

  const updateAssistantText = (content: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === "streaming-placeholder"
          ? { ...m, content, containsQuestion: /(练习|题目|求)[^。]*[？?]/.test(content) }
          : m
      )
    );
  };

  const stop = () => {
    stopRef.current?.abort();
  };

  const addToBook = async (message: Message) => {
    if (!activeId || message.addedToBook) return;
    const stemMatch = message.content.match(/(?:练习|题目|题|求)[：: ]*([^\n。]{6,80})/);
    const stem = stemMatch?.[1] ?? message.content.split("\n")[0].slice(0, 60);
    try {
      await api.chatQuestion({
        conversationId: activeId,
        messageId: message.id,
        stem,
        answer: message.content.match(/答案[：:]\s*([^\n。]+)/)?.[1],
        subject,
        knowledgePoint: /(二次函数|三角函数|虚拟语气|牛顿第二定律|氧化还原|数列|电功率|概率|物质的量|定语从句)/.exec(
          message.content
        )?.[1]
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, addedToBook: true } : m))
      );
      toast({
        type: "success",
        title: "已加入错题本",
        description: "可在首页错题列表继续编辑"
      });
    } catch (error) {
      toast({
        type: "error",
        title: "加入失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const visibleMessages = messages.filter((m) => m.id !== "streaming-placeholder" || streaming);

  return (
    <AppShell
      active="chat"
      left={
        <HistorySidebar
          activeId={activeId}
          onSelect={(id) => setActiveId(id)}
          refreshKey={refreshKey}
        />
      }
    >
      <div className="flex min-h-[calc(100vh-56px)] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card/60 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Badge>{subject}</Badge>
            <span className="text-sm text-muted-foreground">
              {activeId ? "继续上次会话" : "新会话"}
            </span>
          </div>
          <Select value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8 w-32">
            {["通用", "数学", "英语", "物理", "化学", "语文", "生物"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {!visibleMessages.length ? (
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="今天想解决哪道题？"
              description="选择学科上下文后开始提问，AI 回答可一键加入错题本"
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {["怎么求二次函数最大值？", "虚拟语气主句怎么用？", "平抛运动落地时间怎么算？"].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              }
            />
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {visibleMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" ? (
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl border p-3 text-sm leading-6 sm:max-w-[70%]",
                      message.role === "user"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground"
                    )}
                  >
                    {streaming &&
                    message.id === "streaming-placeholder" &&
                    !message.content ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>AI 正在思考，请稍候…</span>
                        <span className="text-xs">已等待 {waitingSeconds}s</span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">
                        {toMathNotation(message.content)}
                        {streaming && message.id === "streaming-placeholder" ? (
                          <span className="ml-0.5 inline-block h-4 w-1.5 animate-caret bg-primary align-middle" />
                        ) : null}
                      </p>
                    )}
                    {message.role === "assistant" && message.containsQuestion ? (
                      <button
                        disabled={message.addedToBook}
                        onClick={() => addToBook(message)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
                      >
                        <BookPlus className="h-3.5 w-3.5" />
                        {message.addedToBook ? "已加入" : "加入错题本"}
                      </button>
                    ) : null}
                  </div>
                  {message.role === "user" ? (
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                      <User className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-card/90 p-3 backdrop-blur sm:p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Button variant="outline" size="icon" onClick={newConversation} aria-label="新会话">
              <Plus className="h-4 w-4" />
            </Button>
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="输入你的问题，Enter 发送，Shift+Enter 换行"
              className="min-h-[44px] max-h-32 flex-1"
              rows={1}
            />
            {streaming ? (
              <Button variant="outline" size="icon" onClick={stop} aria-label="停止生成">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="icon" onClick={send} disabled={!input.trim()} aria-label="发送">
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
