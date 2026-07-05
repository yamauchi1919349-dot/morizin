import Link from "next/link";
import { ArrowLeft, ClipboardCheck, HeartPulse, ShieldCheck } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Card, SectionTitle } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";

const hygieneMenus = [
  {
    title: "施設衛生点検簿",
    description: "施設・設備の点検を仮記録します。",
    href: "/hygiene/facility",
    icon: ShieldCheck,
  },
  {
    title: "作業衛生管理簿",
    description: "個体番号に紐づく作業衛生を仮記録します。",
    href: "/hygiene/work",
    icon: ClipboardCheck,
  },
  {
    title: "健康管理簿",
    description: "作業者の健康状態を仮記録します。",
    href: "/hygiene/health",
    icon: HeartPulse,
  },
];

export default function HygienePage() {
  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("hygiene")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="text-sm font-bold text-[var(--color-primary)]" href="/dashboard">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-bold">衛生管理</h1>
        <Badge variant="muted">土台</Badge>
      </header>

      <Card className="rounded-2xl p-4 shadow-sm" variant="info">
        <p className="text-sm font-bold text-[var(--color-primary-dark)]">正式帳票項目は後続Stepで反映予定</p>
        <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">今回は入力・仮保存・状態反映の流れだけを確認する画面です。</p>
      </Card>

      <section className="grid gap-3">
        <SectionTitle title="衛生管理3帳票" description="仮項目で記録できます。" />
        {hygieneMenus.map((item) => {
          const Icon = item.icon;
          return (
            <Link href={item.href} key={item.title}>
              <Card className="flex items-center gap-3 rounded-2xl p-4 shadow-sm" variant="clickable">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <Icon size={24} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--color-text-muted)]">{item.description}</span>
                </span>
                <Badge>入力</Badge>
              </Card>
            </Link>
          );
        })}
      </section>
    </AppLayout>
  );
}
