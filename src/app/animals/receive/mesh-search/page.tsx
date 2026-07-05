"use client";

import Link from "next/link";
import { ArrowLeft, LocateFixed, Minus, MoveDown, MoveLeft, MoveRight, MoveUp, Plus } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { calculateThirdMeshNumber } from "@/lib/mesh";

const tileSize = 256;
const initialCenter = { lat: 35.704, lng: 138.73 };

type SelectedPoint = {
  lat: number;
  lng: number;
  meshNumber: string;
};

function lonToTileX(lon: number, zoom: number) {
  return ((lon + 180) / 360) * 2 ** zoom;
}

function latToTileY(lat: number, zoom: number) {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
}

function tileXToLon(x: number, zoom: number) {
  return (x / 2 ** zoom) * 360 - 180;
}

function tileYToLat(y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** zoom;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function toMeshNumberInputValue(meshNumber: string) {
  return meshNumber.slice(-2);
}

export default function MeshSearchPage() {
  const router = useRouter();
  const [center, setCenter] = useState(initialCenter);
  const [zoom, setZoom] = useState(12);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const mapState = useMemo(() => {
    const centerTileX = lonToTileX(center.lng, zoom);
    const centerTileY = latToTileY(center.lat, zoom);
    const topLeftTileX = centerTileX - 1.5;
    const topLeftTileY = centerTileY - 1.5;
    const baseTileX = Math.floor(centerTileX) - 1;
    const baseTileY = Math.floor(centerTileY) - 1;
    const tiles = Array.from({ length: 9 }, (_, index) => {
      const x = baseTileX + (index % 3);
      const y = baseTileY + Math.floor(index / 3);
      return {
        key: `${zoom}-${x}-${y}`,
        x,
        y,
        left: `${((x - topLeftTileX) / 3) * 100}%`,
        top: `${((y - topLeftTileY) / 3) * 100}%`,
      };
    });

    return { centerTileX, centerTileY, tiles, topLeftTileX, topLeftTileY };
  }, [center.lat, center.lng, zoom]);

  const markerStyle = useMemo(() => {
    if (!selectedPoint) return null;
    const x = lonToTileX(selectedPoint.lng, zoom);
    const y = latToTileY(selectedPoint.lat, zoom);

    return {
      left: `${((x - mapState.topLeftTileX) / 3) * 100}%`,
      top: `${((y - mapState.topLeftTileY) / 3) * 100}%`,
    };
  }, [mapState.topLeftTileX, mapState.topLeftTileY, selectedPoint, zoom]);

  function selectPoint(clientX: number, clientY: number, rect: DOMRect) {
    const virtualX = ((clientX - rect.left) / rect.width) * (tileSize * 3);
    const virtualY = ((clientY - rect.top) / rect.height) * (tileSize * 3);
    const tileX = mapState.topLeftTileX + virtualX / tileSize;
    const tileY = mapState.topLeftTileY + virtualY / tileSize;
    const lat = tileYToLat(tileY, zoom);
    const lng = tileXToLon(tileX, zoom);

    setSelectedPoint({ lat, lng, meshNumber: calculateThirdMeshNumber(lat, lng) });
  }

  function handleMapClick(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    selectPoint(event.clientX, event.clientY, rect);
  }

  function handleMapKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const rect = event.currentTarget.getBoundingClientRect();
    selectPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
  }

  function pan(dx: number, dy: number) {
    const nextX = mapState.centerTileX + dx;
    const nextY = mapState.centerTileY + dy;
    setCenter({ lat: tileYToLat(nextY, zoom), lng: tileXToLon(nextX, zoom) });
  }

  function updateZoom(nextZoom: number) {
    setZoom(Math.min(16, Math.max(8, nextZoom)));
  }

  function moveToCurrentLocation() {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("現在地を取得できませんでした。");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
        setZoom((current) => Math.max(current, 14));
        setIsLocating(false);
      },
      () => {
        setLocationError("現在地を取得できませんでした。");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 },
    );
  }

  function reflectMeshNumber() {
    if (!selectedPoint) return;
    router.push(`/animals/receive?meshNumber=${encodeURIComponent(toMeshNumberInputValue(selectedPoint.meshNumber))}`);
  }

  return (
    <AppLayout className="mx-auto grid max-w-md gap-4 py-4">
      <header className="flex items-center justify-between">
        <Link className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)]" href="/animals/receive">
          <ArrowLeft size={18} />
          戻る
        </Link>
        <h1 className="text-base font-bold">メッシュ番号検索</h1>
        <span className="w-12" />
      </header>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold">地図をタップ</p>
            <p className="text-xs font-semibold text-[var(--color-text-muted)]">タップ地点から3次メッシュ番号を計算します。</p>
          </div>
          <div className="flex gap-1">
            <Button aria-label="縮小" onClick={() => updateZoom(zoom - 1)} variant="icon">
              <Minus size={18} />
            </Button>
            <Button aria-label="拡大" onClick={() => updateZoom(zoom + 1)} variant="icon">
              <Plus size={18} />
            </Button>
          </div>
        </div>

        <div
          className="relative aspect-square overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]"
          onClick={handleMapClick}
          onKeyDown={handleMapKeyDown}
          role="button"
          tabIndex={0}
        >
          {mapState.tiles.map((tile) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="absolute h-1/3 w-1/3 select-none object-cover"
              draggable={false}
              key={tile.key}
              src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
              style={{ left: tile.left, top: tile.top }}
            />
          ))}
          {markerStyle ? (
            <span
              className="absolute grid h-8 w-8 -translate-x-1/2 -translate-y-full place-items-center rounded-full bg-[var(--color-primary)] text-white shadow-lg"
              style={markerStyle}
            >
              <LocateFixed size={18} />
            </span>
          ) : null}
          <p className="absolute bottom-1 right-2 rounded bg-white/90 px-2 py-1 text-[10px] font-bold text-[var(--color-text-muted)]">© OpenStreetMap contributors</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <span />
          <Button aria-label="上へ移動" onClick={() => pan(0, -0.5)} variant="secondary">
            <MoveUp size={18} />
          </Button>
          <span />
          <Button aria-label="左へ移動" onClick={() => pan(-0.5, 0)} variant="secondary">
            <MoveLeft size={18} />
          </Button>
          <Button disabled={isLocating} onClick={moveToCurrentLocation} variant="secondary">
            {isLocating ? "取得中" : "現在地"}
          </Button>
          <Button aria-label="右へ移動" onClick={() => pan(0.5, 0)} variant="secondary">
            <MoveRight size={18} />
          </Button>
          <span />
          <Button aria-label="下へ移動" onClick={() => pan(0, 0.5)} variant="secondary">
            <MoveDown size={18} />
          </Button>
          <span />
        </div>
        {locationError ? <p className="text-xs font-bold text-red-600">{locationError}</p> : null}
      </Card>

      <Card className="grid gap-3 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-[112px_1fr] gap-2 text-sm">
          <span className="font-bold text-[var(--color-text-muted)]">緯度</span>
          <span className="font-semibold">{selectedPoint ? selectedPoint.lat.toFixed(6) : "未選択"}</span>
          <span className="font-bold text-[var(--color-text-muted)]">経度</span>
          <span className="font-semibold">{selectedPoint ? selectedPoint.lng.toFixed(6) : "未選択"}</span>
          <span className="font-bold text-[var(--color-text-muted)]">メッシュ番号</span>
          <span className="text-lg font-bold text-[var(--color-primary)]">{selectedPoint?.meshNumber ?? "未選択"}</span>
        </div>
        <Button disabled={!selectedPoint} onClick={reflectMeshNumber}>
          このメッシュ番号を反映
        </Button>
      </Card>
    </AppLayout>
  );
}
