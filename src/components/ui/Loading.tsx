import { cn } from "@/lib/cn";

type LoadingProps = {
  label?: string;
  className?: string;
};

export function Loading({ label = "読み込み中", className }: LoadingProps) {
  return (
    <div className={cn("flex items-center justify-center gap-3 py-6 text-sm font-semibold text-[var(--color-text-muted)]", className)}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
      {label}
    </div>
  );
}
