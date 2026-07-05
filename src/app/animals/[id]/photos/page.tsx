"use client";

import Link from "next/link";
import { ArrowLeft, ImagePlus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, SectionTitle } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { deleteAnimalPhoto, getAnimalPhotosByAnimalId, upsertAnimalPhoto } from "@/lib/animalPhotoStorage";
import type { AnimalPhoto, AnimalPhotoType } from "@/types/gibier";

type PhotoSlot = {
  type: AnimalPhotoType;
  label: string;
  description: string;
};

const photoSlots: PhotoSlot[] = [
  { type: "whole_body", label: "全体写真", description: "個体全体が分かる写真" },
  { type: "damage", label: "損傷部位", description: "損傷や確認箇所の写真" },
  { type: "capture_point", label: "止め刺し部位", description: "止め刺し部位の確認写真" },
  { type: "carcass", label: "枝肉写真", description: "処理後の枝肉状態の写真" },
  { type: "other", label: "その他", description: "補足として残す写真" },
];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AnimalPhotosPage() {
  const params = useParams<{ id: string }>();
  const animalId = params.id;
  const [photos, setPhotos] = useState<AnimalPhoto[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPhotos(getAnimalPhotosByAnimalId(animalId));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [animalId]);

  async function handleFileChange(slot: PhotoSlot, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);
    const photo: AnimalPhoto = {
      id: `${animalId}-${slot.type}`,
      animalId,
      type: slot.type,
      url: "",
      dataUrl,
      label: slot.label,
      createdAt: new Date().toISOString(),
    };

    upsertAnimalPhoto(photo);
    setPhotos(getAnimalPhotosByAnimalId(animalId));
  }

  function handleDelete(photoId: string) {
    deleteAnimalPhoto(photoId);
    setPhotos(getAnimalPhotosByAnimalId(animalId));
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("animals")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href={`/animals/${animalId}`}>
          <ArrowLeft size={18} />
          詳細へ
        </Link>
        <h1 className="text-base font-bold">写真登録</h1>
        <span className="w-12" />
      </header>

      <Card className="rounded-2xl p-4 shadow-sm" variant="info">
        <p className="text-sm font-bold text-[var(--color-primary-dark)]">現在は端末内の仮保存です。</p>
        <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">販売版ではクラウド保存に対応します。</p>
      </Card>

      <section className="grid gap-3">
        <SectionTitle title="写真種別" description="写真種別ごとに1枚ずつ仮登録できます。" />
        {photoSlots.map((slot) => {
          const photo = photos.find((item) => item.type === slot.type);

          return (
            <Card className="grid gap-3 rounded-2xl p-4 shadow-sm" key={slot.type}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold">{slot.label}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{slot.description}</p>
                </div>
                <Badge variant={photo ? "success" : "muted"}>{photo ? "登録済み" : "未登録"}</Badge>
              </div>

              <div className="grid min-h-40 place-items-center overflow-hidden rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)]">
                {photo?.dataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={slot.label} className="h-full max-h-64 w-full object-cover" src={photo.dataUrl} />
                ) : (
                  <div className="grid place-items-center gap-2 p-6 text-center">
                    <ImagePlus className="text-[var(--color-primary)]" size={32} />
                    <p className="text-xs font-semibold text-[var(--color-text-muted)]">画像を選択するとここにプレビュー表示されます</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-bold text-white">
                  ファイル選択
                  <input accept="image/*" className="hidden" onChange={(event) => void handleFileChange(slot, event)} type="file" />
                </label>
                <Button disabled={!photo} onClick={() => photo && handleDelete(photo.id)} variant="secondary">
                  <Trash2 size={17} />
                </Button>
              </div>
            </Card>
          );
        })}
      </section>
    </AppLayout>
  );
}
