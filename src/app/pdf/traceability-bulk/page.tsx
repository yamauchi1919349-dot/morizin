"use client";

import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, Input, SectionTitle } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { getAnimals } from "@/lib/animalStorage";
import { getAnimalPhotosByAnimalId } from "@/lib/animalPhotoStorage";
import { getFacilityHygieneRecords, getHealthCheckRecords, getWorkHygieneRecords } from "@/lib/hygieneStorage";
import { getInventoryItemsByAnimalId } from "@/lib/inventoryStorage";
import { getShipmentsByAnimalId } from "@/lib/shipmentStorage";
import { generateTraceabilityPdf } from "@/lib/traceabilityPdf";
import { animalStatusBadgeTone, animalStatusLabel, speciesLabel, type Animal } from "@/types/gibier";

function animalNumberValue(value: string) {
  const numericText = value.replace(/\D/g, "");
  return numericText ? Number(numericText) : Number.NaN;
}

function inNumberRange(animalNumber: string, start: string, end: string) {
  const animalValue = animalNumberValue(animalNumber);
  const startValue = animalNumberValue(start);
  const endValue = animalNumberValue(end);

  if (Number.isNaN(animalValue)) return false;
  if (!Number.isNaN(startValue) && animalValue < startValue) return false;
  if (!Number.isNaN(endValue) && animalValue > endValue) return false;
  return true;
}

function uniqueAnimals(animals: Animal[]) {
  return animals.filter((animal, index, array) => array.findIndex((item) => item.id === animal.id || item.animalNumber === animal.animalNumber) === index);
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return items.filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index);
}

function getShipmentsForAnimal(animal: Animal) {
  return uniqueById([
    ...getShipmentsByAnimalId(animal.id),
    ...getShipmentsByAnimalId(animal.animalNumber),
  ]);
}

export default function TraceabilityBulkPdfPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [startNumber, setStartNumber] = useState("126001");
  const [endNumber, setEndNumber] = useState("126010");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAnimals(uniqueAnimals(getAnimals()).sort((a, b) => a.animalNumber.localeCompare(b.animalNumber)));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const selectedAnimals = useMemo(() => animals.filter((animal) => inNumberRange(animal.animalNumber, startNumber, endNumber)), [animals, endNumber, startNumber]);

  async function handleBulkExport() {
    if (selectedAnimals.length === 0) {
      setMessage("");
      setError("対象個体がありません。開始番号と終了番号を確認してください。");
      return;
    }

    setIsGenerating(true);
    setMessage("");
    setError("");

    try {
      const facilityRecords = getFacilityHygieneRecords();
      const healthRecords = getHealthCheckRecords();

      for (const animal of selectedAnimals) {
        const photos = uniqueById([
          ...getAnimalPhotosByAnimalId(animal.id),
          ...getAnimalPhotosByAnimalId(animal.animalNumber),
        ]);
        const inventoryItems = uniqueById([
          ...getInventoryItemsByAnimalId(animal.id),
          ...getInventoryItemsByAnimalId(animal.animalNumber),
        ]);
        const shipments = getShipmentsForAnimal(animal);
        const workRecords = getWorkHygieneRecords().filter((record) => record.animalId === animal.id || record.animalNumber === animal.animalNumber);

        await generateTraceabilityPdf({
          animal,
          photos,
          facilityRecords,
          workRecords,
          healthRecords,
          inventoryItems,
          shipments,
        });
      }

      setMessage(`${selectedAnimals.length}件のトレーサビリティPDFを出力しました。`);
    } catch (caughtError) {
      console.error(caughtError);
      setError("一括出力に失敗しました。対象個体を確認して再度お試しください。");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("settings")} />} className="mx-auto grid max-w-md gap-4 overflow-x-hidden py-4">
      <header className="flex items-center justify-between">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href="/dashboard">
          <ArrowLeft size={18} />
          戻る
        </Link>
        <Badge>PDF</Badge>
      </header>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <FileText size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[var(--color-text)]">トレーサビリティPDF一括出力</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">個体識別番号の範囲を指定して、お客様用トレーサビリティPDFをまとめて出力します。</p>
          </div>
        </div>
      </Card>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="範囲選択" description="個体識別番号 126001 〜 126010 のように入力してください。" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
          <div className="min-w-0">
            <Input className="w-full min-w-0" label="開始番号" onChange={(event) => setStartNumber(event.target.value)} placeholder="126001" value={startNumber} />
          </div>
          <span className="pb-3 text-sm font-bold text-[var(--color-text-muted)]">〜</span>
          <div className="min-w-0">
            <Input className="w-full min-w-0" label="終了番号" onChange={(event) => setEndNumber(event.target.value)} placeholder="126010" value={endNumber} />
          </div>
        </div>
        <div className="rounded-xl bg-[var(--color-primary-soft)] px-3 py-2 text-sm font-bold text-[var(--color-primary-dark)]">
          対象件数：{selectedAnimals.length}件
        </div>
      </Card>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="対象個体プレビュー" description={`${selectedAnimals.length}件が一括出力対象です。`} />
        {selectedAnimals.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-[var(--color-text-muted)]">該当する個体がありません。</p>
        ) : (
          <div className="grid gap-2">
            {selectedAnimals.map((animal) => {
              const shipments = getShipmentsForAnimal(animal);

              return (
                <div className="grid min-w-0 gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3" key={animal.id}>
                  <div className="grid gap-1">
                    <p className="text-base font-bold text-[var(--color-text)]">No.{animal.animalNumber}</p>
                    <p className="text-xs font-semibold text-[var(--color-text-muted)]">種別：{speciesLabel[animal.species]}</p>
                    <p className="text-xs font-semibold text-[var(--color-text-muted)]">捕獲日：{animal.capturedAt}</p>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs font-bold">
                    <span className="text-[var(--color-text-muted)]">ステータス</span>
                    <Badge className="max-w-full" variant={animalStatusBadgeTone[animal.status]}>{animalStatusLabel[animal.status]}</Badge>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs font-bold">
                    <span className="text-[var(--color-text-muted)]">出荷情報</span>
                    <Badge variant={shipments.length > 0 ? "success" : "muted"}>{shipments.length > 0 ? "あり" : "なし"}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <Button className="min-h-12 w-full" disabled={isGenerating || selectedAnimals.length === 0} leftIcon={<Download size={17} />} onClick={handleBulkExport}>
          {isGenerating ? "出力中..." : "トレーサビリティPDFを一括出力"}
        </Button>
        {message ? <p className="text-sm font-bold text-[var(--color-primary)]">{message}</p> : null}
        {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}
      </Card>

      <Card className="grid gap-2 rounded-2xl bg-slate-50 p-4 shadow-sm">
        <p className="text-xs font-bold text-[var(--color-text)]">注意</p>
        <p className="text-xs font-semibold leading-5 text-[var(--color-text-muted)]">・対象はお客様用トレーサビリティPDFのみです</p>
        <p className="text-xs font-semibold leading-5 text-[var(--color-text-muted)]">・個体カルテPDFは個体詳細画面から個別に出力してください</p>
        <p className="text-xs font-semibold leading-5 text-[var(--color-text-muted)]">・正式なクラウド保存・出力履歴は後続Stepで対応予定</p>
      </Card>
    </AppLayout>
  );
}
