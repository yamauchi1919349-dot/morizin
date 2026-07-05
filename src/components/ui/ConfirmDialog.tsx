import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "実行する",
  cancelLabel = "キャンセル",
  tone = "primary",
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      footer={
        <>
          <Button onClick={onCancel} variant="secondary">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} variant={tone === "danger" ? "danger" : "primary"}>
            {confirmLabel}
          </Button>
        </>
      }
      onClose={onCancel}
      open={open}
      title={title}
    >
      <div className="flex gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-100 text-[var(--color-warning)]">
          <AlertTriangle size={20} />
        </div>
        <div>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
          {children}
        </div>
      </div>
    </Modal>
  );
}
