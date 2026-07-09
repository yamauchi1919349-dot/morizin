"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Card, SectionTitle } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { traceabilityFormItems } from "@/constants/hygieneForms";
import { getAnimals } from "@/lib/animalStorage";
import { getFacilityHygieneRecords, getHealthCheckRecords, getWorkHygieneRecords } from "@/lib/hygieneStorage";
import { getInventoryItemsByAnimalId } from "@/lib/inventoryStorage";
import { getShipmentsByAnimalId } from "@/lib/shipmentStorage";
import { getSpeciesName } from "@/lib/facilitySettingsStorage";
import type { Animal, FacilityHygieneRecord, HealthCheckRecord, InventoryItem, Shipment, WorkHygieneRecord } from "@/types/gibier";

const facilityName = "ArcNest GIBIER";

function uniqueById<T extends { id: string }>(items: T[]) {
  return items.filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index);
}

function matchesAnimal(animal: Animal, candidateAnimalId?: string, candidateAnimalNumber?: string) {
  return candidateAnimalId === animal.id || candidateAnimalId === animal.animalNumber || candidateAnimalNumber === animal.id || candidateAnimalNumber === animal.animalNumber;
}

function sexLabel(sex: Animal["sex"]) {
  if (sex === "male") return "オス";
  if (sex === "female") return "メス";
  return "不明";
}

function speciesLabel(species: Animal["species"]) {
  if (species === "deer") return "ニホンジカ";
  if (species === "boar") return "イノシシ";
  return getSpeciesName(species);
}

function display(value?: string | number) {
  if (value === undefined || value === null || value === "") return "未登録";
  return String(value);
}

export default function AnimalTraceabilityPage() {
  const params = useParams<{ id: string }>();
  const animalId = params.id;
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [facilityRecords, setFacilityRecords] = useState<FacilityHygieneRecord[]>([]);
  const [workRecords, setWorkRecords] = useState<WorkHygieneRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthCheckRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedAnimal = getAnimals().find((item) => item.id === animalId || item.animalNumber === animalId);
      const nextAnimal = storedAnimal ?? null;
      setAnimal(nextAnimal);

      if (!nextAnimal) {
        setFacilityRecords([]);
        setWorkRecords([]);
        setHealthRecords([]);
        setInventoryItems([]);
        setShipments([]);
        return;
      }

      const localInventory = getInventoryItemsByAnimalId(nextAnimal.id).concat(getInventoryItemsByAnimalId(nextAnimal.animalNumber));
      const localShipments = getShipmentsByAnimalId(nextAnimal.id).concat(getShipmentsByAnimalId(nextAnimal.animalNumber));

      setFacilityRecords(getFacilityHygieneRecords().filter((record) => !record.animalNumber || matchesAnimal(nextAnimal, record.animalId, record.animalNumber)));
      setWorkRecords(getWorkHygieneRecords().filter((record) => matchesAnimal(nextAnimal, record.animalId, record.animalNumber)));
      setHealthRecords(getHealthCheckRecords().filter((record) => !record.animalNumber || matchesAnimal(nextAnimal, record.animalId, record.animalNumber)));
      setInventoryItems(uniqueById(localInventory));
      setShipments(uniqueById(localShipments));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [animalId]);

  const rows = useMemo(() => {
    if (!animal) return [];
    const latestWork = workRecords[0];

    return traceabilityFormItems.map((item) => {
      const valueById: Record<string, string> = {
        "animal-number": animal.animalNumber,
        "captured-at": animal.capturedAt,
        "processed-at": latestWork?.date ?? animal.receivedAt,
        "food-hygiene-manager": "TODO: 施設設定から取得",
        "filled-by": latestWork?.checkedBy ?? animal.receivedBy,
        "capture-area": animal.captureLocation,
        "hunter-initial": animal.hunterName,
        "capture-method": animal.captureMethod,
        "damage-area": "TODO: 被弾又は止め刺し行使部位",
        sex: sexLabel(animal.sex),
        weight: `${animal.weightKg}kg`,
        "metal-detector": inventoryItems.length > 0 ? "検査予定項目あり" : "TODO: 検査結果未登録",
        "phone-number": "TODO: 公開用電話番号",
        "heating-storage": "加熱用：－１８度以下保存",
      };

      return { ...item, value: valueById[item.id] ?? "TODO: 未確定" };
    });
  }, [animal, inventoryItems.length, workRecords]);

  const hygieneStatus = [
    { label: "施設衛生点検簿", count: facilityRecords.length },
    { label: "作業時衛生管理簿", count: workRecords.length },
    { label: "健康管理簿", count: healthRecords.length },
  ];

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("animals")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href={animal ? `/animals/${animal.animalNumber}` : "/animals"}>
          <ArrowLeft size={18} />
          詳細へ
        </Link>
        <h1 className="text-base font-bold">トレーサビリティ</h1>
        <Badge>帳票仕様</Badge>
      </header>

      {!animal ? (
        <Card className="grid gap-3 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-lg font-bold">個体が見つかりません</p>
          <p className="text-sm text-[var(--color-text-muted)]">個体一覧から選び直してください。</p>
        </Card>
      ) : (
        <>
          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[var(--color-text-muted)]">個体受入れ管理表</p>
                <h2 className="mt-1 text-3xl font-bold">{animal.animalNumber}</h2>
                <p className="mt-1 text-sm font-bold text-[var(--color-text-muted)]">{speciesLabel(animal.species)}</p>
              </div>
              <Badge>{shipments.length > 0 ? "出荷記録あり" : "確認中"}</Badge>
            </div>
          </Card>

          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm" variant="info">
            <SectionTitle title="お客様用トレーサビリティ票" description="添付のトレーサビリティ票と同じ項目順で表示しています。" />
            <div className="grid gap-2">
              {rows.map((row) => (
                <div className="grid gap-1 rounded-xl border border-[var(--color-border)] bg-white p-3" key={row.id}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-bold text-[var(--color-text-muted)]">{row.label}</span>
                    <strong className="text-right text-sm">{display(row.value)}</strong>
                  </div>
                  {row.note ? <p className="text-xs font-semibold text-orange-700">{row.note}</p> : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
            <SectionTitle title="登録状態" description="個体詳細からの登録状態反映を確認する欄です。" />
            <div className="grid gap-2">
              {hygieneStatus.map((item) => (
                <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-3" key={item.label}>
                  <span className="text-sm font-bold">{item.label}</span>
                  <Badge variant={item.count > 0 ? "success" : "muted"}>{item.count > 0 ? `${item.count}件` : "未登録"}</Badge>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-3">
                <span className="text-sm font-bold">在庫登録</span>
                <Badge variant={inventoryItems.length > 0 ? "success" : "muted"}>{inventoryItems.length > 0 ? `${inventoryItems.length}件` : "未登録"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-3">
                <span className="text-sm font-bold">出荷登録</span>
                <Badge variant={shipments.length > 0 ? "success" : "muted"}>{shipments.length > 0 ? `${shipments.length}件` : "未登録"}</Badge>
              </div>
            </div>
          </Card>

          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm" variant="pdf">
            <SectionTitle title="後続StepのPDF化対象" description="今回はPDF生成せず、画面上の確認項目だけを正式帳票へ寄せています。" />
            <div className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-bold text-[var(--color-primary)]">
              <ShieldCheck size={18} />
              <span>個体受入れ管理表の項目構成で出力予定</span>
            </div>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-bold text-white" href={`/animals/${animal.animalNumber}/pdf`}>
              <FileText size={18} />
              PDFプレビューへ
            </Link>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
