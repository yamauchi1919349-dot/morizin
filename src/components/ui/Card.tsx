import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "info" | "clickable" | "pdf";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  children: ReactNode;
};

const variantClass: Record<CardVariant, string> = {
  default: "bg-white",
  info: "bg-[var(--color-primary-soft)]",
  clickable: "cursor-pointer bg-white hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)]",
  pdf: "bg-white before:absolute before:inset-x-4 before:bottom-[-6px] before:h-3 before:rounded-b-[var(--radius-md)] before:border before:border-t-0 before:border-[var(--color-border)] before:bg-white",
};

export function Card({ children, className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]",
        variantClass[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
