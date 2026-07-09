"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardCheck, FileText, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, SectionTitle } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { facilityHygieneFormItems, healthCheckFormItems, traceabilityFormItems, workHygieneFormItems } from "@/constants/hygieneForms";
import { getAnimals } from "@/lib/animalStorage";
import { getAnimalPhotosByAnimalId } from "@/lib/animalPhotoStorage";
import { generateAnimalKartePdf } from "@/lib/animalKartePdf";
import { getFacilityHygieneRecords, getHealthCheckRecords, getWorkHygieneRecords } from "@/lib/hygieneStorage";
import { getInventoryItemsByAnimalId } from "@/lib/inventoryStorage";
import { getShipmentsByAnimalId } from "@/lib/shipmentStorage";
import { generateTraceabilityPdf } from "@/lib/traceabilityPdf";
import { getSpeciesName } from "@/lib/facilitySettingsStorage";
import {
  animalAcceptanceDecisionLabel,
  antlerStatusLabel,
  estimatedAgeLabel,
  pregnancyStatusLabel,
  processingAbnormalityItems,
  receivingAbnormalityItems,
  type Animal,
  type AnimalPhoto,
  type FacilityHygieneRecord,
  type HealthCheckRecord,
  type InventoryItem,
  type PdfExportType,
  type Shipment,
  type WorkHygieneRecord,
} from "@/types/gibier";

type PreviewRow = {
  label: string;
  value: string;
};

type PreviewSection = {
  title: string;
  rows: PreviewRow[];
};

const speciesLabel: Record<Animal["species"], string> = {
  deer: "ニホンジカ",
  boar: "イノシシ",
};

const statusLabel: Record<Animal["status"], string> = {
  received: "受入済み",
  waiting_processing: "処理待ち",
  processing: "処理中",
  processed: "処理済み",
  in_stock: "在庫保管",
  waiting_shipment: "出荷待ち",
  shipped: "出荷済み",
  discarded: "廃棄",
  needs_review: "要確認",
};

function uniqueById<T extends { id: string }>(items: T[]) {
  return items.filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index);
}

function matchesAnimal(animal: Animal, candidateAnimalId?: string, candidateAnimalNumber?: string) {
  return candidateAnimalId === animal.id || candidateAnimalId === animal.animalNumber || candidateAnimalNumber === animal.id || candidateAnimalNumber === animal.animalNumber;
}

function display(value?: string | number) {
  if (value === undefined || value === null || value === "") return "未登録";
  return String(value);
}

export default function AnimalPdfPage() {
  const params = useParams<{ id: string }>();
  const animalId = params.id;
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [selectedType, setSelectedType] = useState<PdfExportType>("animal_karte");
  const [photos, setPhotos] = useState<AnimalPhoto[]>([]);
  const [facilityRecords, setFacilityRecords] = useState<FacilityHygieneRecord[]>([]);
  const [workRecords, setWorkRecords] = useState<WorkHygieneRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthCheckRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [generatingType, setGeneratingType] = useState<PdfExportType | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedAnimal = getAnimals().find((item) => item.id === animalId || item.animalNumber === animalId);
      const nextAnimal = storedAnimal ?? null;
      setAnimal(nextAnimal);

      if (!nextAnimal) {
        setPhotos([]);
        setFacilityRecords([]);
        setWorkRecords([]);
        setHealthRecords([]);
        setInventoryItems([]);
        setShipments([]);
        return;
      }

      const localPhotos = getAnimalPhotosByAnimalId(nextAnimal.id).concat(getAnimalPhotosByAnimalId(nextAnimal.animalNumber));
      const localInventory = getInventoryItemsByAnimalId(nextAnimal.id).concat(getInventoryItemsByAnimalId(nextAnimal.animalNumber));
      const localShipments = getShipmentsByAnimalId(nextAnimal.id).concat(getShipmentsByAnimalId(nextAnimal.animalNumber));

      setPhotos(uniqueById(localPhotos));
      setFacilityRecords(getFacilityHygieneRecords().filter((record) => !record.animalNumber || matchesAnimal(nextAnimal, record.animalId, record.animalNumber)));
      setWorkRecords(getWorkHygieneRecords().filter((record) => matchesAnimal(nextAnimal, record.animalId, record.animalNumber)));
      setHealthRecords(getHealthCheckRecords().filter((record) => !record.animalNumber || matchesAnimal(nextAnimal, record.animalId, record.animalNumber)));
      setInventoryItems(uniqueById(localInventory));
      setShipments(uniqueById(localShipments));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [animalId]);

  const previewSections = useMemo<PreviewSection[]>(() => {
    if (!animal) return [];

    const receivingAbnormalityCount = receivingAbnormalityItems.filter((item) => animal.receivingAbnormalityChecks?.find((check) => check.itemId === item.id)?.result === "yes").length;
    const processingAbnormalityCount = processingAbnormalityItems.filter((item) => animal.processingAbnormalityChecks?.find((check) => check.itemId === item.id)?.result === "abnormal").length;

    if (selectedType === "traceability") {
      return [
        {
          title: "トレーサビリティPDF",
          rows: [
            { label: "用途", value: "お客様用トレーサビリティ票" },
            { label: "個体識別番号", value: animal.animalNumber },
            { label: "動物種", value: speciesLabel[animal.species] ?? getSpeciesName(animal.species) },
            { label: "妊娠の有無", value: pregnancyStatusLabel[animal.pregnancyStatus ?? ""] },
            { label: "角の有無", value: antlerStatusLabel[animal.antlerStatus ?? ""] },
            { label: "推定年齢", value: estimatedAgeLabel[animal.estimatedAge ?? ""] },
            { label: "捕獲情報", value: `${animal.capturedAt} / ${animal.captureLocation}` },
            { label: "搬入・処理情報", value: `${animal.receivedAt} / ${statusLabel[animal.status]}` },
            { label: "受入時の異常", value: receivingAbnormalityCount > 0 ? `${receivingAbnormalityCount}件あり` : "すべていいえ" },
            { label: "解体時の異常", value: processingAbnormalityCount > 0 ? `${processingAbnormalityCount}件あり` : "すべて問題なし" },
            { label: "受入可否", value: animalAcceptanceDecisionLabel[animal.acceptanceDecision ?? "accepted"] },
            { label: "出荷情報", value: shipments.length > 0 ? `${shipments.length}件登録` : "未登録" },
            { label: "参照項目数", value: `${traceabilityFormItems.length}項目` },
          ],
        },
        {
          title: "安心確認",
          rows: [
            { label: "写真記録", value: photos.length > 0 ? `${photos.length}件` : "未登録" },
            { label: "衛生管理記録", value: facilityRecords.length + workRecords.length + healthRecords.length > 0 ? "登録済み" : "未登録" },
            { label: "在庫記録", value: inventoryItems.length > 0 ? `${inventoryItems.length}件` : "未登録" },
            { label: "出荷記録", value: shipments.length > 0 ? `${shipments.length}件` : "未登録" },
          ],
        },
      ];
    }

    return [
      {
        title: "個体カルテPDF",
        rows: [
          { label: "用途", value: "国産ジビエ認証提出用" },
          { label: "個体識別番号", value: animal.animalNumber },
          { label: "種別", value: speciesLabel[animal.species] ?? getSpeciesName(animal.species) },
          { label: "妊娠の有無", value: pregnancyStatusLabel[animal.pregnancyStatus ?? ""] },
          { label: "角の有無", value: antlerStatusLabel[animal.antlerStatus ?? ""] },
          { label: "推定年齢", value: estimatedAgeLabel[animal.estimatedAge ?? ""] },
          { label: "捕獲日", value: animal.capturedAt },
          { label: "搬入日", value: animal.receivedAt },
          { label: "受入時の異常", value: receivingAbnormalityCount > 0 ? `${receivingAbnormalityCount}件あり` : "すべていいえ" },
          { label: "解体時の異常", value: processingAbnormalityCount > 0 ? `${processingAbnormalityCount}件あり` : "すべて問題なし" },
          { label: "受入可否", value: animalAcceptanceDecisionLabel[animal.acceptanceDecision ?? "accepted"] },
          { label: "現在ステータス", value: statusLabel[animal.status] },
        ],
      },
      {
        title: "正式帳票",
        rows: [
          { label: "施設衛生点検簿", value: `${facilityHygieneFormItems.length}項目 / ${facilityRecords.length > 0 ? `${facilityRecords.length}件登録` : "未登録"}` },
          { label: "作業時衛生管理簿", value: `${workHygieneFormItems.length}項目 / ${workRecords.length > 0 ? `${workRecords.length}件登録` : "未登録"}` },
          { label: "健康管理簿", value: `${healthCheckFormItems.length}項目 / ${healthRecords.length > 0 ? `${healthRecords.length}件登録` : "未登録"}` },
        ],
      },
      {
        title: "関連記録",
        rows: [
          { label: "写真記録", value: photos.length > 0 ? `${photos.length}件` : "未登録" },
          { label: "在庫記録", value: inventoryItems.length > 0 ? `${inventoryItems.length}件` : "未登録" },
          { label: "出荷記録", value: shipments.length > 0 ? `${shipments.length}件` : "未登録" },
          { label: "作業履歴・確認欄", value: "仮表示を含めて出力" },
        ],
      },
    ];
  }, [animal, facilityRecords.length, healthRecords.length, inventoryItems.length, photos.length, selectedType, shipments.length, workRecords.length]);

  async function handleGenerateAnimalKartePdf() {
    if (!animal || generatingType) return;

    setGeneratingType("animal_karte");
    setSuccessMessage("");
    setErrorMessage("");

    try {
      await generateAnimalKartePdf({
        animal,
        photos,
        facilityRecords,
        workRecords,
        healthRecords,
        inventoryItems,
        shipments,
      });
      setSuccessMessage("個体カルテPDFを生成しました。ダウンロードを確認してください。");
    } catch (error) {
      console.error(error);
      setErrorMessage("個体カルテPDFを生成できませんでした。時間をおいて再実行してください。");
    } finally {
      setGeneratingType(null);
    }
  }

  async function handleGenerateTraceabilityPdf() {
    if (!animal || generatingType) return;

    setGeneratingType("traceability");
    setSuccessMessage("");
    setErrorMessage("");

    try {
      await generateTraceabilityPdf({
        animal,
        photos,
        facilityRecords,
        workRecords,
        healthRecords,
        inventoryItems,
        shipments,
      });
      setSuccessMessage("トレーサビリティPDFを生成しました。ダウンロードを確認してください。");
    } catch (error) {
      console.error(error);
      setErrorMessage("トレーサビリティPDFを生成できませんでした。時間をおいて再実行してください。");
    } finally {
      setGeneratingType(null);
    }
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("animals")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href={animal ? `/animals/${animal.animalNumber}` : "/animals"}>
          <ArrowLeft size={18} />
          詳細へ
        </Link>
        <h1 className="text-base font-bold">PDFプレビュー</h1>
        <Badge>{selectedType === "animal_karte" ? "カルテ" : "お客様用"}</Badge>
      </header>

      {!animal ? (
        <Card className="grid gap-3 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-lg font-bold">個体が見つかりません</p>
          <p className="text-sm text-[var(--color-text-muted)]">PDFプレビューする個体を選び直してください。</p>
        </Card>
      ) : (
        <>
          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-[var(--color-text-muted)]">対象個体</p>
            <h2 className="text-3xl font-bold">{animal.animalNumber}</h2>
            <p className="text-sm font-bold text-[var(--color-text-muted)]">
              {speciesLabel[animal.species] ?? getSpeciesName(animal.species)} / {statusLabel[animal.status]}
            </p>
          </Card>

          <div className="grid gap-3">
            <Card className={`grid gap-3 rounded-2xl border-2 p-4 shadow-sm ${selectedType === "animal_karte" ? "border-purple-400" : "border-[var(--color-border)]"}`} variant="pdf">
              <SectionTitle title="個体カルテPDF" description="国産ジビエ認証提出用。Step17で実装済みのPDFです。" />
              <Button leftIcon={<ClipboardCheck size={18} />} onClick={() => setSelectedType("animal_karte")}>
                個体カルテPDFをプレビュー
              </Button>
              <Button disabled={Boolean(generatingType)} leftIcon={generatingType === "animal_karte" ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />} onClick={handleGenerateAnimalKartePdf}>
                {generatingType === "animal_karte" ? "生成中..." : "個体カルテPDFを生成"}
              </Button>
            </Card>

            <Card className={`grid gap-3 rounded-2xl border-2 p-4 shadow-sm ${selectedType === "traceability" ? "border-[var(--color-primary)]" : "border-[var(--color-border)]"}`}>
              <SectionTitle title="トレーサビリティPDF" description="お客様・取引先向けのシンプルな安心情報PDFです。" />
              <Button leftIcon={<FileText size={18} />} onClick={() => setSelectedType("traceability")} variant="secondary">
                トレーサビリティPDFをプレビュー
              </Button>
              <Button disabled={Boolean(generatingType)} leftIcon={generatingType === "traceability" ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />} onClick={handleGenerateTraceabilityPdf}>
                {generatingType === "traceability" ? "生成中..." : "トレーサビリティPDFを生成"}
              </Button>
            </Card>
          </div>

          {successMessage ? (
            <Card className="flex items-center gap-3 rounded-2xl p-4 text-sm font-bold text-[var(--color-primary)] shadow-sm" variant="info">
              <CheckCircle2 size={22} />
              {successMessage}
            </Card>
          ) : null}

          {errorMessage ? <Card className="rounded-2xl border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-sm">{errorMessage}</Card> : null}

          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
            <SectionTitle
              title={selectedType === "animal_karte" ? "個体カルテPDF 出力前プレビュー" : "トレーサビリティPDF 出力前プレビュー"}
              description={selectedType === "animal_karte" ? "国産ジビエ認証提出用PDFの内容概要です。" : "お客様用PDFの内容概要です。"}
            />
            <div className="grid gap-3">
              {previewSections.map((section) => (
                <div className="rounded-xl border border-[var(--color-border)] bg-white p-3" key={section.title}>
                  <p className="mb-2 text-sm font-bold">{section.title}</p>
                  <div className="grid gap-1.5">
                    {section.rows.map((row) => (
                      <div className="flex justify-between gap-3 text-xs" key={`${section.title}-${row.label}`}>
                        <span className="font-semibold text-[var(--color-text-muted)]">{row.label}</span>
                        <strong className="text-right">{display(row.value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
