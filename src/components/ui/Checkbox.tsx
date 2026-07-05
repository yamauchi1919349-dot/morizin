import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  description?: ReactNode;
};

export function Checkbox({ className, label, description, ...props }: CheckboxProps) {
  return (
    <label className={cn("flex items-start gap-3 rounded-[var(--radius-md)] p-2", className)}>
      <input
        className="mt-0.5 h-5 w-5 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
        type="checkbox"
        {...props}
      />
      <span className="grid gap-0.5">
        <span className="text-sm font-semibold text-[var(--color-text)]">{label}</span>
        {description ? <span className="text-xs text-[var(--color-text-muted)]">{description}</span> : null}
      </span>
    </label>
  );
}
