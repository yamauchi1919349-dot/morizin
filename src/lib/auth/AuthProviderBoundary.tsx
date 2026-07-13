"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";

export function AuthProviderBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/auth/invite") {
    return children;
  }

  return <AuthProvider>{children}</AuthProvider>;
}
