"use client";

import * as React from "react";
import { MessageSquarePlus, Trash2, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";

export function HistorySidebar({
  activeId,
  onSelect,
  refreshKey
}: {
  activeId?: string;
  onSelect: (id?: string) => void;
  refreshKey?: number;
}) {
  const { toast } = useToast();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);

  const load = React.useCallback(async () => {
    try {
      setConversations(await api.conversations());
    } catch (error) {
      toast({
        type: "error",
        title: "加载会话失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    }
  }, [toast]);

  React.useEffect(() => {
    load();
  }, [load, refreshKey]);

  const remove = async (id: string) => {
    if (!window.confirm("确定删除这个会话？")) return;
    try {
      await api.deleteConversation(id);
      await load();
      if (activeId === id) onSelect(undefined);
    } catch (error) {
      toast({
        type: "error",
        title: "删除失败",
        description: error instanceof Error ? error.message : "请重试"
      });
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" className="w-full" onClick={() => onSelect(undefined)}>
        <MessageSquarePlus className="h-4 w-4" />
        新会话
      </Button>
      <div className="space-y-4">
        {conversations.map((conversation) => (
          <div key={conversation.id} className="space-y-1">
            <p className="px-3 text-xs text-muted-foreground">{formatDate(conversation.updatedAt)}</p>
            <div
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                activeId === conversation.id
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-black/5 dark:hover:bg-white/10"
              )}
            >
              <button className="flex min-w-0 flex-1 items-center gap-2" onClick={() => onSelect(conversation.id)}>
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{conversation.title}</span>
              </button>
              <button
                className="hidden rounded-md p-1 text-muted-foreground hover:bg-error/10 hover:text-error group-hover:block"
                onClick={() => remove(conversation.id)}
                aria-label="删除会话"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
