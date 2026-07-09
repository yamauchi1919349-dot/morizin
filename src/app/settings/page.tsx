"use client";

import Link from "next/link";
import { ArrowLeft, CreditCard, Database, Settings, Users } from "lucide-react";
import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, SectionTitle } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { migrateLocalAnimalsToSupabase, type AnimalMigrationResult } from "@/lib/supabase/animals";

const ownerItems = [
  { title: "契約管理", description: "契約状態を確認する器です。", icon: Users },
  { title: "支払い管理", description: "支払い情報を確認する器です。", icon: CreditCard },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [migrationResult, setMigrationResult] = useState<AnimalMigrationResult | null>(null);
  const [isMigratingAnimals, setIsMigratingAnimals] = useState(false);

  async function handleMigrateAnimals() {
    setIsMigratingAnimals(true);
    try {
      setMigrationResult(await migrateLocalAnimalsToSupabase());
    } finally {
      setIsMigratingAnimals(false);
    }
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

      {user ? (
        <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <Database className="text-[var(--color-primary)]" size={24} />
            <Badge variant="muted">Supabase</Badge>
          </div>
          <div>
            <p className="font-bold">ローカル個体データをSupabaseへ移行</p>
            <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">localStorageは削除せず、個体識別番号が重複する場合は既存データを更新します。</p>
          </div>
          <Button disabled={isMigratingAnimals} onClick={handleMigrateAnimals} variant="secondary">
            {isMigratingAnimals ? "移行中..." : "ローカル個体データをSupabaseへ移行"}
          </Button>
          {migrationResult ? (
            <>
            <p className="text-xs font-bold text-[var(--color-text-muted)]">
              成功 {migrationResult.successCount}件 / 失敗 {migrationResult.failureCount}件 / スキップ {migrationResult.skippedCount}件
            </p>
              {migrationResult.failureReasons.slice(0, 3).map((reason) => (
                <p className="text-xs font-bold text-red-600" key={reason}>
                  {reason}
                </p>
              ))}
            </>
          ) : null}
        </Card>
      ) : null}

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
