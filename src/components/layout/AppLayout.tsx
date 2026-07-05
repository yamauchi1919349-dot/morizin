import type { ReactNode } from "react";
import { PageContainer } from "@/components/ui";
import { cn } from "@/lib/cn";

type AppLayoutProps = {
  children: ReactNode;
  header?: ReactNode;
  bottomNavigation?: ReactNode;
  className?: string;
};

export function AppLayout({ children, header, bottomNavigation, className }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      {header ? (
        <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
          <PageContainer className="py-3">{header}</PageContainer>
        </header>
      ) : null}
      <PageContainer className={cn(bottomNavigation ? "pb-24" : undefined, className)}>{children}</PageContainer>
      {bottomNavigation}
    </div>
  );
}
