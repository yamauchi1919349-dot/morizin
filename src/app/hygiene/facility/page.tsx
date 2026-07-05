"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, Input, SectionTitle, Textarea } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { facilityHygieneFormItems } from "@/constants/hygieneForms";
import { addFacilityHygieneRecord } from "@/lib/hygieneStorage";
import type { FacilityHygieneRecord, HygieneCheckValue } from "@/types/gibier";

type FacilityCheckState = Record<string, { before: HygieneCheckValue; after: HygieneCheckValue; note: string }>;

const today = new Date().toISOString().slice(0, 10);

function initialChecks(): FacilityCheckState {
  return Object.fromEntries(facilityHygieneFormItems.map((item) => [item.id, { before: "ok", after: "ok", note: "" }]));
}

function sectionItems() {
  return Array.from(new Set(facilityHygieneFormItems.map((item) => item.section))).map((section) => ({
    section,
    items: facilityHygieneFormItems.filter((item) => item.section === section),
  }));
}

function hasNg(checks: FacilityCheckState) {
  return Object.values(checks).some((check) => check.before === "ng" || check.after === "ng");
}

export default function FacilityHygienePage() {
  const [date, setDate] = useState(today);
  const [animalNumber, setAnimalNumber] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [confirmedBy, setConfirmedBy] = useState("");
  const [confirmedAt, setConfirmedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [checks, setChecks] = useState<FacilityCheckState>(() => initialChecks());
  const [saved, setSaved] = useState(false);
  const sections = useMemo(() => sectionItems(), []);

  function updateCheck(itemId: string, timing: "before" | "after", value: HygieneCheckValue) {
    setChecks((current) => ({ ...current, [itemId]: { ...current[itemId], [timing]: value } }));
  }

  function updateNote(itemId: string, value: string) {
    setChecks((current) => ({ ...current, [itemId]: { ...current[itemId], note: value } }));
  }

  function saveRecord() {
    const now = new Date().toISOString();
    const record: FacilityHygieneRecord = {
      id: `facility-${Date.now()}`,
      date,
      animalId: animalNumber || undefined,
      animalNumber: animalNumber || undefined,
      completed: true,
      hasIssue: hasNg(checks),
      notes,
      checkedBy,
      confirmedBy: confirmedBy || undefined,
      confirmedAt: confirmedAt || undefined,
      checks: facilityHygieneFormItems.map((item) => ({
        itemId: item.id,
        before: checks[item.id]?.before ?? "",
        after: checks[item.id]?.after ?? "",
        note: checks[item.id]?.note ?? "",
      })),
      fields: [
        { fieldId: "animalNumber", value: animalNumber },
        { fieldId: "date", value: date },
        { fieldId: "checkedBy", value: checkedBy },
        { fieldId: "confirmedBy", value: confirmedBy },
        { fieldId: "confirmedAt", value: confirmedAt },
      ],
      createdAt: now,
      updatedAt: now,
    };

    addFacilityHygieneRecord(record);
    setSaved(true);
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("hygiene")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="text-sm font-bold text-[var(--color-primary)]" href="/hygiene">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-bold">施設衛生点検簿</h1>
        <Badge>正式項目</Badge>
      </header>

      {saved ? (
        <Card className="grid place-items-center gap-3 rounded-2xl p-5 text-center shadow-sm" variant="info">
          <CheckCircle2 className="text-[var(--color-primary)]" size={52} />
          <p className="text-lg font-bold text-[var(--color-primary)]">仮保存しました</p>
          <p className="text-sm text-[var(--color-text-muted)]">localStorageに施設衛生点検簿の正式項目で保存しています。</p>
        </Card>
      ) : null}

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="基本情報" description="添付帳票の記入欄に合わせた情報です。" />
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
                <p className="text-sm font-bold">{item.label}</p>
                {item.note ? <p className="text-xs font-semibold text-[var(--color-text-muted)]">{item.note}</p> : null}
                {(["before", "after"] as const).map((timing) => (
                  <div className="grid gap-1" key={timing}>
                    <p className="text-xs font-bold text-[var(--color-text-muted)]">{timing === "before" ? "作業前" : "作業後"}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button onClick={() => updateCheck(item.id, timing, "ok")} size="sm" variant={checks[item.id]?.[timing] === "ok" ? "primary" : "secondary"}>OK</Button>
                      <Button onClick={() => updateCheck(item.id, timing, "ng")} size="sm" variant={checks[item.id]?.[timing] === "ng" ? "danger" : "secondary"}>NG</Button>
                      <Button onClick={() => updateCheck(item.id, timing, "not_applicable")} size="sm" variant={checks[item.id]?.[timing] === "not_applicable" ? "primary" : "secondary"}>該当なし</Button>
                    </div>
                  </div>
                ))}
                <Input label="備考" onChange={(event) => updateNote(item.id, event.target.value)} value={checks[item.id]?.note ?? ""} />
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <Textarea label="全体備考" onChange={(event) => setNotes(event.target.value)} placeholder="逸脱内容、確認事項など" value={notes} />
        <Button onClick={saveRecord}>仮保存</Button>
      </Card>
    </AppLayout>
  );
}
