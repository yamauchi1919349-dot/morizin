import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, eyebrow, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-bold text-[var(--color-primary)]">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
