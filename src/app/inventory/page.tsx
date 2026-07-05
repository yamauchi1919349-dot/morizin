"use client";

import Link from "next/link";
import { ArrowLeft, Box, ClipboardList, PackageCheck, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Card, SectionTitle } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { getInventoryItems } from "@/lib/inventoryStorage";
import type { InventoryItem, InventoryStatus, InventoryStorageType } from "@/types/gibier";

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

function getStatusTone(status: InventoryStatus) {
  if (status === "shipped") return "success";
  if (status === "reserved" || status === "waiting_shipment") return "warning";
  if (status === "discarded") return "danger";
  return "default";
}

export default function InventoryPage() {
  const [storedItems, setStoredItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStoredItems(getInventoryItems());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const inventoryItems = storedItems;
  const totalWeight = inventoryItems.reduce((sum, item) => sum + item.weightKg, 0);
  const waitingShipmentCount = inventoryItems.filter((item) => item.status === "reserved" || item.status === "waiting_shipment").length;

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("inventory")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="text-sm font-bold text-[var(--color-primary)]" href="/dashboard">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-bold">在庫管理</h1>
        <Badge>部位別</Badge>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {["部位別在庫", "冷蔵/冷凍", "出荷待ち"].map((tab, index) => (
          <button className={`min-h-10 rounded-xl text-xs font-bold ${index === 0 ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "bg-white text-[var(--color-text-muted)]"}`} key={tab} type="button">
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xs font-bold text-[var(--color-text-muted)]">在庫件数</p>
          <p className="mt-1 text-2xl font-bold">{inventoryItems.length}</p>
        </Card>
        <Card className="rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xs font-bold text-[var(--color-text-muted)]">出荷待ち</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-warning)]">{waitingShipmentCount}</p>
        </Card>
        <Card className="rounded-2xl p-3 text-center shadow-sm" variant="info">
          <p className="text-xs font-bold text-[var(--color-primary-dark)]">総重量</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-primary)]">{totalWeight.toFixed(1)}kg</p>
        </Card>
      </div>

      <Card className="rounded-2xl p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle title="部位別在庫一覧" description="モック在庫と仮登録在庫を統合表示" />
          <PackageCheck className="text-[var(--color-primary)]" size={22} />
        </div>
        <div className="grid gap-2">
          {inventoryItems.map((item) => (
            <div className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold">{item.partName}</p>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">個体番号 {item.animalNumber}</p>
                </div>
                <Badge variant={getStatusTone(item.status)}>{inventoryStatusLabel[item.status]}</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-[var(--color-text-muted)]">
                <span>{item.weightKg.toFixed(1)}kg</span>
                <span>{item.quantity}個</span>
                <span>{storageTypeLabel[item.storageType]}</span>
                <span>{item.lotNumber}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Link className="grid min-h-16 place-items-center rounded-xl border border-[var(--color-border)] bg-white text-center text-xs font-bold shadow-sm" href="/inventory">
          <Box size={22} />
          在庫調整
        </Link>
        <Link className="grid min-h-16 place-items-center rounded-xl border border-[var(--color-border)] bg-white text-center text-xs font-bold shadow-sm" href="/shipments">
          <ClipboardList size={22} />
          出荷管理
        </Link>
        <Link className="grid min-h-16 place-items-center rounded-xl border border-[var(--color-border)] bg-white text-center text-xs font-bold shadow-sm" href="/pdf">
          <Tag size={22} />
          ラベル発行
        </Link>
      </div>
    </AppLayout>
  );
}
