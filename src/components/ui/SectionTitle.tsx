import type { ReactNode } from "react";

type SectionTitleProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionTitle({ title, description, action }: SectionTitleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-text)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
