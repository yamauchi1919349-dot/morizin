"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, ClipboardCheck, Link2, ListChecks, Settings, Stethoscope, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { BottomNavigation, Button, Card } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { defaultFacilitySettings, getFacilitySettings, type FacilitySettings } from "@/lib/facilitySettingsStorage";
import { listAnimals } from "@/lib/supabase/animals";
import { emptyWeather, fetchCurrentLocationWeather, formatDashboardWeatherLine, type CurrentLocationWeather } from "@/lib/weather";
import { type Animal } from "@/types/gibier";

const menus = [
  { label: "個体受入", href: "/animals/receive", icon: ClipboardCheck },
  { label: "個体一覧", href: "/animals", icon: Users },
  { label: "トレーサビリティ", href: "/pdf/traceability-bulk", icon: Link2 },
  { label: "設定", href: "/settings", icon: Settings },
];

function toDateKey(value: string) {
  const match = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function todayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const match = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function getDayDiff(from: Date, to: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((to.getTime() - from.getTime()) / millisecondsPerDay);
}

type AgingSuggestion = {
  priority: number;
  scheduledTime: number;
  icon: string;
  message: string;
  reason: string;
  className: string;
};

function createAgingSuggestions(animals: Animal[], agingDays: number) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return animals
    .filter((animal) => animal.status === "received")
    .map((animal) => {
      const receivedDate = parseLocalDate(animal.receivedAt);
      if (!receivedDate) return null;

      const processingDate = addDays(receivedDate, agingDays);
      const diffDays = getDayDiff(todayStart, processingDate);
      const elapsedDays = getDayDiff(receivedDate, todayStart);
      const scheduledTime = processingDate.getTime();

      if (diffDays < 0) {
        return {
          priority: 1,
          scheduledTime,
          icon: "🔴",
          message: `${animal.animalNumber} は精肉予定日を${Math.abs(diffDays)}日超過しています。`,
          reason: `搬入から${elapsedDays}日経過 / 熟成期間${agingDays}日`,
          className: "border-red-200 bg-red-50 text-red-900",
        };
      }
      if (diffDays === 0) {
        return {
          priority: 2,
          scheduledTime,
          icon: "🟢",
          message: `本日 ${animal.animalNumber} の精肉日です。`,
          reason: `搬入から${elapsedDays}日経過 / 熟成期間${agingDays}日`,
          className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        };
      }
      if (diffDays === 1) {
        return {
          priority: 3,
          scheduledTime,
          icon: "🟡",
          message: `${animal.animalNumber} の精肉1日前です。`,
          reason: `明日が精肉予定日 / 熟成期間${agingDays}日`,
          className: "border-yellow-200 bg-yellow-50 text-yellow-900",
        };
      }

      return null;
    })
    .filter((suggestion): suggestion is AgingSuggestion => Boolean(suggestion))
    .sort((a, b) => a.priority - b.priority || a.scheduledTime - b.scheduledTime)
    .slice(0, 3);
}

export default function DashboardPage() {
  const [weather, setWeather] = useState<CurrentLocationWeather>(emptyWeather);
  const [weatherError, setWeatherError] = useState(false);
  const [storedAnimals, setStoredAnimals] = useState<Animal[]>([]);
  const [facilitySettings, setFacilitySettings] = useState<FacilitySettings>(defaultFacilitySettings);

  useEffect(() => {
    let isMounted = true;

    // TODO: 将来は施設住所から天気取得も選択可能にする
    // TODO: 現在地取得と施設固定取得を設定で切替予定
    async function updateWeather() {
      try {
        const nextWeather = await fetchCurrentLocationWeather();
        if (!isMounted) return;
        setWeather(nextWeather);
        setWeatherError(false);
      } catch {
        if (isMounted) setWeather(emptyWeather);
        if (isMounted) setWeatherError(true);
      }
    }

    void updateWeather();
    const timeoutId = window.setTimeout(() => {
      void listAnimals().then((animals) => {
        if (isMounted) setStoredAnimals(animals);
      });
      setFacilitySettings(getFacilitySettings());
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const animals = storedAnimals;
  const todayReceivedCount = animals.filter((animal) => toDateKey(animal.receivedAt) === todayDateKey()).length;
  const unprocessedCount = animals.filter((animal) => animal.status === "received").length;
  const agingSuggestions = createAgingSuggestions(animals, facilitySettings.agingDays);
  const stats = [
    { label: "本日の搬入", value: todayReceivedCount, unit: "頭", icon: ClipboardCheck, tone: "text-[var(--color-primary)]" },
    { label: "未処理個体", value: unprocessedCount, unit: "頭", icon: Stethoscope, tone: "text-blue-700" },
  ];

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("dashboard")} />} className="relative mx-auto min-h-dvh max-w-md py-4">
      <div aria-hidden="true" className="fixed inset-0 z-0 min-h-dvh bg-[url('/images/backgrounds/dashboard-bg.webp')] bg-cover bg-center bg-no-repeat" />
      <div aria-hidden="true" className="fixed inset-0 z-0 min-h-dvh bg-emerald-950/40" />
      <div className="relative z-10 grid gap-4">
      <header className="overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,rgba(236,248,239,0.95),rgba(255,255,255,0.92)),linear-gradient(120deg,#b5d2e0,#f4f7ef)] p-4 shadow-[var(--shadow-md)]">
        <div className="flex items-center justify-between">
          <Button aria-label="メニュー" className="border-0 bg-white/75" variant="icon">
            <ListChecks size={20} />
          </Button>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Image alt="森zin" className="rounded-xl" height={28} src="/images/brand/morizin-icon.png" width={28} />
              <p className="text-sm font-bold text-[var(--color-primary)]">森zin</p>
            </div>
            <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">2026年6月24日（水）</p>
          </div>
          <div className="relative">
            <Button aria-label="通知" className="border-0 bg-white/75" variant="icon">
              <Bell size={20} />
            </Button>
            <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-red-600 ring-2 ring-white" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <div className="max-w-full overflow-hidden whitespace-nowrap rounded-full bg-white/75 px-2.5 py-1 text-right text-[11px] font-bold leading-none text-[var(--color-text)] shadow-sm">
            {formatDashboardWeatherLine(weather)}
          </div>
        </div>
        {weatherError ? <p className="mt-2 text-right text-[10px] font-bold text-[var(--color-text-muted)]">天気を取得できませんでした</p> : null}

        <section className="mt-4 grid grid-cols-2 gap-2">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <Card className="rounded-xl p-3 shadow-sm" key={item.label}>
                <p className="text-xs font-bold text-[var(--color-text)]">{item.label}</p>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div>
                    <span className="text-3xl font-bold text-[var(--color-text)]">{item.value}</span>
                    <span className="ml-1 text-xs font-bold text-[var(--color-text-muted)]">{item.unit}</span>
                  </div>
                  <Icon className={item.tone} size={30} />
                </div>
              </Card>
            );
          })}
        </section>
      </header>

      <Card className="grid gap-3 rounded-xl p-3 shadow-sm">
        {agingSuggestions.length > 0 ? (
          <div className="grid gap-2">
            {agingSuggestions.map((suggestion) => (
              <div className={`grid gap-1 rounded-lg border px-3 py-2 ${suggestion.className}`} key={suggestion.message}>
                <p className="break-words text-sm font-bold leading-6">
                  <span aria-hidden="true" className="mr-1">
                    {suggestion.icon}
                  </span>
                  {suggestion.message}
                </p>
                <p className="break-words text-xs font-semibold leading-5 opacity-80">{suggestion.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-[var(--color-text-muted)]">本日の精肉提案はありません</p>
        )}
      </Card>

      <section>
        <div className="grid grid-cols-2 gap-2">
          {menus.map((menu) => {
            const Icon = menu.icon;
            return (
              <Link className="block" href={menu.href} key={menu.label}>
                <Card className="grid h-[76px] place-items-center gap-1 overflow-hidden rounded-xl p-2 text-center shadow-sm" variant="clickable">
                  <Icon size={23} className="text-[var(--color-text)]" />
                  <span className="grid min-h-8 place-items-center overflow-hidden text-[10px] font-bold leading-tight text-[var(--color-text)]">{menu.label}</span>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
      </div>
    </AppLayout>
  );
}
