import { ClipboardList, FileText, History, Home, Settings } from "lucide-react";

export type AppNavKey = "dashboard" | "animals" | "pdf" | "hygiene" | "inventory" | "settings";

const appNavigation = [
  { key: "dashboard", label: "\u30db\u30fc\u30e0", href: "/dashboard", icon: Home },
  { key: "animals", label: "\u500b\u4f53", href: "/animals", icon: ClipboardList },
  { key: "pdf", label: "PDF", href: "/traceability", icon: FileText },
  { key: "settings", label: "\u8a2d\u5b9a", href: "/settings", icon: Settings },
] satisfies Array<{
  key: AppNavKey;
  label: string;
  href: string;
  icon: typeof Home;
}>;

export const secondaryNavigation = [
  { label: "\u5c65\u6b74", href: "/shipments", icon: History },
  { label: "PDF", href: "/pdf", icon: ClipboardList },
];

export function createAppNavigationItems(activeKey: AppNavKey) {
  return appNavigation.map((item) => ({
    ...item,
    active: item.key === activeKey,
  }));
}
