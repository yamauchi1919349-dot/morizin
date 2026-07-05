import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { facilityHygieneFormItems, healthCheckFormItems, workHygieneFormItems, type HygieneFormItem } from "@/constants/hygieneForms";
import {
  bleedingPerformedLabel,
  antlerStatusLabel,
  animalAcceptanceDecisionLabel,
  estimatedAgeLabel,
  impactOrBleedingPartLabel,
  knifeSanitationMethodLabel,
  processingAbnormalityItems,
  processingAbnormalityResultLabel,
  pregnancyStatusLabel,
  receivingAbnormalityItems,
  receivingAbnormalityResultLabel,
  transportCoolingLabel,
  type Animal,
  type FacilityHygieneRecord,
  type HealthCheckRecord,
  type HygieneCheckEntry,
  type HygieneCheckValue,
  type WorkHygieneRecord,
} from "@/types/gibier";

type AnimalKartePdfData = {
  animal: Animal;
  photos: unknown[];
  facilityRecords: FacilityHygieneRecord[];
  workRecords: WorkHygieneRecord[];
  healthRecords: HealthCheckRecord[];
  inventoryItems: unknown[];
  shipments: unknown[];
};

type Row = {
  label: string;
  value: string;
};

const facilityName = "ArcNest GIBIER";
const authorName = "ジビエ 太郎";

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

const checkLabel: Record<HygieneCheckValue, string> = {
  ok: "OK",
  ng: "NG",
  not_applicable: "該当なし",
  "": "未登録",
};

function display(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "未登録";
  return String(value);
}

function latest<T extends { createdAt?: string; date?: string }>(items: T[]) {
  return [...items].sort((a, b) => display(b.createdAt ?? b.date).localeCompare(display(a.createdAt ?? a.date)))[0];
}

function abnormalityRows(animal: Animal): Row[] {
  const receivingAbnormalities = receivingAbnormalityItems.filter((item) => animal.receivingAbnormalityChecks?.find((check) => check.itemId === item.id)?.result === "yes");
  const processingAbnormalities = processingAbnormalityItems
    .map((item) => ({ item, check: animal.processingAbnormalityChecks?.find((entry) => entry.itemId === item.id) }))
    .filter(({ check }) => check?.result === "abnormal");

  return [
    { label: "受入時の異常", value: receivingAbnormalities.length > 0 ? `${receivingAbnormalities.length}件あり` : "すべていいえ" },
    ...receivingAbnormalities.map((item) => ({ label: `受入時 ${receivingAbnormalityResultLabel.yes}`, value: item.label })),
    { label: "解体時の異常", value: processingAbnormalities.length > 0 ? `${processingAbnormalities.length}件あり` : "すべて問題なし" },
    ...processingAbnormalities.map(({ item, check }) => ({
      label: `解体時 ${item.category}`,
      value: `${item.label}${check?.note ? ` / 備考: ${check.note}` : ""}`,
    })),
    { label: "受入可否", value: animalAcceptanceDecisionLabel[animal.acceptanceDecision ?? "accepted"] },
    { label: "不可理由", value: animal.acceptanceDecision === "rejected" ? animal.acceptanceRejectionReason || "未入力" : "なし" },
  ];
}

function checkValue(check?: HygieneCheckEntry, key: "before" | "after" | "receiving" | "processing" | "result" = "result") {
  if (!check) return "未登録";
  return checkLabel[check[key] ?? check.value ?? ""];
}

function createPage(title: string, subtitle?: string) {
  const page = document.createElement("section");
  page.style.width = "794px";
  page.style.minHeight = "1123px";
  page.style.boxSizing = "border-box";
  page.style.padding = "44px";
  page.style.background = "#ffffff";
  page.style.color = "#111827";
  page.style.fontFamily = "\"Yu Gothic\", \"Meiryo\", \"Hiragino Kaku Gothic ProN\", sans-serif";
  page.style.display = "flex";
  page.style.flexDirection = "column";
  page.style.gap = "18px";

  const header = document.createElement("div");
  header.style.borderBottom = "3px solid #1f2937";
  header.style.paddingBottom = "12px";

  const heading = document.createElement("h1");
  heading.textContent = title;
  heading.style.margin = "0";
  heading.style.fontSize = "28px";
  heading.style.letterSpacing = "0";

  header.appendChild(heading);

  if (subtitle) {
    const sub = document.createElement("p");
    sub.textContent = subtitle;
    sub.style.margin = "6px 0 0";
    sub.style.fontSize = "14px";
    sub.style.color = "#4b5563";
    header.appendChild(sub);
  }

  page.appendChild(header);
  return page;
}

function appendRows(parent: HTMLElement, rows: Row[]) {
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "13px";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    const td = document.createElement("td");

    th.textContent = row.label;
    th.style.width = "32%";
    th.style.border = "1px solid #d1d5db";
    th.style.background = "#f3f4f6";
    th.style.padding = "8px";
    th.style.textAlign = "left";
    th.style.verticalAlign = "top";

    td.textContent = display(row.value);
    td.style.border = "1px solid #d1d5db";
    td.style.padding = "8px";
    td.style.verticalAlign = "top";

    tr.append(th, td);
    table.appendChild(tr);
  });

  parent.appendChild(table);
}

function appendSmallTitle(parent: HTMLElement, title: string) {
  const heading = document.createElement("h2");
  heading.textContent = title;
  heading.style.margin = "6px 0 0";
  heading.style.fontSize = "17px";
  heading.style.borderLeft = "5px solid #2563eb";
  heading.style.paddingLeft = "8px";
  parent.appendChild(heading);
}

function appendEmpty(parent: HTMLElement, text = "未登録") {
  const empty = document.createElement("p");
  empty.textContent = text;
  empty.style.margin = "0";
  empty.style.padding = "18px";
  empty.style.border = "1px solid #d1d5db";
  empty.style.background = "#f9fafb";
  empty.style.textAlign = "center";
  empty.style.fontWeight = "700";
  parent.appendChild(empty);
}

function appendHygieneTable(parent: HTMLElement, items: HygieneFormItem[], checks: HygieneCheckEntry[] | undefined, mode: "facility" | "work" | "health") {
  if (!checks) {
    appendEmpty(parent);
    return;
  }

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = mode === "facility" ? "8px" : "10px";

  const headers =
    mode === "facility"
      ? ["区分", "No.", "項目", "作業前", "作業後", "備考"]
      : mode === "health"
        ? ["区分", "No.", "項目", "搬入日", "精肉日"]
        : ["区分", "No.", "項目", "結果"];

  const thead = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.border = "1px solid #d1d5db";
    th.style.background = "#f3f4f6";
    th.style.padding = "5px";
    th.style.textAlign = "left";
    thead.appendChild(th);
  });
  table.appendChild(thead);

  items.forEach((item, index) => {
    const check = checks.find((entry) => entry.itemId === item.id);
    const tr = document.createElement("tr");
    const cells =
      mode === "facility"
        ? [item.section, String(item.no ?? index + 1), item.label, checkValue(check, "before"), checkValue(check, "after"), display(check?.note)]
        : mode === "health"
          ? [item.section, String(item.no ?? index + 1), item.label, checkValue(check, "receiving"), checkValue(check, "processing")]
          : [item.section, String(item.no ?? index + 1), item.label, checkValue(check, "result")];

    cells.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      td.style.border = "1px solid #d1d5db";
      td.style.padding = "4px";
      td.style.verticalAlign = "top";
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  parent.appendChild(table);
}

function appendReceivingAbnormalityTable(parent: HTMLElement, animal: Animal) {
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "11px";

  const thead = document.createElement("tr");
  ["異常の確認", "確認結果"].forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.border = "1px solid #d1d5db";
    th.style.background = "#f3f4f6";
    th.style.padding = "7px";
    th.style.textAlign = "left";
    thead.appendChild(th);
  });
  table.appendChild(thead);

  receivingAbnormalityItems.forEach((item) => {
    const result = animal.receivingAbnormalityChecks?.find((check) => check.itemId === item.id)?.result ?? "no";
    const tr = document.createElement("tr");
    [item.label, receivingAbnormalityResultLabel[result]].forEach((cell, index) => {
      const td = document.createElement("td");
      td.textContent = cell;
      td.style.width = index === 0 ? "78%" : "22%";
      td.style.border = "1px solid #d1d5db";
      td.style.padding = "7px";
      td.style.verticalAlign = "top";
      td.style.fontWeight = index === 1 ? "700" : "400";
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  parent.appendChild(table);
}

function appendProcessingAbnormalityTable(parent: HTMLElement, animal: Animal) {
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "9px";

  const thead = document.createElement("tr");
  ["区分", "確認事項", "確認結果", "備考"].forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.border = "1px solid #d1d5db";
    th.style.background = "#f3f4f6";
    th.style.padding = "5px";
    th.style.textAlign = "left";
    thead.appendChild(th);
  });
  table.appendChild(thead);

  processingAbnormalityItems.forEach((item) => {
    const check = animal.processingAbnormalityChecks?.find((entry) => entry.itemId === item.id);
    const result = check?.result ?? "ok";
    const tr = document.createElement("tr");
    [item.category, item.label, processingAbnormalityResultLabel[result], check?.note ?? ""].forEach((cell, index) => {
      const td = document.createElement("td");
      td.textContent = display(cell);
      td.style.width = index === 0 ? "12%" : index === 1 ? "52%" : index === 2 ? "14%" : "22%";
      td.style.border = "1px solid #d1d5db";
      td.style.padding = "4px";
      td.style.verticalAlign = "top";
      td.style.fontWeight = index === 2 ? "700" : "400";
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });

  parent.appendChild(table);
}

function createPages(data: AnimalKartePdfData) {
  const outputDate = new Date().toLocaleDateString("ja-JP");
  const facilityRecord = latest(data.facilityRecords);
  const workRecord = latest(data.workRecords);
  const healthRecord = latest(data.healthRecords);
  const pages: HTMLElement[] = [];

  const cover = createPage("個体カルテ", "国産ジビエ認証提出用");
  cover.style.justifyContent = "center";
  appendRows(cover, [
    { label: "個体識別番号", value: data.animal.animalNumber },
    { label: "種別", value: speciesLabel[data.animal.species] },
    { label: "捕獲日", value: data.animal.capturedAt },
    { label: "搬入日", value: data.animal.receivedAt },
    { label: "施設名", value: facilityName },
    { label: "出力日", value: outputDate },
    { label: "作成者", value: authorName },
  ]);
  pages.push(cover);

  const detail = createPage("個体詳細", "捕獲から受入までの基本情報");
  appendRows(detail, [
    { label: "個体識別番号", value: data.animal.animalNumber },
    { label: "種別", value: speciesLabel[data.animal.species] },
    { label: "性別", value: sexLabel[data.animal.sex] },
    { label: "妊娠の有無", value: pregnancyStatusLabel[data.animal.pregnancyStatus ?? ""] },
    { label: "角の有無", value: antlerStatusLabel[data.animal.antlerStatus ?? ""] },
    { label: "推定年齢", value: estimatedAgeLabel[data.animal.estimatedAge ?? ""] },
    { label: "体重", value: `${data.animal.weightKg}kg` },
    { label: "捕獲日時", value: data.animal.capturedAt },
    { label: "天気", value: data.animal.weather || "未入力" },
    { label: "気温", value: data.animal.temperatureC ? `${data.animal.temperatureC}℃` : "未入力" },
    { label: "捕獲場所", value: data.animal.captureLocation },
    { label: "メッシュ番号", value: data.animal.meshNumber || "未入力" },
    { label: "捕獲方法", value: data.animal.captureMethod },
    { label: "捕獲者名", value: data.animal.hunterName },
    { label: "搬入日時", value: data.animal.receivedAt },
    { label: "搬入者", value: data.animal.transportedBy ?? "" },
    { label: "止め刺し者", value: data.animal.stopBleedingBy ?? data.animal.receivedBy },
    { label: "放血の実施", value: bleedingPerformedLabel[data.animal.bleedingPerformed ?? ""] },
    { label: "放血用ナイフの消毒方法", value: knifeSanitationMethodLabel[data.animal.knifeSanitationMethod ?? ""] },
    { label: "放血開始時間", value: data.animal.bleedingStartTime || "未入力" },
    { label: "運搬時冷却", value: transportCoolingLabel[data.animal.transportCooling ?? ""] },
    { label: "被弾または止め刺し部位", value: impactOrBleedingPartLabel[data.animal.impactOrBleedingPart ?? ""] },
    { label: "現在ステータス", value: statusLabel[data.animal.status] },
    ...abnormalityRows(data.animal),
    { label: "備考", value: data.animal.notes },
  ]);
  pages.push(detail);

  const receivingAbnormality = createPage("受入時の異常", "外見上の異常がないことを確認するチェックシート");
  appendReceivingAbnormalityTable(receivingAbnormality, data.animal);
  pages.push(receivingAbnormality);

  const processingAbnormality = createPage("解体時の異常", "全身・内臓・枝肉の確認結果");
  appendProcessingAbnormalityTable(processingAbnormality, data.animal);
  appendSmallTitle(processingAbnormality, "使用の可否");
  appendRows(processingAbnormality, [
    { label: "受入可否", value: animalAcceptanceDecisionLabel[data.animal.acceptanceDecision ?? "accepted"] },
    { label: "不可理由", value: data.animal.acceptanceDecision === "rejected" ? data.animal.acceptanceRejectionReason || "未入力" : "なし" },
  ]);
  pages.push(processingAbnormality);

  const facility = createPage("施設衛生点検簿", "Step16正式項目");
  appendRows(facility, [
    { label: "作業日", value: facilityRecord?.date ?? "" },
    { label: "記入者", value: facilityRecord?.checkedBy ?? "" },
    { label: "責任者", value: facilityRecord?.confirmedBy ?? "" },
    { label: "責任者確認日", value: facilityRecord?.confirmedAt ?? "" },
    { label: "備考", value: facilityRecord?.notes ?? "" },
  ]);
  appendHygieneTable(facility, facilityHygieneFormItems, facilityRecord?.checks, "facility");
  pages.push(facility);

  const work = createPage("作業時衛生管理簿", "Step16正式項目");
  appendRows(work, [
    { label: "個体番号", value: workRecord?.animalNumber ?? data.animal.animalNumber },
    { label: "作業日", value: workRecord?.date ?? "" },
    { label: "記入者", value: workRecord?.checkedBy ?? "" },
    { label: "責任者", value: workRecord?.confirmedBy ?? "" },
    { label: "逸脱項目", value: workRecord?.deviationItems ?? "" },
    { label: "逸脱時の考察と対応", value: workRecord?.deviationResponse ?? "" },
  ]);
  appendHygieneTable(work, workHygieneFormItems, workRecord?.checks, "work");
  pages.push(work);

  const health = createPage("健康管理簿", "Step16正式項目");
  appendRows(health, [
    { label: "個体番号", value: healthRecord?.animalNumber ?? data.animal.animalNumber },
    { label: "作業者名", value: healthRecord?.workerName ?? "" },
    { label: "搬入日", value: healthRecord?.receivingDate ?? healthRecord?.date ?? "" },
    { label: "精肉日", value: healthRecord?.processingDate ?? "" },
    { label: "備考", value: healthRecord?.notes ?? "" },
  ]);
  appendHygieneTable(health, healthCheckFormItems, healthRecord?.checks, "health");
  pages.push(health);

  const history = createPage("作業履歴・確認欄", "監査対応用の確認欄");
  appendSmallTitle(history, "作業履歴");
  appendRows(history, [
    { label: "個体受入", value: data.animal.receivedAt ? "記録あり" : "未登録" },
    { label: "受入時の異常確認", value: "記録あり" },
    { label: "解体時の異常確認", value: "記録あり" },
    { label: "衛生記録", value: data.facilityRecords.length + data.workRecords.length + data.healthRecords.length > 0 ? "記録あり" : "未登録" },
  ]);
  appendSmallTitle(history, "確認欄");
  appendRows(history, [
    { label: "作成者", value: authorName },
    { label: "確認者", value: "" },
    { label: "確認日", value: "" },
    { label: "押印欄", value: "" },
  ]);
  pages.push(history);

  return pages;
}

export async function generateAnimalKartePdf(data: AnimalKartePdfData) {
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
    pdf.save(`animal-karte-${data.animal.animalNumber}.pdf`);
  } finally {
    host.remove();
  }
}
