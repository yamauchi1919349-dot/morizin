import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageContainerProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function PageContainer({ children, className, ...props }: PageContainerProps) {
  return (
    <main className={cn("mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8", className)} {...props}>
      {children}
    </main>
  );
}
