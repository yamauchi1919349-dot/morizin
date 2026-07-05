"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Card, SectionTitle } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { getShipments } from "@/lib/shipmentStorage";
import type { PdfExportStatus, Shipment, ShipmentStatus } from "@/types/gibier";

const shipmentStatusLabel: Record<ShipmentStatus, string> = {
  planned: "出荷予定",
  shipped: "出荷済み",
  cancelled: "取消",
};

const pdfStatusLabel: Record<PdfExportStatus, string> = {
  not_exported: "未出力",
  exported: "出力済み",
};

function getStatusTone(status: ShipmentStatus) {
  if (status === "shipped") return "success";
  if (status === "cancelled") return "danger";
  return "warning";
}

export default function ShipmentsPage() {
  const [storedShipments, setStoredShipments] = useState<Shipment[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStoredShipments(getShipments());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const shipments = storedShipments;
  const plannedCount = shipments.filter((shipment) => shipment.status === "planned").length;
  const shippedCount = shipments.filter((shipment) => shipment.status === "shipped").length;

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("inventory")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="text-sm font-bold text-[var(--color-primary)]" href="/dashboard">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-bold">出荷管理</h1>
        <Badge>出荷一覧</Badge>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Card className="rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xs font-bold text-[var(--color-text-muted)]">登録件数</p>
          <p className="mt-1 text-2xl font-bold">{shipments.length}</p>
        </Card>
        <Card className="rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xs font-bold text-[var(--color-text-muted)]">出荷予定</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-warning)]">{plannedCount}</p>
        </Card>
        <Card className="rounded-2xl p-3 text-center shadow-sm" variant="info">
          <p className="text-xs font-bold text-[var(--color-primary-dark)]">出荷済み</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-primary)]">{shippedCount}</p>
        </Card>
      </div>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="出荷一覧" description="モック出荷と仮登録出荷を統合表示" />
        {shipments.map((shipment) => {
          const firstItem = shipment.items[0];
          return (
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-3" key={shipment.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{shipment.shipmentNumber}</p>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">{shipment.shippedAt} / 個体番号 {shipment.animalNumber}</p>
                </div>
                <Badge variant={getStatusTone(shipment.status)}>{shipmentStatusLabel[shipment.status]}</Badge>
              </div>
              <div className="mt-2 grid gap-1 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <strong>{shipment.customerName}</strong>
                  <Truck className="text-[var(--color-primary)]" size={18} />
                </div>
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                  {firstItem?.partName ?? "-"} / {firstItem?.weightKg.toFixed(1) ?? "0.0"}kg / {firstItem?.quantity ?? 0}個
                </p>
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">ロット番号：{firstItem?.lotNumber ?? "-"}</p>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-bold text-[var(--color-text-muted)]">トレーサビリティPDF</span>
                  <Badge variant={shipment.traceabilityPdfStatus === "exported" ? "success" : "muted"}>{pdfStatusLabel[shipment.traceabilityPdfStatus]}</Badge>
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm" variant="pdf">
        <div className="flex items-center gap-3">
          <FileText className="text-[var(--color-primary)]" size={28} />
          <div>
            <p className="font-bold">お客様用トレーサビリティPDF</p>
            <p className="text-xs text-[var(--color-text-muted)]">QRコード付き帳票の出力画面へ</p>
          </div>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-bold text-white" href="/pdf">
          PDF画面を開く
        </Link>
      </Card>
    </AppLayout>
  );
}
