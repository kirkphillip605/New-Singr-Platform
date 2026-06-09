"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-xs font-semibold text-[var(--singr-text-secondary)] uppercase tracking-wide",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

const fieldBase =
  "w-full rounded-xl border border-[var(--singr-border)] bg-white/5 px-3.5 py-2.5 text-sm text-[var(--singr-text-primary)] placeholder:text-[var(--singr-text-secondary)]/60 outline-none transition-colors focus:border-[var(--singr-accent-primary)] focus:ring-2 focus:ring-[var(--singr-accent-primary)]/20 disabled:opacity-50";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldBase, className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, "min-h-20 resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        fieldBase,
        "appearance-none pr-9 [&>option]:bg-[var(--singr-bg-secondary)] [&>option]:text-[var(--singr-text-primary)]",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--singr-text-secondary)]" />
  </div>
));
Select.displayName = "Select";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  id,
  label,
  description,
  disabled,
  className,
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-[var(--singr-border)] bg-white/5 accent-[var(--singr-accent-primary)] cursor-pointer"
        style={{ width: "1.05rem", height: "1.05rem" }}
      />
      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label && <span className="text-sm text-[var(--singr-text-primary)]">{label}</span>}
          {description && (
            <span className="text-xs text-[var(--singr-text-secondary)]">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}

interface FieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, required, hint, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-[var(--singr-accent-primary)]"> *</span>}
        </Label>
      )}
      {children}
      {hint && <p className="text-[11px] text-[var(--singr-text-secondary)]">{hint}</p>}
    </div>
  );
}
