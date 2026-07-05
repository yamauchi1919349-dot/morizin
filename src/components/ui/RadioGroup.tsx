"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type RadioOption = {
  label: ReactNode;
  value: string;
  description?: ReactNode;
};

type RadioGroupProps = {
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  label?: string;
  className?: string;
  onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
  onValueChange?: (value: string) => void;
};

export function RadioGroup({
  name,
  options,
  value,
  defaultValue,
  label,
  className,
  onChange,
  onValueChange,
}: RadioGroupProps) {
  const isControlled = value !== undefined;

  return (
    <fieldset className={cn("grid gap-2", className)}>
      {label ? <legend className="mb-1 text-sm font-semibold text-[var(--color-text)]">{label}</legend> : null}
      <div className="grid gap-2">
        {options.map((option) => {
          const inputProps = isControlled
            ? { checked: value === option.value }
            : { defaultChecked: defaultValue === option.value };

          return (
            <label
              className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-3"
              key={option.value}
            >
              <input
                {...inputProps}
                className="mt-0.5 h-5 w-5 accent-[var(--color-primary)]"
                name={name}
                onChange={(event) => {
                  onChange?.(event);
                  if (event.target.checked) {
                    onValueChange?.(event.target.value);
                  }
                }}
                type="radio"
                value={option.value}
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-semibold text-[var(--color-text)]">{option.label}</span>
                {option.description ? <span className="text-xs text-[var(--color-text-muted)]">{option.description}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
