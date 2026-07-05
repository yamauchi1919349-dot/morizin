import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  bleedingPerformedLabel,
  antlerStatusLabel,
  animalAcceptanceDecisionLabel,
  estimatedAgeLabel,
  impactOrBleedingPartLabel,
  knifeSanitationMethodLabel,
  processingAbnormalityItems,
  pregnancyStatusLabel,
  receivingAbnormalityItems,
  transportCoolingLabel,
  type Animal,
  type AnimalPhoto,
  type FacilityHygieneRecord,
  type HealthCheckRecord,
  type InventoryItem,
  type Shipment,
  type WorkHygieneRecord,
} from "@/types/gibier";

type TraceabilityPdfData = {
  animal: Animal;
  photos: AnimalPhoto[];
  facilityRecords: FacilityHygieneRecord[];
  workRecords: WorkHygieneRecord[];
  healthRecords: HealthCheckRecord[];
  inventoryItems: InventoryItem[];
  shipments: Shipment[];
};

type Row = {
  label: string;
  value: string;
};

const facilityName = "ArcNest GIBIER";
const confirmerName = "ジビエ 太郎";

const speciesLabel: Record<Animal["species"], string> = {
  deer: "ニホンジカ",
  boar: "イノシシ",
};

const sexLabel: Record<Animal["sex"], string> = {
  male: "オス",
  female: "メス",
  unknown: "不明",
};

const statusLabel: Record<Animal["status"], string> = {
  received: "受入済み",
  waiting_processing: "処理待ち",
  processing: "処理中",
  processed: "処理済み",
  in_stock: "在庫保管",
  waiting_shipment: "出荷待ち",
  shipped: "出荷済み",
  discarded: "廃棄",
  needs_review: "要確認",
};

function display(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "未登録";
  return String(value);
}

function latest<T extends { createdAt?: string; date?: string; shippedAt?: string }>(items: T[]) {
  return [...items].sort((a, b) => display(b.shippedAt ?? b.createdAt ?? b.date).localeCompare(display(a.shippedAt ?? a.createdAt ?? a.date)))[0];
}

function abnormalityRows(animal: Animal): Row[] {
  const receivingAbnormalities = receivingAbnormalityItems.filter((item) => animal.receivingAbnormalityChecks?.find((check) => check.itemId === item.id)?.result === "yes");
  const processingAbnormalities = processingAbnormalityItems
    .map((item) => ({ item, check: animal.processingAbnormalityChecks?.find((entry) => entry.itemId === item.id) }))
    .filter(({ check }) => check?.result === "abnormal");

  return [
    { label: "受入時の異常", value: receivingAbnormalities.length > 0 ? `${receivingAbnormalities.length}件あり` : "すべていいえ" },
    ...receivingAbnormalities.map((item) => ({ label: "受入時確認", value: item.label })),
    { label: "解体時の異常", value: processingAbnormalities.length > 0 ? `${processingAbnormalities.length}件あり` : "すべて問題なし" },
    ...processingAbnormalities.map(({ item, check }) => ({
      label: `解体時 ${item.category}`,
      value: `${item.label}${check?.note ? ` / 備考: ${check.note}` : ""}`,
    })),
    { label: "受入可否", value: animalAcceptanceDecisionLabel[animal.acceptanceDecision ?? "accepted"] },
    { label: "不可理由", value: animal.acceptanceDecision === "rejected" ? animal.acceptanceRejectionReason || "未入力" : "なし" },
  ];
}

function createPage(title: string, subtitle?: string) {
  const page = document.createElement("section");
  page.style.width = "794px";
  page.style.minHeight = "1123px";
  page.style.boxSizing = "border-box";
  page.style.padding = "44px";
  page.style.background = "#ffffff";
  page.style.color = "#12312a";
  page.style.fontFamily = "\"Yu Gothic\", \"Meiryo\", \"Hiragino Kaku Gothic ProN\", sans-serif";
  page.style.display = "flex";
  page.style.flexDirection = "column";
  page.style.gap = "18px";

  const header = document.createElement("div");
  header.style.borderRadius = "18px";
  header.style.background = "#0f766e";
  header.style.color = "#ffffff";
  header.style.padding = "24px";

  const heading = document.createElement("h1");
  heading.textContent = title;
  heading.style.margin = "0";
  heading.style.fontSize = "30px";
  heading.style.letterSpacing = "0";

  header.appendChild(heading);

  if (subtitle) {
    const sub = document.createElement("p");
    sub.textContent = subtitle;
    sub.style.margin = "8px 0 0";
    sub.style.fontSize = "15px";
    sub.style.fontWeight = "700";
    header.appendChild(sub);
  }

  page.appendChild(header);
  return page;
}

function appendSection(parent: HTMLElement, title: string, rows: Row[]) {
  const section = document.createElement("div");
  section.style.border = "1px solid #cbd5d1";
  section.style.borderRadius = "14px";
  section.style.overflow = "hidden";
  section.style.background = "#ffffff";

  const heading = document.createElement("h2");
  heading.textContent = title;
  heading.style.margin = "0";
  heading.style.padding = "10px 14px";
  heading.style.fontSize = "16px";
  heading.style.background = "#ecfdf5";
  heading.style.color = "#065f46";
  section.appendChild(heading);

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "13px";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    const td = document.createElement("td");

    th.textContent = row.label;
    th.style.width = "34%";
    th.style.borderTop = "1px solid #e5e7eb";
    th.style.background = "#f8fafc";
    th.style.padding = "9px 12px";
    th.style.textAlign = "left";
    th.style.verticalAlign = "top";

    td.textContent = display(row.value);
    td.style.borderTop = "1px solid #e5e7eb";
    td.style.padding = "9px 12px";
    td.style.verticalAlign = "top";

    tr.append(th, td);
    table.appendChild(tr);
  });

  section.appendChild(table);
  parent.appendChild(section);
}

function appendAssurance(parent: HTMLElement, rows: Row[]) {
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "1fr 1fr";
  grid.style.gap = "10px";

  rows.forEach((row) => {
    const card = document.createElement("div");
    card.style.border = "1px solid #bbf7d0";
    card.style.background = "#f0fdf4";
    card.style.borderRadius = "12px";
    card.style.padding = "12px";

    const label = document.createElement("p");
    label.textContent = row.label;
    label.style.margin = "0 0 6px";
    label.style.fontSize = "12px";
    label.style.fontWeight = "700";
    label.style.color = "#166534";

    const value = document.createElement("p");
    value.textContent = display(row.value);
    value.style.margin = "0";
    value.style.fontSize = "16px";
    value.style.fontWeight = "800";
    value.style.color = "#14532d";

    card.append(label, value);
    grid.appendChild(card);
  });

  parent.appendChild(grid);
}

function appendTimeline(parent: HTMLElement, rows: Row[]) {
  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gap = "10px";

  rows.forEach((row, index) => {
    const item = document.createElement("div");
    item.style.display = "grid";
    item.style.gridTemplateColumns = "32px 1fr";
    item.style.gap = "10px";
    item.style.alignItems = "start";

    const number = document.createElement("span");
    number.textContent = String(index + 1);
    number.style.display = "grid";
    number.style.placeItems = "center";
    number.style.width = "28px";
    number.style.height = "28px";
    number.style.borderRadius = "999px";
    number.style.background = "#0f766e";
    number.style.color = "#ffffff";
    number.style.fontWeight = "800";

    const body = document.createElement("div");
    body.style.border = "1px solid #d1fae5";
    body.style.borderRadius = "12px";
    body.style.padding = "10px 12px";
    body.style.background = "#ffffff";

    const label = document.createElement("p");
    label.textContent = row.label;
    label.style.margin = "0";
    label.style.fontWeight = "800";
    label.style.color = "#064e3b";

    const value = document.createElement("p");
    value.textContent = display(row.value);
    value.style.margin = "4px 0 0";
    value.style.fontSize = "13px";
    value.style.color = "#475569";

    body.append(label, value);
    item.append(number, body);
    list.appendChild(item);
  });

  parent.appendChild(list);
}

function createPages(data: TraceabilityPdfData) {
  const issueDate = new Date().toLocaleDateString("ja-JP");
  const latestShipment = latest(data.shipments);
  const firstShipmentItem = latestShipment?.items[0];
  const latestInventory = latest(data.inventoryItems);
  const hasHygieneRecord = data.facilityRecords.length + data.workRecords.length + data.healthRecords.length > 0;
  const pages: HTMLElement[] = [];

  const page = createPage("トレーサビリティ票", "お客様用");
  appendSection(page, "基本情報", [
    { label: "個体識別番号", value: data.animal.animalNumber },
    { label: "動物種", value: speciesLabel[data.animal.species] },
    { label: "性別", value: sexLabel[data.animal.sex] },
    { label: "妊娠の有無", value: pregnancyStatusLabel[data.animal.pregnancyStatus ?? ""] },
    { label: "角の有無", value: antlerStatusLabel[data.animal.antlerStatus ?? ""] },
    { label: "推定年齢", value: estimatedAgeLabel[data.animal.estimatedAge ?? ""] },
    { label: "体重", value: `${data.animal.weightKg}kg` },
    { label: "捕獲日", value: data.animal.capturedAt },
    { label: "天気", value: data.animal.weather || "未入力" },
    { label: "気温", value: data.animal.temperatureC ? `${data.animal.temperatureC}℃` : "未入力" },
    { label: "捕獲場所", value: data.animal.captureLocation },
    { label: "メッシュ番号", value: data.animal.meshNumber || "未入力" },
    { label: "捕獲方法", value: data.animal.captureMethod },
    { label: "捕獲者", value: data.animal.hunterName },
  ]);

  appendSection(page, "搬入・処理情報", [
    { label: "搬入日", value: data.animal.receivedAt },
    { label: "搬入者", value: data.animal.transportedBy ?? "" },
    { label: "処理施設名", value: facilityName },
    { label: "止め刺し者", value: data.animal.stopBleedingBy ?? data.animal.receivedBy },
    { label: "放血の実施", value: bleedingPerformedLabel[data.animal.bleedingPerformed ?? ""] },
    { label: "放血用ナイフの消毒方法", value: knifeSanitationMethodLabel[data.animal.knifeSanitationMethod ?? ""] },
    { label: "放血開始時間", value: data.animal.bleedingStartTime || "未入力" },
    { label: "運搬時冷却", value: transportCoolingLabel[data.animal.transportCooling ?? ""] },
    { label: "被弾または止め刺し部位", value: impactOrBleedingPartLabel[data.animal.impactOrBleedingPart ?? ""] },
    { label: "処理状況", value: statusLabel[data.animal.status] },
    ...abnormalityRows(data.animal),
  ]);

  appendSection(page, "出荷情報", [
    { label: "出荷番号", value: latestShipment?.shipmentNumber ?? "" },
    { label: "出荷日", value: latestShipment?.shippedAt ?? "" },
    { label: "出荷先", value: latestShipment?.customerName ?? "" },
    { label: "部位", value: firstShipmentItem?.partName ?? latestInventory?.partName ?? "" },
    { label: "重量", value: firstShipmentItem ? `${firstShipmentItem.weightKg}kg` : latestInventory ? `${latestInventory.weightKg}kg` : "" },
    { label: "数量", value: firstShipmentItem ? String(firstShipmentItem.quantity) : latestInventory ? String(latestInventory.quantity) : "" },
    { label: "ロット番号", value: firstShipmentItem?.lotNumber ?? latestInventory?.lotNumber ?? "" },
  ]);

  appendSection(page, "安心確認", []);
  appendAssurance(page, [
    { label: "写真記録", value: data.photos.length > 0 ? "登録済み" : "未登録" },
    { label: "衛生管理記録", value: hasHygieneRecord ? "登録済み" : "未登録" },
    { label: "在庫記録", value: data.inventoryItems.length > 0 ? "登録済み" : "未登録" },
    { label: "出荷記録", value: data.shipments.length > 0 ? "登録済み" : "未登録" },
  ]);

  appendSection(page, "発行情報", [
    { label: "発行日", value: issueDate },
    { label: "施設名", value: facilityName },
    { label: "確認者", value: confirmerName },
  ]);

  pages.push(page);

  const needsDetailPage = data.animal.notes || data.shipments.length === 0 || data.inventoryItems.length === 0 || !hasHygieneRecord;
  if (needsDetailPage) {
    const detail = createPage("詳細情報", "捕獲から出荷までの流れ");
    appendTimeline(detail, [
      { label: "捕獲", value: `${display(data.animal.capturedAt)} / ${display(data.animal.captureLocation)} / ${display(data.animal.meshNumber)}` },
      { label: "搬入", value: `${display(data.animal.receivedAt)} / ${display(data.animal.stopBleedingBy ?? data.animal.receivedBy)}` },
      { label: "衛生確認", value: hasHygieneRecord ? "衛生管理記録あり" : "未登録" },
      { label: "在庫登録", value: data.inventoryItems.length > 0 ? `${data.inventoryItems.length}件` : "未登録" },
      { label: "出荷登録", value: data.shipments.length > 0 ? `${data.shipments.length}件` : "未登録" },
    ]);
    appendSection(detail, "未登録項目・備考", [
      { label: "出荷情報", value: data.shipments.length > 0 ? "登録済み" : "未登録" },
      { label: "在庫情報", value: data.inventoryItems.length > 0 ? "登録済み" : "未登録" },
      { label: "衛生管理記録", value: hasHygieneRecord ? "登録済み" : "未登録" },
      { label: "備考", value: data.animal.notes },
    ]);
    pages.push(detail);
  }

  return pages;
}

export async function generateTraceabilityPdf(data: TraceabilityPdfData) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "794px";
  host.style.background = "#ffffff";

  const pages = createPages(data);
  pages.forEach((page) => host.appendChild(page));
  document.body.appendChild(host);

  try {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const image = canvas.toDataURL("image/jpeg", 0.95);
      if (index > 0) pdf.addPage();
      pdf.addImage(image, "JPEG", 0, 0, 210, 297);
    }

    // TODO: QRコードをPDFに追加予定
    // TODO: pdf_exports に出力履歴を保存予定
    // TODO: Supabase Storage にPDFファイル保存予定
    pdf.save(`traceability-${data.animal.animalNumber}.pdf`);
  } finally {
    host.remove();
  }
}
