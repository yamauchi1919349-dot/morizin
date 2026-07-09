import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  impactOrBleedingPartLabel,
  type Animal,
  type AnimalPhoto,
  type FacilityHygieneRecord,
  type HealthCheckRecord,
  type HygieneCheckValue,
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

const fallbackName = "未登録";

const sexLabel: Record<Animal["sex"], string> = {
  male: "オス",
  female: "メス",
  unknown: "未登録",
};

function display(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return fallbackName;
  return String(value);
}

function latest<T extends { createdAt?: string; date?: string }>(items: T[]) {
  return [...items].sort((a, b) => display(b.createdAt ?? b.date).localeCompare(display(a.createdAt ?? a.date)))[0];
}

function formatDate(value?: string | null) {
  if (!value) return fallbackName;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return `${dateOnly[1]}年${dateOnly[2]}月${dateOnly[3]}日`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return display(value);

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}年${month}月${day}日`;
}

function optionalValue(source: object, key: string) {
  return Object.prototype.hasOwnProperty.call(source, key) ? (source as Record<string, unknown>)[key] : undefined;
}

function normalizeMetalDetectorValue(value: unknown) {
  if (value === true) return "ok";
  if (value === false) return "ng";
  if (typeof value !== "string") return "";

  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  if (["ok", "問題なし", "検査済", "検査済み", "済", "true", "yes"].includes(normalized)) return "ok";
  if (["ng", "未実施", "false", "no", "not_applicable", "該当なし"].includes(normalized)) return "ng";

  return "";
}

function metalDetectorValue(data: TraceabilityPdfData) {
  const values: Array<HygieneCheckValue | string> = [];

  data.workRecords.forEach((record) => {
    record.checks
      .filter((check) => check.itemId === "clean-12" || check.itemId === "clean-13")
      .forEach((check) => values.push(check.result ?? check.value ?? ""));
    record.fields
      .filter((field) => field.fieldId === "metal-detector" || field.fieldId === "metalDetector" || field.fieldId === "metalDetectorResult")
      .forEach((field) => values.push(field.value));
  });

  data.facilityRecords.forEach((record) => {
    record.checks
      .filter((check) => check.itemId === "packing-metal-operation" || check.itemId === "packing-metal-sterilize")
      .forEach((check) => {
        values.push(check.before ?? check.value ?? "");
        values.push(check.after ?? check.value ?? "");
      });
    record.fields
      .filter((field) => field.fieldId === "metal-detector" || field.fieldId === "metalDetector" || field.fieldId === "metalDetectorResult")
      .forEach((field) => values.push(field.value));
  });

  [optionalValue(data.animal, "metalDetector"), optionalValue(data.animal, "metalDetectorResult"), optionalValue(data.animal, "metalDetectorChecked")].forEach((value) => {
    const normalized = normalizeMetalDetectorValue(value);
    if (normalized) values.push(normalized);
  });

  const normalizedValues = values.map((value) => normalizeMetalDetectorValue(value)).filter(Boolean);
  if (normalizedValues.some((value) => value === "ok")) return "検査済";
  if (normalizedValues.some((value) => value === "ng")) return "未実施";
  return "";
}

function createPage() {
  const page = document.createElement("section");
  page.style.width = "794px";
  page.style.minHeight = "1123px";
  page.style.boxSizing = "border-box";
  page.style.padding = "188px 72px 0";
  page.style.background = "#ffffff";
  page.style.color = "#222222";
  page.style.fontFamily = "\"Yu Gothic\", \"Meiryo\", \"Hiragino Kaku Gothic ProN\", sans-serif";
  return page;
}

function appendManagementTable(parent: HTMLElement, rows: Row[]) {
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.tableLayout = "fixed";
  table.style.border = "2px solid #111111";

  const titleRow = document.createElement("tr");
  const titleCell = document.createElement("th");
  titleCell.colSpan = 2;
  titleCell.textContent = "個体受け入れ管理表";
  titleCell.style.border = "2px solid #111111";
  titleCell.style.padding = "12px 8px";
  titleCell.style.fontSize = "25px";
  titleCell.style.fontWeight = "500";
  titleCell.style.textAlign = "center";
  titleCell.style.lineHeight = "1.25";
  titleRow.appendChild(titleCell);
  table.appendChild(titleRow);

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    const td = document.createElement("td");

    th.textContent = row.label;
    th.style.width = "44%";
    th.style.border = "2px solid #111111";
    th.style.padding = "9px 8px";
    th.style.fontSize = "23px";
    th.style.fontWeight = "500";
    th.style.textAlign = "center";
    th.style.verticalAlign = "middle";
    th.style.lineHeight = "1.25";
    th.style.wordBreak = "keep-all";

    td.textContent = display(row.value);
    td.style.width = "56%";
    td.style.border = "2px solid #111111";
    td.style.padding = "9px 10px";
    td.style.fontSize = "23px";
    td.style.fontWeight = "400";
    td.style.textAlign = "center";
    td.style.verticalAlign = "middle";
    td.style.lineHeight = "1.25";
    td.style.wordBreak = "break-word";

    tr.append(th, td);
    table.appendChild(tr);
  });

  const storageRow = document.createElement("tr");
  const storageCell = document.createElement("td");
  storageCell.colSpan = 2;
  storageCell.textContent = "加熱用・－１８度以下保存";
  storageCell.style.border = "2px solid #111111";
  storageCell.style.padding = "12px 8px";
  storageCell.style.fontSize = "23px";
  storageCell.style.fontWeight = "500";
  storageCell.style.textAlign = "center";
  storageCell.style.lineHeight = "1.25";
  storageRow.appendChild(storageCell);
  table.appendChild(storageRow);

  parent.appendChild(table);
}

function createPages(data: TraceabilityPdfData) {
  const latestFacility = latest(data.facilityRecords);
  const latestWork = latest(data.workRecords);
  const page = createPage();

  appendManagementTable(page, [
    { label: "個体番号", value: data.animal.animalNumber },
    { label: "捕獲年月日", value: formatDate(data.animal.capturedAt) },
    { label: "解体年月日", value: formatDate(latestWork?.date) },
    { label: "施設責任者", value: latestFacility?.confirmedBy ?? latestWork?.confirmedBy ?? "" },
    { label: "記入者", value: latestWork?.checkedBy ?? latestFacility?.checkedBy ?? data.animal.receivedBy },
    { label: "捕獲地域", value: data.animal.captureLocation },
    { label: "捕獲者氏名（イニシャル）", value: data.animal.hunterName },
    { label: "捕獲方法", value: data.animal.captureMethod },
    { label: "被弾または止め刺し行使部位", value: impactOrBleedingPartLabel[data.animal.impactOrBleedingPart ?? ""] },
    { label: "性別", value: sexLabel[data.animal.sex] },
    { label: "体重（内臓摘出後）", value: data.animal.weightKg ? String(data.animal.weightKg) : "" },
    { label: "金属探知機", value: metalDetectorValue(data) },
    { label: "電話番号", value: "" },
  ]);

  return [page];
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

    // TODO: pdf_exports に出力履歴を保存予定
    // TODO: Supabase Storage にPDFファイル保存予定
    pdf.save(`traceability-${data.animal.animalNumber}.pdf`);
  } finally {
    host.remove();
  }
}
