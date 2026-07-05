import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "text" | "icon";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-dark)]",
  secondary: "border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]",
  danger: "bg-[var(--color-danger)] text-white shadow-sm hover:bg-red-700",
  text: "bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]",
  icon: "border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  type = "button",
  ...props
}: ButtonProps) {
  const isIcon = variant === "icon";

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold transition-[var(--transition-base)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        isIcon ? "h-11 w-11 p-0" : sizeClass[size],
        className,
      )}
      type={type}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
