import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, description, children, footer, onClose }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-0 sm:place-items-center sm:p-6">
      <section className="w-full rounded-t-[var(--radius-lg)] bg-white p-5 shadow-[var(--shadow-lg)] sm:max-w-lg sm:rounded-[var(--radius-lg)]">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p> : null}
          </div>
          <Button aria-label="閉じる" onClick={onClose} variant="icon">
            <X size={20} />
          </Button>
        </header>
        <div>{children}</div>
        {footer ? <footer className="mt-5 flex justify-end gap-2">{footer}</footer> : null}
      </section>
    </div>
  );
}
