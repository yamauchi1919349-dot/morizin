import Link from "next/link";
import { cn } from "@/lib/cn";

type AppFooterProps = {
  className?: string;
};

const footerLinks = [
  { label: "利用規約", href: "/terms" },
  { label: "プライバシーポリシー", href: "/privacy" },
  { label: "特商法表記", href: "/legal" },
  { label: "お問い合わせ", href: "mailto:support@arcnest.jp" },
];

export function AppFooter({ className }: AppFooterProps) {
  return (
    <footer className={cn("px-4 text-[11px] font-bold text-[var(--color-text-muted)]", className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-[var(--color-border)] pt-4">
        {footerLinks.map((link) => (
          <Link className="underline-offset-4 hover:text-[var(--color-primary)] hover:underline" href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
        <span>Ver1.0.0</span>
      </div>
    </footer>
  );
}
