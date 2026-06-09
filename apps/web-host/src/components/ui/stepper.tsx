"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  steps: string[];
  current: number;
  className?: string;
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <div className={cn("flex items-center w-full", className)}>
      {steps.map((label, index) => {
        const isComplete = index < current;
        const isActive = index === current;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  isComplete && "bg-[var(--singr-accent-primary)] text-white",
                  isActive &&
                    "bg-gradient-to-tr from-[var(--singr-brand-start)] to-[var(--singr-brand-end)] text-white",
                  !isComplete &&
                    !isActive &&
                    "bg-white/5 text-[var(--singr-text-secondary)] border border-[var(--singr-border)]"
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-medium truncate hidden sm:block",
                  isActive ? "text-white" : "text-[var(--singr-text-secondary)]"
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 sm:mx-3 h-px flex-1 transition-colors",
                  index < current
                    ? "bg-[var(--singr-accent-primary)]"
                    : "bg-[var(--singr-border)]"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
