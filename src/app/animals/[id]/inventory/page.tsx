"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, PackagePlus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, Input, SectionTitle, Select, Textarea } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { getAnimals } from "@/lib/animalStorage";
import { addInventoryItem, deleteInventoryItem, getInventoryItemsByAnimalId } from "@/lib/inventoryStorage";
import type { Animal, InventoryItem, InventoryStatus, InventoryStorageType } from "@/types/gibier";
import { animalStatusBadgeTone, animalStatusLabel, speciesLabel } from "@/types/gibier";

const partOptions = ["ロース", "モモ", "ヒレ", "バラ", "肩ロース", "スネ", "その他"];

const storageTypeLabel: Record<InventoryStorageType, string> = {
  refrigerated: "冷蔵",
  frozen: "冷凍",
  processed: "加工品",
};

const inventoryStatusLabel: Record<InventoryStatus, string> = {
  in_stock: "在庫保管",
  reserved: "出荷待ち",
  waiting_shipment: "出荷待ち",
  shipped: "出荷済み",
  discarded: "廃棄",
};

export default function AnimalInventoryPage() {
  const params = useParams<{ id: string }>();
  const animalId = params.id;
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [partName, setPartName] = useState("ロース");
  const [weightKg, setWeightKg] = useState("1.0");
  const [quantity, setQuantity] = useState("1");
  const [storageType, setStorageType] = useState<InventoryStorageType>("refrigerated");
  const [status, setStatus] = useState<InventoryStatus>("in_stock");
  const [lotNumber, setLotNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedAnimal = getAnimals().find((item) => item.id === animalId || item.animalNumber === animalId);
      const nextAnimal = storedAnimal ?? null;
      setAnimal(nextAnimal);
      setItems(getInventoryItemsByAnimalId(animalId));

      if (nextAnimal) {
        setLotNumber((current) => current || `LOT-${nextAnimal.animalNumber}-${new Date().getFullYear()}`);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [animalId]);

  function refreshItems(targetAnimal: Animal) {
    setItems(getInventoryItemsByAnimalId(targetAnimal.id).concat(getInventoryItemsByAnimalId(targetAnimal.animalNumber)).filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index));
  }

  function handleSave() {
    if (!animal) return;

    const now = new Date().toISOString();
    const nextItem: InventoryItem = {
      id: `inventory-${Date.now()}`,
      animalId: animal.id,
      animalNumber: animal.animalNumber,
      partName,
      weightKg: Number(weightKg) || 0,
      quantity: Number(quantity) || 0,
      storageType,
      status,
      lotNumber,
      notes,
      createdAt: now,
    };

    addInventoryItem(nextItem);
    refreshItems(animal);
    setSaved(true);
  }

  function handleDelete(itemId: string) {
    if (!animal) return;
    deleteInventoryItem(itemId);
    refreshItems(animal);
  }

  const totalWeight = items.reduce((sum, item) => sum + item.weightKg, 0);

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("animals")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href={animal ? `/animals/${animal.animalNumber}` : "/animals"}>
          <ArrowLeft size={18} />
          詳細へ
        </Link>
        <h1 className="text-base font-bold">在庫登録</h1>
        <Badge>仮保存</Badge>
      </header>

      {!animal ? (
        <Card className="grid gap-3 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-lg font-bold">個体が見つかりません</p>
          <p className="text-sm text-[var(--color-text-muted)]">在庫登録する個体を一覧から選び直してください。</p>
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
              <p className="text-xs text-[var(--color-text-muted)]">在庫一覧と個体詳細に仮反映されます。</p>
            </Card>
          ) : null}

          <Card className="grid gap-4 rounded-2xl p-4 shadow-sm">
            <SectionTitle title="部位別在庫を登録" description="加工後の部位、重量、保管方法を入力します。" />
            <Select label="部位名" onChange={(event) => setPartName(event.target.value)} value={partName}>
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
            <Select label="保管方法" onChange={(event) => setStorageType(event.target.value as InventoryStorageType)} value={storageType}>
              <option value="refrigerated">冷蔵</option>
              <option value="frozen">冷凍</option>
            </Select>
            <Input label="ロット番号" onChange={(event) => setLotNumber(event.target.value)} value={lotNumber} />
            <Select label="状態" onChange={(event) => setStatus(event.target.value as InventoryStatus)} value={status}>
              <option value="in_stock">在庫保管</option>
              <option value="waiting_shipment">出荷待ち</option>
              <option value="shipped">出荷済み</option>
            </Select>
            <Textarea label="備考" onChange={(event) => setNotes(event.target.value)} placeholder="保管時の注意点など" value={notes} />
            <Button leftIcon={<PackagePlus size={18} />} onClick={handleSave}>
              在庫を仮登録
            </Button>
          </Card>

          <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
            <SectionTitle title="登録済み在庫" description={`${items.length}件 / 合計 ${totalWeight.toFixed(1)}kg`} />
            {items.length === 0 ? (
              <p className="rounded-xl bg-[var(--color-background)] p-4 text-center text-sm font-semibold text-[var(--color-text-muted)]">この個体の在庫はまだ登録されていません。</p>
            ) : (
              <div className="grid gap-2">
                {items.map((item) => (
                  <div className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3" key={item.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-bold">{item.partName}</p>
                        <p className="text-xs font-semibold text-[var(--color-text-muted)]">{item.lotNumber}</p>
                      </div>
                      <Badge variant={item.status === "shipped" ? "success" : "default"}>{inventoryStatusLabel[item.status]}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-[var(--color-text-muted)]">
                      <span>{item.weightKg.toFixed(1)}kg</span>
                      <span>{item.quantity}個</span>
                      <span>{storageTypeLabel[item.storageType]}</span>
                    </div>
                    {item.notes ? <p className="text-xs text-[var(--color-text-muted)]">{item.notes}</p> : null}
                    <Button leftIcon={<Trash2 size={16} />} onClick={() => handleDelete(item.id)} size="sm" variant="secondary">
                      削除
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </AppLayout>
  );
}
