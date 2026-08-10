import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  color?: string;
}

export function Progress({ value, color, className, ...props }: ProgressProps) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-success transition-all duration-300"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}
