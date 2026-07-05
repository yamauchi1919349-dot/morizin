import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type NavItem = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href?: string;
  active?: boolean;
  onClick?: () => void;
};

type BottomNavigationProps = {
  items: NavItem[];
  className?: string;
};

export function BottomNavigation({ items, className }: BottomNavigationProps) {
  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 grid border-t border-[var(--color-border)] bg-white px-2 pb-2 pt-1 shadow-[var(--shadow-lg)] sm:hidden",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const itemClassName = cn(
          "flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] text-[10px] font-bold text-[var(--color-text-muted)]",
          item.active && "text-[var(--color-primary)]",
        );
        const content = (
          <>
            <Icon height={20} width={20} />
            {item.label}
          </>
        );

        return item.href ? (
          <Link className={itemClassName} href={item.href} key={item.label}>
            {content}
          </Link>
        ) : (
          <button className={itemClassName} key={item.label} onClick={item.onClick} type="button">
            {content}
          </button>
        );
      })}
    </nav>
  );
}
