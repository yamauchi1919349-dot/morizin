"use client";

import Link from "next/link";
import { ArrowLeft, CreditCard, Settings, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, Input, SectionTitle } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { getFacilitySettings, saveFacilitySettings } from "@/lib/facilitySettingsStorage";

const ownerItems = [
  { title: "契約管理", description: "契約状態を確認する器です。", icon: Users },
  { title: "支払い管理", description: "支払い情報を確認する器です。", icon: CreditCard },
];

export default function SettingsPage() {
  const [agingDays, setAgingDays] = useState("3");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAgingDays(String(getFacilitySettings().agingDays));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleSaveFacilitySettings() {
    const nextAgingDays = Math.max(0, Number(agingDays) || 0);

    saveFacilitySettings({ ...getFacilitySettings(), agingDays: nextAgingDays });
    setAgingDays(String(nextAgingDays));
    setSavedMessage("保存しました");
  }

  return (
    <AppLayout
      bottomNavigation={<BottomNavigation items={createAppNavigationItems("settings")} />}
      className="mx-auto grid max-w-md gap-3 py-4"
    >
      <header className="grid gap-3">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-white px-3 text-sm font-bold text-[var(--color-primary)] shadow-sm" href="/dashboard">
          <ArrowLeft size={18} />
          ダッシュボードへ戻る
        </Link>
        <div>
          <p className="text-xs font-bold text-[var(--color-primary)]">Settings</p>
          <h1 className="mt-1 text-xl font-bold">設定</h1>
        </div>
      </header>

      <Card className="grid gap-4 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="施設設定" description="施設ごとの運用条件を保存します。" />
        <Input
          className="w-full"
          inputMode="numeric"
          label="熟成期間（日）"
          min={0}
          onChange={(event) => {
            setAgingDays(event.target.value);
            setSavedMessage("");
          }}
          type="number"
          value={agingDays}
        />
        <Button className="min-h-12 w-full" onClick={handleSaveFacilitySettings}>
          保存
        </Button>
        {savedMessage ? <p className="text-sm font-bold text-[var(--color-primary)]">{savedMessage}</p> : null}
      </Card>

      <Link href="/settings/facility">
        <Card className="grid gap-3 rounded-2xl p-4 shadow-sm" variant="clickable">
          <div className="flex items-center justify-between gap-3">
            <Settings className="text-[var(--color-primary)]" size={28} />
            <Badge>施設設定</Badge>
          </div>
          <div>
            <p className="font-bold">施設設定</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">施設情報、スタッフ招待、熟成期間、種別、PDF表示情報を登録します。</p>
          </div>
        </Card>
      </Link>

      <section className="grid gap-3">
        <SectionTitle title="Owner専用管理" description="今回は表示だけの空器です。" />
        <div className="grid gap-3">
          {ownerItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card className="grid gap-3 rounded-2xl p-4 shadow-sm" key={item.title} variant="clickable">
                <div className="flex items-center justify-between gap-3">
                  <Icon className="text-[var(--color-primary)]" size={28} />
                  <Badge variant="muted">未実装</Badge>
                </div>
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </AppLayout>
  );
}
