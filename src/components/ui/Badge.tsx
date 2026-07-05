import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
};

const variantClass: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-orange-100 text-orange-800",
  danger: "bg-red-100 text-red-800",
  muted: "bg-slate-100 text-slate-700",
};

export function Badge({ children, className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", variantClass[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}
