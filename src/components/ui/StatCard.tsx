import type { ReactNode } from "react";
import { Card } from "./Card";

type StatCardProps = {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
};

const toneClass = {
  default: "text-[var(--color-primary)]",
  success: "text-emerald-700",
  warning: "text-[var(--color-warning)]",
  danger: "text-[var(--color-danger)]",
};

export function StatCard({ label, value, icon, tone = "default" }: StatCardProps) {
  return (
    <Card className="grid min-h-24 gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--color-text-muted)]">{label}</span>
        {icon ? <span className={toneClass[tone]}>{icon}</span> : null}
      </div>
      <strong className={`text-3xl font-bold ${toneClass[tone]}`}>{value}</strong>
    </Card>
  );
}
