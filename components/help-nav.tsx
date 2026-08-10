"use client";

import { Sparkles, HelpCircle, Gauge, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "guide", label: "新手引导", icon: Sparkles },
  { key: "faq", label: "常见问题", icon: HelpCircle },
  { key: "ocr", label: "OCR 额度", icon: Gauge },
  { key: "contact", label: "联系客服", icon: Mail }
];

export function HelpNav({
  active,
  onChange
}: {
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="space-y-1">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active === item.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
