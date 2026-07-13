"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, Input, SectionTitle, Select, Textarea } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  defaultFacilitySettings,
  defaultSpecies,
  getFacilitySettings,
  saveFacilitySettings,
  type FacilityAnimalSpecies,
  type FacilitySettings,
} from "@/lib/facilitySettingsStorage";
import {
  disableStaff,
  inviteStaff,
  listStaffMembers,
  type StaffMember,
  type StaffRole,
  type StaffStatus,
} from "@/lib/supabase/staff";

const agingPresets = [0, 3, 7, 14];
const staffMaintenanceMessage = "スタッフ招待機能は現在メンテナンス中です。既存スタッフの閲覧はできますが、招待・変更・無効化は一時停止しています。";

function createSpeciesId(name: string) {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, "-");
  return normalized ? `custom-${normalized}-${Date.now()}` : `custom-species-${Date.now()}`;
}

export default function FacilitySettingsPage() {
  const { isConfigured, user } = useAuth();
  const [settings, setSettings] = useState<FacilitySettings>(defaultFacilitySettings);
  const [speciesName, setSpeciesName] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("staff");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(true);
  const [isStaffSubmitting, setIsStaffSubmitting] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffMessage, setStaffMessage] = useState("");
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingRole, setEditingRole] = useState<StaffRole>("staff");
  const [editingStatus, setEditingStatus] = useState<StaffStatus>("active");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSettings(getFacilitySettings());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const loadStaff = useCallback(async function loadStaff() {
    if (!isConfigured || !user) {
      setStaff([]);
      setIsStaffLoading(false);
      return;
    }
    setIsStaffLoading(true);
    setStaffError("");
    try {
      setStaff(await listStaffMembers());
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : "スタッフ一覧を取得できませんでした。");
    } finally {
      setIsStaffLoading(false);
    }
  }, [isConfigured, user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadStaff(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadStaff]);

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

  async function addStaff() {
    const name = staffName.trim();
    const email = staffEmail.trim();
    if (!name || !email) {
      setStaffError("氏名とメールアドレスを入力してください。");
      return;
    }
    setIsStaffSubmitting(true);
    setStaffError("");
    setStaffMessage("");
    try {
      await inviteStaff({ name, email, role: staffRole });
      await loadStaff();
      setStaffName("");
      setStaffEmail("");
      setStaffRole("staff");
      setStaffMessage("招待メールを送信しました。");
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : "スタッフを招待できませんでした。");
    } finally {
      setIsStaffSubmitting(false);
    }
  }

  function startEditing(member: StaffMember) {
    setEditingStaffId(member.id);
    setEditingName(member.name);
    setEditingRole(member.role);
    setEditingStatus(member.status);
    setStaffError("");
  }

  function saveStaffEdit() {
    setStaffMessage("");
    setStaffError(staffMaintenanceMessage);
    return;
  }

  async function removeStaff(id: string) {
    if (!window.confirm("このスタッフを無効化しますか？")) return;
    setIsStaffSubmitting(true);
    setStaffError("");
    try {
      await disableStaff(id);
      await loadStaff();
      setEditingStaffId(null);
      setStaffMessage("スタッフを無効化しました。");
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : "スタッフを無効化できませんでした。");
    } finally {
      setIsStaffSubmitting(false);
    }
  }

  function handleSave() {
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

      <Button className="min-h-12 shadow-sm" onClick={handleSave} type="button">
        施設設定を保存
      </Button>

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
        <SectionTitle title="スタッフ招待・管理" description="Supabase Authで招待し、同じ施設に所属するスタッフを管理します。" />
        <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">
          {staffMaintenanceMessage}
        </p>
        {staffError ? <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{staffError}</p> : null}
        {staffMessage ? <p className="rounded-xl bg-[var(--color-primary-soft)] p-3 text-xs font-bold text-[var(--color-primary-dark)]">{staffMessage}</p> : null}
        {!isConfigured ? <p className="text-sm font-bold text-[var(--color-text-muted)]">Supabase環境変数を設定するとスタッフ管理を利用できます。</p> : null}
        <div className="grid gap-2">
          {isStaffLoading ? <p className="text-sm font-bold text-[var(--color-text-muted)]">スタッフを読み込み中...</p> : null}
          {!isStaffLoading && staff.length === 0 ? <p className="text-sm font-bold text-[var(--color-text-muted)]">スタッフは未登録です。</p> : null}
          {staff.map((member) => (
            <div className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3" key={member.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{member.name}</p>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">{member.email || "メール未登録"}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  <Badge variant={member.role === "owner" ? "success" : "muted"}>{member.role === "owner" ? "Owner" : "Staff"}</Badge>
                  <Badge variant={member.status === "active" ? "success" : member.status === "invited" ? "default" : "muted"}>
                    {member.status === "active" ? "有効" : member.status === "invited" ? "招待中" : "無効"}
                  </Badge>
                </div>
              </div>
              {editingStaffId === member.id ? (
                <div className="grid gap-2 rounded-lg bg-[var(--color-background)] p-2">
                  <Input label="氏名" onChange={(event) => setEditingName(event.target.value)} value={editingName} />
                  <Select label="権限" onChange={(event) => setEditingRole(event.target.value as StaffRole)} value={editingRole}>
                    <option value="owner">Owner</option>
                    <option value="staff">Staff</option>
                  </Select>
                  <Select label="状態" onChange={(event) => setEditingStatus(event.target.value as StaffStatus)} value={editingStatus}>
                    {member.status === "invited" ? <option value="invited">招待中</option> : null}
                    {member.status !== "invited" ? <option value="active">有効</option> : null}
                    <option value="disabled">無効</option>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Button disabled onClick={() => void saveStaffEdit()}>保存</Button>
                    <Button disabled={isStaffSubmitting} onClick={() => setEditingStaffId(null)} variant="secondary">キャンセル</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Button disabled leftIcon={<Pencil size={16} />} onClick={() => startEditing(member)} variant="secondary">
                    編集
                  </Button>
                  <Button aria-label="スタッフを無効化" disabled onClick={() => void removeStaff(member.id)} variant="icon">
                  <Trash2 size={18} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
        <Input label="氏名" onChange={(event) => setStaffName(event.target.value)} value={staffName} />
        <Input label="メールアドレス" onChange={(event) => setStaffEmail(event.target.value)} type="email" value={staffEmail} />
        <Select label="権限" onChange={(event) => setStaffRole(event.target.value as StaffRole)} value={staffRole}>
          <option value="owner">Owner</option>
          <option value="staff">Staff</option>
        </Select>
        <Button disabled leftIcon={<Plus size={18} />} onClick={() => void addStaff()}>
          {isStaffSubmitting ? "処理中..." : "スタッフを招待"}
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

    </AppLayout>
  );
}
