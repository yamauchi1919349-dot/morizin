import { ClipboardList, History, Home, Package, Settings, ShieldCheck } from "lucide-react";

export type AppNavKey = "dashboard" | "animals" | "hygiene" | "inventory" | "settings";

const appNavigation = [
  { key: "dashboard", label: "ホーム", href: "/dashboard", icon: Home },
  { key: "animals", label: "個体", href: "/animals", icon: ClipboardList },
  { key: "hygiene", label: "衛生", href: "/hygiene", icon: ShieldCheck },
  { key: "inventory", label: "在庫", href: "/inventory", icon: Package },
  { key: "settings", label: "設定", href: "/settings", icon: Settings },
] satisfies Array<{
  key: AppNavKey;
  label: string;
  href: string;
  icon: typeof Home;
}>;

export const secondaryNavigation = [
  { label: "履歴", href: "/shipments", icon: History },
  { label: "PDF", href: "/pdf", icon: ClipboardList },
];

export function createAppNavigationItems(activeKey: AppNavKey) {
  return appNavigation.map((item) => ({
    ...item,
    active: item.key === activeKey,
  }));
}
