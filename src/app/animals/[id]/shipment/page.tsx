"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Trash2, Truck } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, Input, SectionTitle, Select, Textarea } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { addShipment, deleteShipment, getShipmentsByAnimalId } from "@/lib/shipmentStorage";
import { getAnimalById } from "@/lib/supabase/animals";
import type { Animal, Shipment, ShipmentStatus } from "@/types/gibier";
import { animalStatusBadgeTone, animalStatusLabel, speciesLabel } from "@/types/gibier";

const partOptions = ["ロース", "モモ", "ヒレ", "バラ", "肩ロース", "スネ", "その他"];

const shipmentStatusLabel: Record<ShipmentStatus, string> = {
  planned: "出荷予定",
  shipped: "出荷済み",
  cancelled: "取消",
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function AnimalShipmentPage() {
  const params = useParams<{ id: string }>();
  const animalId = params.id;
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentNumber, setShipmentNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [shippedAt, setShippedAt] = useState(todayString());
  const [shippedBy, setShippedBy] = useState("");
  const [partName, setPartName] = useState("ロース");
  const [weightKg, setWeightKg] = useState("1.0");
  const [quantity, setQuantity] = useState("1");
  const [lotNumber, setLotNumber] = useState("");
  const [status, setStatus] = useState<ShipmentStatus>("planned");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void getAnimalById(animalId).then((storedAnimal) => {
      const nextAnimal = storedAnimal ?? null;
      setAnimal(nextAnimal);
      setShipments(getShipmentsByAnimalId(animalId));

      if (nextAnimal) {
        const dateToken = new Date().toISOString().slice(0, 10).replaceAll("-", "");
        setShipmentNumber((current) => current || `S-${dateToken}-${nextAnimal.animalNumber}`);
        setLotNumber((current) => current || `LOT-${nextAnimal.animalNumber}`);
      }
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [animalId]);

  function refreshShipments(targetAnimal: Animal) {
    const byId = getShipmentsByAnimalId(targetAnimal.id);
    const byNumber = getShipmentsByAnimalId(targetAnimal.animalNumber);
    setShipments([...byId, ...byNumber].filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index));
  }

  function handleSave() {
    if (!animal) return;

    const nextShipment: Shipment = {
      id: `shipment-${Date.now()}`,
      shipmentNumber,
      animalId: animal.id,
      animalNumber: animal.animalNumber,
      customerName,
      shippedAt,
      shippedBy,
      items: [
        {
          partName,
          weightKg: Number(weightKg) || 0,
          quantity: Number(quantity) || 0,
          lotNumber,
        },
      ],
      status,
      traceabilityPdfStatus: "not_exported",
      notes,
    };

    addShipment(nextShipment);
    refreshShipments(animal);
    setSaved(true);
  }

  function handleDelete(shipmentId: string) {
    if (!animal) return;
    deleteShipment(shipmentId);
    refreshShipments(animal);
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("inventory")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href={animal ? `/animals/${animal.animalNumber}` : "/animals"}>
          <ArrowLeft size={18} />
          詳細へ
        </Link>
        <h1 className="text-base font-bold">出荷登録</h1>
        <Badge>仮保存</Badge>
      </header>

      {!animal ? (
        <Card className="grid gap-3 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-lg font-bold">個体が見つかりません</p>
          <p className="text-sm text-[var(--color-text-muted)]">出荷登録する個体を一覧から選び直してください。</p>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white" href="/animals">
            個体一覧へ戻る
          </Link>
        </Card>
      ) : (
        <>
          <Card className="grid gap-2 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[var(--color-text-muted)]">個体識別番号</p>
                <p className="text-3xl font-bold">{animal.animalNumber}</p>
                <p className="text-sm font-bold text-[var(--color-text-muted)]">{speciesLabel[animal.species]}</p>
              </div>
              <Badge variant={animalStatusBadgeTone[animal.status]}>{animalStatusLabel[animal.status]}</Badge>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">現在は端末内の仮保存です。販売版ではクラウド保存に対応します。</p>
          </Card>

          {saved ? (
            <Card className="grid place-items-center gap-2 rounded-2xl p-4 text-center shadow-sm" variant="info">
              <CheckCircle2 className="text-[var(--color-primary)]" size={42} />
              <p className="font-bold text-[var(--color-primary)]">仮保存しました</p>
              <p className="text-xs text-[var(--color-text-muted)]">出荷一覧と個体詳細に仮反映されます。</p>
            </Card>
          ) : null}

          <Card className="grid gap-4 rounded-2xl p-4 shadow-sm">
            <SectionTitle title="出荷情報を登録" description="出荷先、部位、数量を入力します。今回は在庫数量の自動減算は行いません。" />
            <Input label="出荷番号" onChange={(event) => setShipmentNumber(event.target.value)} value={shipmentNumber} />
            <Input label="出荷先" onChange={(event) => setCustomerName(event.target.value)} value={customerName} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="出荷日" onChange={(event) => setShippedAt(event.target.value)} type="date" value={shippedAt} />
              <Input label="出荷担当者" onChange={(event) => setShippedBy(event.target.value)} value={shippedBy} />
            </div>
            <Select label="出荷する部位" onChange={(event) => setPartName(event.target.value)} value={partName}>
              {partOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input label="重量 kg" min="0" onChange={(event) => setWeightKg(event.target.value)} step="0.1" type="number" value={weightKg} />
              <Input label="数量" min="0" onChange={(event) => setQuantity(event.target.value)} type="number" value={quantity} />
            </div>
            <Input label="ロット番号" onChange={(event) => setLotNumber(event.target.value)} value={lotNumber} />
            <Select label="出荷ステータス" onChange={(event) => setStatus(event.target.value as ShipmentStatus)} value={status}>
              <option value="planned">出荷予定</option>
              <option value="shipped">出荷済み</option>
            </Select>
            <Textarea label="備考" onChange={(event) => setNotes(event.target.value)} placeholder="納品時の注意点など" value={notes} />
            <Button leftIcon={<Truck size={18} />} onClick={handleSave}>
              出荷情報を仮登録
            </Button>
          </Card>

          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
            <SectionTitle title="登録済み出荷" description={`${shipments.length}件の出荷情報`} />
            {shipments.length === 0 ? (
              <p className="rounded-xl bg-[var(--color-background)] p-4 text-center text-sm font-semibold text-[var(--color-text-muted)]">この個体の出荷情報はまだ登録されていません。</p>
            ) : (
              <div className="grid gap-2">
                {shipments.map((shipment) => {
                  const firstItem = shipment.items[0];
                  return (
                    <div className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3" key={shipment.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-bold">{shipment.shipmentNumber}</p>
                          <p className="text-xs font-semibold text-[var(--color-text-muted)]">{shipment.customerName}</p>
                        </div>
                        <Badge variant={shipment.status === "shipped" ? "success" : "warning"}>{shipmentStatusLabel[shipment.status]}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-[var(--color-text-muted)]">
                        <span>{shipment.shippedAt}</span>
                        <span>{firstItem?.partName}</span>
                        <span>{firstItem?.weightKg.toFixed(1)}kg / {firstItem?.quantity}個</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">ロット番号：{firstItem?.lotNumber ?? "-"}</p>
                      {shipment.notes ? <p className="text-xs text-[var(--color-text-muted)]">{shipment.notes}</p> : null}
                      <Button leftIcon={<Trash2 size={16} />} onClick={() => handleDelete(shipment.id)} size="sm" variant="secondary">
                        削除
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </AppLayout>
  );
}
