import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Card } from "./Card";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <Card className="grid place-items-center gap-4 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        {icon ?? <Inbox size={24} />}
      </div>
      <div>
        <h2 className="text-lg font-bold text-[var(--color-text)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      </div>
      {action}
    </Card>
  );
}
