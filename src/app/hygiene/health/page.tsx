"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, Input, SectionTitle, Textarea } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { healthCheckFormItems } from "@/constants/hygieneForms";
import { addHealthCheckRecord } from "@/lib/hygieneStorage";
import type { HealthCheckRecord, HygieneCheckValue } from "@/types/gibier";

type HealthCheckState = Record<string, { receiving: HygieneCheckValue; processing: HygieneCheckValue }>;

const today = new Date().toISOString().slice(0, 10);

function initialChecks(): HealthCheckState {
  return Object.fromEntries(healthCheckFormItems.map((item) => [item.id, { receiving: "ok", processing: "ok" }]));
}

function sectionItems() {
  return Array.from(new Set(healthCheckFormItems.map((item) => item.section))).map((section) => ({
    section,
    items: healthCheckFormItems.filter((item) => item.section === section),
  }));
}

export default function HealthCheckPage() {
  const [animalNumber, setAnimalNumber] = useState("");
  const [receivingDate, setReceivingDate] = useState(today);
  const [processingDate, setProcessingDate] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [notes, setNotes] = useState("");
  const [checks, setChecks] = useState<HealthCheckState>(() => initialChecks());
  const [saved, setSaved] = useState(false);
  const sections = useMemo(() => sectionItems(), []);

  function updateCheck(itemId: string, timing: "receiving" | "processing", value: HygieneCheckValue) {
    setChecks((current) => ({ ...current, [itemId]: { ...current[itemId], [timing]: value } }));
  }

  function saveRecord() {
    const now = new Date().toISOString();
    const hasIssue = Object.values(checks).some((check) => check.receiving === "ng" || check.processing === "ng");
    const record: HealthCheckRecord = {
      id: `health-${Date.now()}`,
      date: receivingDate,
      animalId: animalNumber || undefined,
      animalNumber: animalNumber || undefined,
      workerName,
      completed: true,
      hasIssue,
      notes,
      checkedBy: workerName,
      receivingDate,
      processingDate: processingDate || undefined,
      checks: healthCheckFormItems.map((item) => ({
        itemId: item.id,
        receiving: checks[item.id]?.receiving ?? "",
        processing: checks[item.id]?.processing ?? "",
      })),
      fields: [
        { fieldId: "animalNumber", value: animalNumber },
        { fieldId: "receivingDate", value: receivingDate },
        { fieldId: "processingDate", value: processingDate },
        { fieldId: "workerName", value: workerName },
      ],
      createdAt: now,
      updatedAt: now,
    };

    addHealthCheckRecord(record);
    setSaved(true);
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("hygiene")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="text-sm font-bold text-[var(--color-primary)]" href="/hygiene">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-bold">健康管理簿</h1>
        <Badge>正式項目</Badge>
      </header>

      {saved ? (
        <Card className="grid place-items-center gap-3 rounded-2xl p-5 text-center shadow-sm" variant="info">
          <CheckCircle2 className="text-[var(--color-primary)]" size={52} />
          <p className="text-lg font-bold text-[var(--color-primary)]">仮保存しました</p>
          <p className="text-sm text-[var(--color-text-muted)]">作業者名、搬入日、精肉日と一緒に保存しました。</p>
        </Card>
      ) : null}

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="基本情報" description="添付帳票の上部欄に合わせています。" />
        <Input label="個体番号" onChange={(event) => setAnimalNumber(event.target.value)} placeholder="120074" value={animalNumber} />
        <Input label="作業者名" onChange={(event) => setWorkerName(event.target.value)} value={workerName} />
        <Input label="搬入日" onChange={(event) => setReceivingDate(event.target.value)} type="date" value={receivingDate} />
        <Input label="精肉日" onChange={(event) => setProcessingDate(event.target.value)} type="date" value={processingDate} />
      </Card>

      {sections.map(({ section, items }) => (
        <Card className="grid gap-3 rounded-2xl p-4 shadow-sm" key={section}>
          <SectionTitle title={section} />
          <div className="grid gap-3">
            {items.map((item) => (
              <div className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3" key={item.id}>
                <div className="grid grid-cols-[36px_1fr] gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-dark)]">{item.no}</span>
                  <p className="text-sm font-bold">{item.label}</p>
                </div>
                {(["receiving", "processing"] as const).map((timing) => (
                  <div className="grid gap-1" key={timing}>
                    <p className="text-xs font-bold text-[var(--color-text-muted)]">{timing === "receiving" ? "搬入日" : "精肉日"}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button onClick={() => updateCheck(item.id, timing, "ok")} size="sm" variant={checks[item.id]?.[timing] === "ok" ? "primary" : "secondary"}>OK</Button>
                      <Button onClick={() => updateCheck(item.id, timing, "ng")} size="sm" variant={checks[item.id]?.[timing] === "ng" ? "danger" : "secondary"}>NG</Button>
                      <Button onClick={() => updateCheck(item.id, timing, "not_applicable")} size="sm" variant={checks[item.id]?.[timing] === "not_applicable" ? "primary" : "secondary"}>該当なし</Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <Textarea label="備考" onChange={(event) => setNotes(event.target.value)} placeholder="異常、確認事項など" value={notes} />
        <Button onClick={saveRecord}>仮保存</Button>
      </Card>
    </AppLayout>
  );
}
