"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, ConfirmDialog, SectionTitle } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { getAnimals, saveAnimals } from "@/lib/animalStorage";
import { getAnimalPhotosByAnimalId } from "@/lib/animalPhotoStorage";
import { generateAnimalKartePdf } from "@/lib/animalKartePdf";
import { getAnimalStatusBadgeClass, getAnimalStatusLabel } from "@/lib/animalStatus";
import { getFacilityHygieneRecords, getHealthCheckRecords, getWorkHygieneRecords } from "@/lib/hygieneStorage";
import { getInventoryItemsByAnimalId } from "@/lib/inventoryStorage";
import { getShipmentsByAnimalId } from "@/lib/shipmentStorage";
import { generateTraceabilityPdf } from "@/lib/traceabilityPdf";
import { getSpeciesName } from "@/lib/facilitySettingsStorage";
import {
  bleedingPerformedLabel,
  antlerStatusLabel,
  animalAcceptanceDecisionLabel,
  estimatedAgeLabel,
  impactOrBleedingPartLabel,
  knifeSanitationMethodLabel,
  processingAbnormalityItems,
  processingAbnormalityResultLabel,
  pregnancyStatusLabel,
  receivingAbnormalityItems,
  receivingAbnormalityResultLabel,
  sexLabel,
  speciesLabel,
  transportCoolingLabel,
  type Animal,
  type FacilityHygieneRecord,
  type HealthCheckRecord,
  type AnimalPhoto,
  type AnimalPhotoType,
  type InventoryItem,
  type PdfExportType,
  type Shipment,
  type WorkHygieneRecord,
} from "@/types/gibier";

const photoSlots: Array<{ type: AnimalPhotoType; label: string }> = [
  { type: "damage", label: "被弾箇所" },
];

function uniqueById<T extends { id: string }>(items: T[]) {
  return items.filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index);
}

function matchesAnimal(animal: Animal, candidateAnimalId?: string, candidateAnimalNumber?: string) {
  return candidateAnimalId === animal.id || candidateAnimalId === animal.animalNumber || candidateAnimalNumber === animal.id || candidateAnimalNumber === animal.animalNumber;
}

function getReceivingAbnormalityResult(animal: Animal, itemId: string) {
  return animal.receivingAbnormalityChecks?.find((check) => check.itemId === itemId)?.result ?? "no";
}

function getProcessingAbnormalityCheck(animal: Animal, itemId: string) {
  return animal.processingAbnormalityChecks?.find((check) => check.itemId === itemId) ?? { itemId, result: "ok" as const, note: "" };
}

export default function AnimalDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const animalId = params.id;
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [photos, setPhotos] = useState<AnimalPhoto[]>([]);
  const [facilityRecords, setFacilityRecords] = useState<FacilityHygieneRecord[]>([]);
  const [workRecords, setWorkRecords] = useState<WorkHygieneRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthCheckRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [generatingType, setGeneratingType] = useState<PdfExportType | null>(null);
  const [pdfMessage, setPdfMessage] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedAnimal = getAnimals().find((item) => item.id === animalId || item.animalNumber === animalId);
      const nextAnimal = storedAnimal ?? null;

      setAnimal(nextAnimal);
      setPdfMessage("");
      setPdfError("");

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

  const rows = animal
    ? [
        ["個体識別番号", animal.animalNumber],
        ["種別", speciesLabel[animal.species] ?? getSpeciesName(animal.species)],
        ["性別", sexLabel[animal.sex]],
        ["妊娠の有無", pregnancyStatusLabel[animal.pregnancyStatus ?? ""]],
        ["角の有無", antlerStatusLabel[animal.antlerStatus ?? ""]],
        ["推定年齢", estimatedAgeLabel[animal.estimatedAge ?? ""]],
        ["体重", `${animal.weightKg}kg`],
        ["捕獲日時", animal.capturedAt],
        ["天気", animal.weather || "未入力"],
        ["気温", animal.temperatureC ? `${animal.temperatureC}℃` : "未入力"],
        ["捕獲場所", animal.captureLocation],
        ["メッシュ番号", animal.meshNumber || "未入力"],
        ["捕獲方法", animal.captureMethod],
        ["捕獲者名", animal.hunterName],
        ["搬入日時", animal.receivedAt],
        ["搬入者", animal.transportedBy ?? animal.hunterName],
        ["止め刺し者", animal.stopBleedingBy ?? animal.receivedBy],
        ["放血の実施", bleedingPerformedLabel[animal.bleedingPerformed ?? ""]],
        ["放血用ナイフの消毒方法", knifeSanitationMethodLabel[animal.knifeSanitationMethod ?? ""]],
        ["放血開始時間", animal.bleedingStartTime || "未入力"],
        ["運搬時冷却", transportCoolingLabel[animal.transportCooling ?? ""]],
        ["被弾または止め刺し部位", impactOrBleedingPartLabel[animal.impactOrBleedingPart ?? ""]],
        ["備考", animal.notes || "なし"],
      ]
    : [];
  const receivingAbnormalities = animal ? receivingAbnormalityItems.filter((item) => getReceivingAbnormalityResult(animal, item.id) === "yes") : [];
  const processingAbnormalities = animal
    ? processingAbnormalityItems
        .map((item) => ({ item, check: getProcessingAbnormalityCheck(animal, item.id) }))
        .filter(({ check }) => check.result === "abnormal")
    : [];

  const photoRegistrationCount = photoSlots.filter((slot) => photos.some((photo) => photo.type === slot.type)).length;

  function toggleAnimalStatus() {
    if (!animal) return;

    const nextAnimal: Animal = {
      ...animal,
      status: animal.status === "processed" ? "received" : "processed",
      updatedAt: new Date().toISOString(),
    };
    const storedAnimals = getAnimals();
    const nextStoredAnimals = [nextAnimal, ...storedAnimals.filter((item) => item.id !== nextAnimal.id && item.animalNumber !== nextAnimal.animalNumber)];

    saveAnimals(nextStoredAnimals);
    setAnimal(nextAnimal);
  }

  async function handleGenerateAnimalKartePdf() {
    if (!animal || generatingType) return;

    setGeneratingType("animal_karte");
    setPdfMessage("");
    setPdfError("");

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
      setPdfMessage("PDFを出力しました");
    } catch (error) {
      console.error(error);
      setPdfError("PDF出力に失敗しました");
    } finally {
      setGeneratingType(null);
    }
  }

  async function handleGenerateTraceabilityPdf() {
    if (!animal || generatingType) return;

    setGeneratingType("traceability");
    setPdfMessage("");
    setPdfError("");

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
      setPdfMessage("PDFを出力しました");
    } catch (error) {
      console.error(error);
      setPdfError("PDF出力に失敗しました");
    } finally {
      setGeneratingType(null);
    }
  }

  function handleDeleteAnimal() {
    if (!animal) return;

    const nextAnimals = getAnimals().filter((item) => item.id !== animal.id && item.animalNumber !== animal.animalNumber);
    saveAnimals(nextAnimals);
    setIsDeleteDialogOpen(false);
    setAnimal(null);
    router.push("/animals");
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("animals")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href="/animals">
          <ArrowLeft size={18} />
          一覧へ
        </Link>
        <h1 className="text-base font-bold">個体詳細</h1>
        <span className="w-12" />
      </header>

      {!animal ? (
        <Card className="grid gap-3 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-lg font-bold">個体が見つかりません</p>
          <p className="text-sm text-[var(--color-text-muted)]">指定された個体番号は、モックデータまたは仮登録データに存在しません。</p>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white" href="/animals">
            個体一覧へ戻る
          </Link>
        </Card>
      ) : (
        <>
          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[var(--color-text-muted)]">個体識別番号</p>
                <h2 className="mt-1 text-3xl font-bold">{animal.animalNumber}</h2>
                <p className="mt-1 text-sm font-bold text-[var(--color-text-muted)]">
                  {speciesLabel[animal.species] ?? getSpeciesName(animal.species)} / {sexLabel[animal.sex]}
                </p>
              </div>
              <button
                className={getAnimalStatusBadgeClass(animal, { interactive: true })}
                onClick={toggleAnimalStatus}
                type="button"
              >
                {getAnimalStatusLabel(animal)}
              </button>
            </div>
          </Card>

          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
            <SectionTitle title="基本情報" description="受入から出荷までの基本情報です。" />
            <div className="grid gap-2 text-sm">
              {rows.map(([label, value]) => (
                <div className="grid grid-cols-[112px_1fr] border-b border-[var(--color-border)] pb-2 last:border-b-0" key={label}>
                  <span className="font-bold text-[var(--color-text-muted)]">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
            <SectionTitle title="異常確認記録" description="異常がないことを確認するための記録です。" />
            <div className="grid gap-2 text-sm">
              <div className="grid grid-cols-[112px_1fr] border-b border-[var(--color-border)] pb-2">
                <span className="font-bold text-[var(--color-text-muted)]">受入時</span>
                <span className="font-semibold">{receivingAbnormalities.length > 0 ? `${receivingAbnormalities.length}件あり` : "すべていいえ"}</span>
              </div>
              {receivingAbnormalities.map((item) => (
                <div className="grid gap-1 rounded-xl bg-[var(--color-background)] p-2" key={item.id}>
                  <span className="text-xs font-bold text-[var(--color-text-muted)]">{receivingAbnormalityResultLabel.yes}</span>
                  <span className="text-sm font-semibold leading-6">{item.label}</span>
                </div>
              ))}
              <div className="grid grid-cols-[112px_1fr] border-b border-[var(--color-border)] pb-2">
                <span className="font-bold text-[var(--color-text-muted)]">解体時</span>
                <span className="font-semibold">{processingAbnormalities.length > 0 ? `${processingAbnormalities.length}件あり` : "すべて問題なし"}</span>
              </div>
              {processingAbnormalities.map(({ item, check }) => (
                <div className="grid gap-1 rounded-xl bg-[var(--color-background)] p-2" key={item.id}>
                  <span className="text-xs font-bold text-[var(--color-primary)]">{item.category} / {processingAbnormalityResultLabel[check.result]}</span>
                  <span className="text-sm font-semibold leading-6">{item.label}</span>
                  {check.note ? <span className="text-xs font-semibold text-[var(--color-text-muted)]">備考: {check.note}</span> : null}
                </div>
              ))}
              <div className="grid grid-cols-[112px_1fr] border-b border-[var(--color-border)] pb-2 last:border-b-0">
                <span className="font-bold text-[var(--color-text-muted)]">受入可否</span>
                <span className="font-semibold">{animalAcceptanceDecisionLabel[animal.acceptanceDecision ?? "accepted"]}</span>
              </div>
              {animal.acceptanceDecision === "rejected" ? (
                <div className="grid grid-cols-[112px_1fr] border-b border-[var(--color-border)] pb-2 last:border-b-0">
                  <span className="font-bold text-[var(--color-text-muted)]">不可理由</span>
                  <span className="font-semibold">{animal.acceptanceRejectionReason || "未入力"}</span>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
            <SectionTitle title="衛生・健康管理記録" description="個体に紐づく各帳票を編集します。" />
            <div className="grid gap-2">
              {[
                { title: "施設衛生点検簿", href: "/hygiene/facility", count: facilityRecords.length },
                { title: "作業時衛生管理簿", href: "/hygiene/work", count: workRecords.length },
                { title: "健康管理簿", href: "/hygiene/health", count: healthRecords.length },
              ].map((item) => (
                <Link className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white p-3 text-sm font-bold shadow-sm" href={item.href} key={item.href}>
                  <span>{item.title}</span>
                  <span className="text-xs font-bold text-[var(--color-text-muted)]">{item.count > 0 ? `${item.count}件` : "未登録"}</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm" id="photos">
            <SectionTitle
              action={
                <Link className="text-xs font-bold text-[var(--color-primary)] underline underline-offset-4" href={`/animals/${animal.animalNumber}/photos`}>
                  写真登録
                </Link>
              }
              title="写真"
              description={`${photoRegistrationCount}/5 登録済み`}
            />
            <div className="grid gap-2">
              {photoSlots.map((slot) => {
                const photo = photos.find((item) => item.type === slot.type);
                return (
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] p-3" key={slot.type}>
                    <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white text-[var(--color-primary)] shadow-sm">
                      {photo?.dataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={slot.label} className="h-11 w-11 object-cover" src={photo.dataUrl} />
                      ) : (
                        <ImagePlus size={20} />
                      )}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{slot.label}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{photo ? "登録済み" : "未登録 / 次Stepで写真登録対応予定"}</p>
                    </div>
                    <Badge variant={photo ? "success" : "muted"}>{photo ? "登録済み" : "未登録"}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
            <div className="grid gap-2">
              <Button
                className="bg-purple-600 text-white shadow-sm hover:bg-purple-700"
                disabled={Boolean(generatingType)}
                leftIcon={generatingType === "animal_karte" ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                onClick={handleGenerateAnimalKartePdf}
                size="lg"
              >
                {generatingType === "animal_karte" ? "個体カルテPDF生成中..." : "個体カルテPDF"}
              </Button>
              <Button
                disabled={Boolean(generatingType)}
                leftIcon={generatingType === "traceability" ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                onClick={handleGenerateTraceabilityPdf}
                size="lg"
              >
                {generatingType === "traceability" ? "トレーサビリティPDF生成中..." : "トレーサビリティPDF"}
              </Button>
              <Button disabled={Boolean(generatingType)} leftIcon={<Trash2 size={18} />} onClick={() => setIsDeleteDialogOpen(true)} size="lg" variant="danger">
                削除
              </Button>
            </div>
            {pdfMessage ? (
              <p className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-primary)]">
                <CheckCircle2 size={16} />
                {pdfMessage}
              </p>
            ) : null}
            {pdfError ? <p className="text-xs font-bold text-red-600">{pdfError}</p> : null}
          </Card>
          <ConfirmDialog
            cancelLabel="キャンセル"
            confirmLabel="削除する"
            description="この個体情報を削除します。よろしいですか？"
            onCancel={() => setIsDeleteDialogOpen(false)}
            onConfirm={handleDeleteAnimal}
            open={isDeleteDialogOpen}
            title="個体情報の削除"
            tone="danger"
          />
        </>
      )}
    </AppLayout>
  );
}
