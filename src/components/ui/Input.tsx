import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export function Input({ className, label, helperText, error, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[var(--color-text)]" htmlFor={inputId}>
      {label}
      <input
        className={cn(
          "min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-base text-[var(--color-text)] outline-none transition-[var(--transition-base)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]",
          error && "border-[var(--color-danger)]",
          className,
        )}
        id={inputId}
        {...props}
      />
      {error ? <span className="text-xs text-[var(--color-danger)]">{error}</span> : null}
      {!error && helperText ? <span className="text-xs text-[var(--color-text-muted)]">{helperText}</span> : null}
    </label>
  );
}
