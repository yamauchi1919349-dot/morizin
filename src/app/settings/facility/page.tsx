"use client";

import Link from "next/link";
import { ArrowLeft, Copy, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, Input, SectionTitle, Select, Textarea } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import {
  createInviteCode,
  defaultFacilitySettings,
  defaultSpecies,
  getFacilitySettings,
  saveFacilitySettings,
  type FacilityAnimalSpecies,
  type FacilitySettings,
  type FacilityStaffMember,
  type FacilityStaffRole,
} from "@/lib/facilitySettingsStorage";

const agingPresets = [0, 3, 7, 14];

function createSpeciesId(name: string) {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, "-");
  return normalized ? `custom-${normalized}-${Date.now()}` : `custom-species-${Date.now()}`;
}

function createStaff(name: string, email: string, role: FacilityStaffRole): FacilityStaffMember {
  const id = `staff-${Date.now()}`;
  return {
    id,
    name,
    email,
    role,
    inviteCode: createInviteCode(email),
    createdAt: new Date().toISOString(),
  };
}

export default function FacilitySettingsPage() {
  const [settings, setSettings] = useState<FacilitySettings>(defaultFacilitySettings);
  const [speciesName, setSpeciesName] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState<FacilityStaffRole>("staff");
  const [message, setMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSettings(getFacilitySettings());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function updateFacility<K extends keyof FacilitySettings["facility"]>(key: K, value: FacilitySettings["facility"][K]) {
    setSettings((current) => ({ ...current, facility: { ...current.facility, [key]: value } }));
    setMessage("");
  }

  function updatePdf<K extends keyof FacilitySettings["pdf"]>(key: K, value: FacilitySettings["pdf"][K]) {
    setSettings((current) => ({ ...current, pdf: { ...current.pdf, [key]: value } }));
    setMessage("");
  }

  function updateSpecies(id: string, name: string) {
    setSettings((current) => ({
      ...current,
      species: current.species.map((species) => (species.id === id ? { ...species, name } : species)),
    }));
    setMessage("");
  }

  function addSpecies() {
    const name = speciesName.trim();
    if (!name) return;

    const nextSpecies: FacilityAnimalSpecies = { id: createSpeciesId(name), name };
    setSettings((current) => ({ ...current, species: [...current.species, nextSpecies] }));
    setSpeciesName("");
    setMessage("");
  }

  function removeSpecies(id: string) {
    setSettings((current) => {
      if (current.species.length <= 1) return current;
      return { ...current, species: current.species.filter((species) => species.id !== id) };
    });
    setMessage("");
  }

  function resetDefaultSpecies() {
    setSettings((current) => ({ ...current, species: defaultSpecies }));
    setMessage("");
  }

  function addStaff() {
    const name = staffName.trim();
    if (!name) return;

    const nextStaff = createStaff(name, staffEmail.trim(), staffRole);
    setSettings((current) => ({ ...current, staff: [...current.staff, nextStaff] }));
    setStaffName("");
    setStaffEmail("");
    setStaffRole("staff");
    setMessage("");
  }

  function removeStaff(id: string) {
    setSettings((current) => ({ ...current, staff: current.staff.filter((staff) => staff.id !== id) }));
    setMessage("");
  }

  async function copyInvite(staff: FacilityStaffMember) {
    const inviteText = `${window.location.origin}/login?invite=${staff.inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopyMessage(`${staff.name}の招待URLをコピーしました`);
    } catch {
      setCopyMessage(staff.inviteCode);
    }
  }

  function save() {
    const nextSettings = {
      ...settings,
      agingDays: Math.max(0, Number(settings.agingDays) || 0),
      species: settings.species.length > 0 ? settings.species : defaultSpecies,
    };

    saveFacilitySettings(nextSettings);
    setSettings(nextSettings);
    setMessage("施設設定を保存しました");
    window.setTimeout(() => setMessage(""), 3000);
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("settings")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="grid gap-3">
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-white px-3 text-sm font-bold text-[var(--color-primary)] shadow-sm" href="/settings">
          <ArrowLeft size={18} />
          設定へ戻る
        </Link>
        <div>
          <p className="text-xs font-bold text-[var(--color-primary)]">Facility</p>
          <h1 className="mt-1 text-xl font-bold">施設設定</h1>
        </div>
      </header>

      {message ? <p className="rounded-xl bg-[var(--color-primary-soft)] p-3 text-sm font-bold text-[var(--color-primary-dark)]">{message}</p> : null}

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="施設情報" description="帳票や今後の施設マスタへ移行する基本情報です。" />
        <Input label="施設名" onChange={(event) => updateFacility("name", event.target.value)} value={settings.facility.name} />
        <Input inputMode="numeric" label="郵便番号" onChange={(event) => updateFacility("postalCode", event.target.value)} value={settings.facility.postalCode} />
        <Input label="住所" onChange={(event) => updateFacility("address", event.target.value)} value={settings.facility.address} />
        <Input inputMode="tel" label="電話番号" onChange={(event) => updateFacility("phoneNumber", event.target.value)} value={settings.facility.phoneNumber} />
        <Input label="施設責任者" onChange={(event) => updateFacility("managerName", event.target.value)} value={settings.facility.managerName} />
        <Input label="登録番号 / 認証番号" onChange={(event) => updateFacility("registrationNumber", event.target.value)} value={settings.facility.registrationNumber} />
        <Textarea label="備考" onChange={(event) => updateFacility("notes", event.target.value)} value={settings.facility.notes} />
      </Card>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="スタッフ招待・管理" description="Ver1.0.0では招待コードをlocalStorageで管理します。" />
        <div className="grid gap-2">
          {settings.staff.length === 0 ? <p className="text-sm font-bold text-[var(--color-text-muted)]">スタッフは未登録です。</p> : null}
          {settings.staff.map((staff) => (
            <div className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3" key={staff.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{staff.name}</p>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">{staff.email || "メール未登録"}</p>
                </div>
                <Badge variant={staff.role === "owner" ? "success" : "muted"}>{staff.role === "owner" ? "Owner" : "Staff"}</Badge>
              </div>
              <p className="rounded-lg bg-[var(--color-background)] p-2 text-xs font-bold text-[var(--color-text-muted)]">招待コード: {staff.inviteCode}</p>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Button leftIcon={<Copy size={16} />} onClick={() => void copyInvite(staff)} variant="secondary">
                  招待URLをコピー
                </Button>
                <Button aria-label="スタッフ削除" onClick={() => removeStaff(staff.id)} variant="icon">
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {copyMessage ? <p className="text-xs font-bold text-[var(--color-primary)]">{copyMessage}</p> : null}
        <Input label="氏名" onChange={(event) => setStaffName(event.target.value)} value={staffName} />
        <Input label="メールアドレス" onChange={(event) => setStaffEmail(event.target.value)} type="email" value={staffEmail} />
        <Select label="権限" onChange={(event) => setStaffRole(event.target.value as FacilityStaffRole)} value={staffRole}>
          <option value="owner">Owner</option>
          <option value="staff">Staff</option>
        </Select>
        <Button leftIcon={<Plus size={18} />} onClick={addStaff}>
          スタッフ追加
        </Button>
      </Card>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="熟成設定" description="今後の個体受入時に熟成終了予定日を計算する基準値です。" />
        <div className="grid grid-cols-4 gap-2">
          {agingPresets.map((days) => (
            <Button
              key={days}
              onClick={() => setSettings((current) => ({ ...current, agingDays: days }))}
              size="sm"
              variant={settings.agingDays === days ? "primary" : "secondary"}
            >
              {days}日
            </Button>
          ))}
        </div>
        <Input
          inputMode="numeric"
          label="デフォルト熟成期間（日数）"
          min={0}
          onChange={(event) => setSettings((current) => ({ ...current, agingDays: Math.max(0, Number(event.target.value) || 0) }))}
          type="number"
          value={settings.agingDays}
        />
      </Card>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="種別設定" description="個体受入画面の種別選択肢に反映されます。" />
        <div className="grid gap-2">
          {settings.species.map((species) => (
            <div className="grid grid-cols-[1fr_auto] gap-2" key={species.id}>
              <Input aria-label={`${species.name}の種別名`} onChange={(event) => updateSpecies(species.id, event.target.value)} value={species.name} />
              <Button aria-label="種別削除" disabled={settings.species.length <= 1} onClick={() => removeSpecies(species.id)} variant="icon">
                <Trash2 size={18} />
              </Button>
            </div>
          ))}
        </div>
        <Input label="種別名を追加" onChange={(event) => setSpeciesName(event.target.value)} placeholder="エゾシカ" value={speciesName} />
        <div className="grid grid-cols-2 gap-2">
          <Button leftIcon={<Plus size={18} />} onClick={addSpecies}>
            追加
          </Button>
          <Button onClick={resetDefaultSpecies} variant="secondary">
            初期値に戻す
          </Button>
        </div>
      </Card>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <SectionTitle title="PDF設定" description="帳票に表示する名前と電話番号です。" />
        <Input label="PDF表示用施設名" onChange={(event) => updatePdf("facilityName", event.target.value)} value={settings.pdf.facilityName} />
        <Input inputMode="tel" label="PDF表示用電話番号" onChange={(event) => updatePdf("phoneNumber", event.target.value)} value={settings.pdf.phoneNumber} />
        <Input label="作成者名の初期値" onChange={(event) => updatePdf("creatorName", event.target.value)} value={settings.pdf.creatorName} />
      </Card>

      <Button className="sticky bottom-20 min-h-12 shadow-lg" onClick={save}>
        施設設定を保存
      </Button>
    </AppLayout>
  );
}
