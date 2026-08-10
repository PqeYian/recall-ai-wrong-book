import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  items: Array<{ value: string; label: React.ReactNode; icon?: React.ReactNode }>;
  className?: string;
}

export function Tabs({ value, onValueChange, items, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1",
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onValueChange(item.value)}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            value === item.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
