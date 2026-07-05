"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, Input, SectionTitle, Textarea } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { workHygieneFormItems } from "@/constants/hygieneForms";
import { addWorkHygieneRecord } from "@/lib/hygieneStorage";
import type { HygieneCheckValue, WorkHygieneRecord } from "@/types/gibier";

type WorkCheckState = Record<string, HygieneCheckValue>;

const today = new Date().toISOString().slice(0, 10);

function initialChecks(): WorkCheckState {
  return Object.fromEntries(workHygieneFormItems.map((item) => [item.id, "ok"]));
}

function sectionItems() {
  return Array.from(new Set(workHygieneFormItems.map((item) => item.section))).map((section) => ({
    section,
    items: workHygieneFormItems.filter((item) => item.section === section),
  }));
}

export default function WorkHygienePage() {
  const [date, setDate] = useState(today);
  const [animalNumber, setAnimalNumber] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [confirmedBy, setConfirmedBy] = useState("");
  const [confirmedAt, setConfirmedAt] = useState("");
  const [deviationItems, setDeviationItems] = useState("該当なし");
  const [deviationResponse, setDeviationResponse] = useState("該当なし");
  const [notes, setNotes] = useState("");
  const [checks, setChecks] = useState<WorkCheckState>(() => initialChecks());
  const [saved, setSaved] = useState(false);
  const sections = useMemo(() => sectionItems(), []);

  function saveRecord() {
    const now = new Date().toISOString();
    const record: WorkHygieneRecord = {
      id: `work-${Date.now()}`,
      date,
      animalId: animalNumber || undefined,
      animalNumber: animalNumber || undefined,
      completed: true,
      hasIssue: Object.values(checks).includes("ng") || deviationItems !== "該当なし",
      notes,
      checkedBy,
      confirmedBy: confirmedBy || undefined,
      confirmedAt: confirmedAt || undefined,
      deviationItems,
      deviationResponse,
      checks: workHygieneFormItems.map((item) => ({ itemId: item.id, result: checks[item.id] ?? "" })),
      fields: [
        { fieldId: "animalNumber", value: animalNumber },
        { fieldId: "date", value: date },
        { fieldId: "checkedBy", value: checkedBy },
        { fieldId: "confirmedBy", value: confirmedBy },
        { fieldId: "confirmedAt", value: confirmedAt },
        { fieldId: "deviationItems", value: deviationItems },
        { fieldId: "deviationResponse", value: deviationResponse },
      ],
      createdAt: now,
      updatedAt: now,
    };

    addWorkHygieneRecord(record);
    setSaved(true);
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("hygiene")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="text-sm font-bold text-[var(--color-primary)]" href="/hygiene">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-bold">作業時衛生管理簿</h1>
        <Badge>正式項目</Badge>
      </header>

      {saved ? (
        <Card className="grid place-items-center gap-3 rounded-2xl p-5 text-center shadow-sm" variant="info">
          <CheckCircle2 className="text-[var(--color-primary)]" size={52} />
          <p className="text-lg font-bold text-[var(--color-primary)]">仮保存しました</p>
          <p className="text-sm text-[var(--color-text-muted)]">個体番号に紐づけて作業時衛生管理簿を保存しました。</p>
        </Card>
      ) : null}

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="基本情報" description="個体番号、責任者、記入者、作業日を帳票に合わせて保存します。" />
        <Input label="個体番号" onChange={(event) => setAnimalNumber(event.target.value)} placeholder="126046" value={animalNumber} />
        <Input label="作業日" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        <Input label="記入者" onChange={(event) => setCheckedBy(event.target.value)} value={checkedBy} />
        <Input label="責任者" onChange={(event) => setConfirmedBy(event.target.value)} value={confirmedBy} />
        <Input label="責任者確認日" onChange={(event) => setConfirmedAt(event.target.value)} type="date" value={confirmedAt} />
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
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={() => setChecks((current) => ({ ...current, [item.id]: "ok" }))} size="sm" variant={checks[item.id] === "ok" ? "primary" : "secondary"}>OK</Button>
                  <Button onClick={() => setChecks((current) => ({ ...current, [item.id]: "ng" }))} size="sm" variant={checks[item.id] === "ng" ? "danger" : "secondary"}>NG</Button>
                  <Button onClick={() => setChecks((current) => ({ ...current, [item.id]: "not_applicable" }))} size="sm" variant={checks[item.id] === "not_applicable" ? "primary" : "secondary"}>該当なし</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="逸脱項目" description="帳票の「逸脱項目」「逸脱時の考察と対応」です。" />
        <Textarea label="逸脱項目" onChange={(event) => setDeviationItems(event.target.value)} value={deviationItems} />
        <Textarea label="逸脱時の考察と対応" onChange={(event) => setDeviationResponse(event.target.value)} value={deviationResponse} />
        <Textarea label="備考" onChange={(event) => setNotes(event.target.value)} value={notes} />
        <Button onClick={saveRecord}>仮保存</Button>
      </Card>
    </AppLayout>
  );
}
