"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, ImagePlus, MapPinned } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Button, Card, Input, Select, Textarea } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { addAnimal, hasDuplicateAnimalNumber } from "@/lib/animalStorage";
import { createAutoHygieneRecordsForAnimal } from "@/lib/autoHygieneRecords";
import { defaultFacilitySettings, defaultSpecies, getFacilitySettings, getSpeciesName, type FacilityAnimalSpecies } from "@/lib/facilitySettingsStorage";
import { fetchCurrentLocationWeather, type CurrentLocationWeather } from "@/lib/weather";
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
  sexLabel,
  speciesLabel,
  transportCoolingLabel,
  type Animal,
  type AnimalAcceptanceDecision,
  type AnimalSex,
  type AnimalSpecies,
  type AntlerStatus,
  type BleedingPerformed,
  type EstimatedAge,
  type ImpactOrBleedingPart,
  type KnifeSanitationMethod,
  type ProcessingAbnormalityCheck,
  type ProcessingAbnormalityResult,
  type PregnancyStatus,
  type ReceivingAbnormalityCheck,
  type ReceivingAbnormalityResult,
  type TransportCooling,
} from "@/types/gibier";

const steps = ["基本情報", "捕獲情報", "搬入情報", "運搬情報", "確認"];
const photoSlots = ["被弾箇所"];
const receiveFormDraftKey = "arcnest-gibier:receive-form-draft";
type PhotoStepView = "summary" | "receiving" | "processing";

type ReceiveFormState = {
  animalNumber: string;
  species: AnimalSpecies | "";
  sex: AnimalSex;
  pregnancyStatus: PregnancyStatus;
  antlerStatus: AntlerStatus;
  estimatedAge: EstimatedAge;
  weightKg: string;
  notes: string;
  capturedAt: string;
  weather: string;
  temperatureC: string;
  captureLocation: string;
  meshNumber: string;
  captureMethod: string;
  hunterName: string;
  receivedAt: string;
  transporterName: string;
  receivedBy: string;
  bleedingPerformed: BleedingPerformed;
  knifeSanitationMethod: KnifeSanitationMethod;
  bleedingStartTime: string;
  transportCooling: TransportCooling;
  impactOrBleedingPart: ImpactOrBleedingPart;
  receivingAbnormalityChecks: ReceivingAbnormalityCheck[];
  processingAbnormalityChecks: ProcessingAbnormalityCheck[];
  acceptanceDecision: AnimalAcceptanceDecision;
  acceptanceRejectionReason: string;
};

const defaultReceivingAbnormalityChecks = (): ReceivingAbnormalityCheck[] =>
  receivingAbnormalityItems.map((item) => ({ itemId: item.id, result: "no" }));

const defaultProcessingAbnormalityChecks = (): ProcessingAbnormalityCheck[] =>
  processingAbnormalityItems.map((item) => ({ itemId: item.id, result: "ok", note: "" }));

const initialForm: ReceiveFormState = {
  animalNumber: "",
  species: "",
  sex: "unknown",
  pregnancyStatus: "",
  antlerStatus: "",
  estimatedAge: "",
  weightKg: "",
  notes: "",
  capturedAt: "",
  weather: "",
  temperatureC: "",
  captureLocation: "",
  meshNumber: "",
  captureMethod: "",
  hunterName: "",
  receivedAt: "",
  transporterName: "",
  receivedBy: "",
  bleedingPerformed: "",
  knifeSanitationMethod: "",
  bleedingStartTime: "",
  transportCooling: "",
  impactOrBleedingPart: "",
  receivingAbnormalityChecks: defaultReceivingAbnormalityChecks(),
  processingAbnormalityChecks: defaultProcessingAbnormalityChecks(),
  acceptanceDecision: "accepted",
  acceptanceRejectionReason: "",
};

function formatDateTime(value: string) {
  return value ? value.replace("T", " ") : "未入力";
}

function calculateAgingEndDate(receivedAt: string, agingDays: number) {
  if (!receivedAt) return "未入力";
  const date = new Date(receivedAt);
  if (Number.isNaN(date.getTime())) return "未入力";
  date.setDate(date.getDate() + agingDays);
  return date.toLocaleDateString("ja-JP");
}

function toStorageDate(value: string) {
  return formatDateTime(value).replaceAll("-", "/");
}

function toMeshNumberInputValue(meshNumber: string) {
  return meshNumber.slice(-2);
}

function getInitialReceiveForm() {
  if (typeof window === "undefined") return initialForm;

  const params = new URLSearchParams(window.location.search);
  const meshNumber = params.get("meshNumber");
  let nextForm = initialForm;

  try {
    const draft = window.sessionStorage.getItem(receiveFormDraftKey);
    if (draft) nextForm = { ...initialForm, ...JSON.parse(draft) } as ReceiveFormState;
  } catch (error) {
    console.warn("Receive form draft could not be restored.", error);
  }

  return meshNumber ? { ...nextForm, meshNumber: toMeshNumberInputValue(meshNumber) } : nextForm;
}

function getInitialStep() {
  if (typeof window === "undefined") return 0;
  return new URLSearchParams(window.location.search).has("meshNumber") ? 1 : 0;
}

function hasWeatherData(weather: CurrentLocationWeather) {
  return weather.weatherCode !== null || weather.currentTemperature !== null;
}

function isGeolocationPermissionDenied(error: unknown) {
  return typeof GeolocationPositionError !== "undefined" && error instanceof GeolocationPositionError && error.code === error.PERMISSION_DENIED;
}

export default function AnimalReceivePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(getInitialStep);
  const [form, setForm] = useState<ReceiveFormState>(getInitialReceiveForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [registeredAnimalNumber, setRegisteredAnimalNumber] = useState("");
  const [weatherStatus, setWeatherStatus] = useState<"loading" | "success" | "error">("loading");
  const [weatherErrorMessage, setWeatherErrorMessage] = useState("");
  const [photoStepView, setPhotoStepView] = useState<PhotoStepView>("summary");
  const [speciesOptions, setSpeciesOptions] = useState<FacilityAnimalSpecies[]>(defaultSpecies);
  const [defaultAgingDays, setDefaultAgingDays] = useState(defaultFacilitySettings.agingDays);

  function updateForm<K extends keyof ReceiveFormState>(key: K, value: ReceiveFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors([]);
  }

  function saveReceiveFormDraft(nextForm = form) {
    window.sessionStorage.setItem(receiveFormDraftKey, JSON.stringify(nextForm));
  }

  function goMeshSearch() {
    saveReceiveFormDraft();
    router.push("/animals/receive/mesh-search");
  }

  function updateCapturedAt(value: string) {
    setForm((current) => ({
      ...current,
      capturedAt: value,
      receivedAt: value,
    }));
  }

  function updateReceivingAbnormality(itemId: string, result: ReceivingAbnormalityResult) {
    setForm((current) => ({
      ...current,
      receivingAbnormalityChecks: current.receivingAbnormalityChecks.map((check) => (check.itemId === itemId ? { ...check, result } : check)),
    }));
  }

  function updateProcessingAbnormality(itemId: string, field: "result" | "note", value: ProcessingAbnormalityResult | string) {
    setForm((current) => ({
      ...current,
      processingAbnormalityChecks: current.processingAbnormalityChecks.map((check) => {
        if (check.itemId !== itemId) return check;
        if (field === "result" && value === "ok") return { ...check, result: "ok", note: "" };
        return { ...check, [field]: value };
      }),
    }));
  }

  function updateAcceptanceDecision(value: AnimalAcceptanceDecision) {
    setForm((current) => ({
      ...current,
      acceptanceDecision: value,
      acceptanceRejectionReason: value === "accepted" ? "" : current.acceptanceRejectionReason,
    }));
  }

  const receivingAbnormalityCount = form.receivingAbnormalityChecks.filter((check) => check.result === "yes").length;
  const processingAbnormalityCount = form.processingAbnormalityChecks.filter((check) => check.result === "abnormal").length;
  const hasAbnormality = receivingAbnormalityCount > 0 || processingAbnormalityCount > 0 || form.acceptanceDecision === "rejected";

  async function updateWeatherFields(preserveManualValues = false) {
    setWeatherStatus("loading");
    setWeatherErrorMessage("");

    try {
      const weather = await fetchCurrentLocationWeather();
      if (!hasWeatherData(weather)) throw new Error("Weather data is empty.");

      setForm((current) => ({
        ...current,
        weather: preserveManualValues && current.weather ? current.weather : weather.name,
        temperatureC:
          preserveManualValues && current.temperatureC
            ? current.temperatureC
            : weather.currentTemperature === null
              ? ""
              : Math.round(weather.currentTemperature).toString(),
      }));
      setWeatherStatus("success");
      setWeatherErrorMessage("");
    } catch (error) {
      console.warn("Weather autofill failed. Continue with manual input.", error);
      setWeatherErrorMessage(
        isGeolocationPermissionDenied(error)
          ? "現在地の利用が許可されていません。ブラウザの設定で位置情報を許可するか、天気・気温を手入力してください。"
          : "天気を取得できませんでした。手入力してください。",
      );
      setWeatherStatus("error");
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void updateWeatherFields(true);
      const facilitySettings = getFacilitySettings();
      setSpeciesOptions(facilitySettings.species);
      setDefaultAgingDays(facilitySettings.agingDays);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const meshNumber = new URLSearchParams(window.location.search).get("meshNumber");
    if (!meshNumber) return;

    const timeoutId = window.setTimeout(() => {
      setForm((current) => ({ ...current, meshNumber: toMeshNumberInputValue(meshNumber) }));
      setCurrentStep(1);
      window.history.replaceState(null, "", "/animals/receive");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function validateStep(step: number) {
    const nextErrors: string[] = [];

    if (step === 0) {
      if (!form.animalNumber.trim()) nextErrors.push("個体識別番号を入力してください。");
      if (!form.species) nextErrors.push("種別を選択してください。");
    }

    if (step === 1 && !form.capturedAt) {
      nextErrors.push("捕獲日時を入力してください。");
    }

    if (step === 2 && !form.receivedAt) {
      nextErrors.push("搬入日時を入力してください。");
    }

    setErrors(nextErrors);
    return nextErrors.length === 0;
  }

  function goNext() {
    if (!validateStep(currentStep)) return;
    if (currentStep === 3) setPhotoStepView("summary");
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function goBack() {
    setErrors([]);
    if (currentStep === 3 && photoStepView !== "summary") {
      setPhotoStepView("summary");
      return;
    }

    if (currentStep === 0) {
      router.push("/dashboard");
      return;
    }

    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function completeTemporaryRegistration() {
    if (!validateStep(4) || !form.species) return;

    if (hasDuplicateAnimalNumber(form.animalNumber)) {
      setErrors(["この個体識別番号は既に登録されています。"]);
      return;
    }

    const now = new Date().toISOString();
    const animal: Animal = {
      id: `local-${Date.now()}`,
      animalNumber: form.animalNumber.trim(),
      species: form.species,
      sex: form.sex,
      pregnancyStatus: form.pregnancyStatus,
      antlerStatus: form.antlerStatus,
      estimatedAge: form.estimatedAge,
      weightKg: Number(form.weightKg) || 0,
      capturedAt: toStorageDate(form.capturedAt),
      captureLocation: form.captureLocation,
      captureMethod: form.captureMethod,
      hunterName: form.hunterName,
      weather: form.weather,
      temperatureC: form.temperatureC,
      meshNumber: form.meshNumber.trim() || undefined,
      receivedAt: toStorageDate(form.receivedAt),
      transportedBy: form.transporterName,
      receivedBy: form.receivedBy,
      stopBleedingBy: form.receivedBy,
      bleedingPerformed: form.bleedingPerformed,
      knifeSanitationMethod: form.knifeSanitationMethod,
      bleedingStartTime: form.bleedingStartTime,
      transportCooling: form.transportCooling,
      impactOrBleedingPart: form.impactOrBleedingPart,
      receivingAbnormalityChecks: form.receivingAbnormalityChecks,
      processingAbnormalityChecks: form.processingAbnormalityChecks,
      acceptanceDecision: form.acceptanceDecision,
      acceptanceRejectionReason: form.acceptanceRejectionReason,
      status: "received",
      notes: form.notes,
      hasIssue: hasAbnormality,
      createdAt: now,
      updatedAt: now,
    };

    if (!addAnimal(animal)) {
      setErrors(["この個体識別番号は既に登録されています。"]);
      return;
    }

    createAutoHygieneRecordsForAnimal(animal);
    window.sessionStorage.removeItem(receiveFormDraftKey);
    setRegisteredAnimalNumber(animal.animalNumber);
    setIsCompleted(true);
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("animals")} />} className="mx-auto grid max-w-md gap-4 py-4">
      <header className="flex items-center justify-between">
        <Link className="text-sm font-bold text-[var(--color-primary)]" href="/dashboard">
          <ArrowLeft size={18} />
        </Link>
        <div className="text-center">
          <h1 className="text-base font-bold">個体受入</h1>
          <p className="text-xs font-bold text-[var(--color-primary)]">STEP{currentStep + 1}/5</p>
        </div>
        {currentStep < steps.length - 1 ? (
          <button className="text-xs font-bold text-[var(--color-primary)]" onClick={goNext} type="button">
            次へ
          </button>
        ) : (
          <span className="text-xs font-bold text-[var(--color-primary)]">確認</span>
        )}
      </header>

      <div className="grid grid-cols-5 gap-1">
        {steps.map((step, index) => (
          <button
            className={`rounded-full px-2 py-1 text-center text-[10px] font-bold ${
              index === currentStep ? "bg-[var(--color-primary)] text-white" : "bg-white text-[var(--color-text-muted)]"
            }`}
            key={step}
            type="button"
          >
            {step}
          </button>
        ))}
      </div>

      {errors.length > 0 ? (
        <Card className="rounded-2xl border-red-200 bg-red-50 p-3 shadow-sm">
          <div className="grid gap-1">
            {errors.map((error) => (
              <p className="text-xs font-bold text-red-700" key={error}>
                {error}
              </p>
            ))}
          </div>
        </Card>
      ) : null}

      {currentStep === 0 ? (
        <Card className="grid gap-4 rounded-2xl p-4 shadow-sm">
          <h2 className="text-center text-sm font-bold">基本情報</h2>
          <Input label="個体識別番号 *" onChange={(event) => updateForm("animalNumber", event.target.value)} placeholder="126046" value={form.animalNumber} />
          <Select label="種別 *" onChange={(event) => updateForm("species", event.target.value as AnimalSpecies)} value={form.species}>
            <option value="">選択してください</option>
            {speciesOptions.map((species) => (
              <option key={species.id} value={species.id}>
                {species.name}
              </option>
            ))}
          </Select>
          <Select label="性別" onChange={(event) => updateForm("sex", event.target.value as AnimalSex)} value={form.sex}>
            <option value="male">オス</option>
            <option value="female">メス</option>
            <option value="unknown">不明</option>
          </Select>
          <Select label="妊娠の有無" onChange={(event) => updateForm("pregnancyStatus", event.target.value as PregnancyStatus)} value={form.pregnancyStatus}>
            <option value="">選択してください</option>
            <option value="yes">あり</option>
            <option value="no">なし</option>
          </Select>
          <Select label="角の有無" onChange={(event) => updateForm("antlerStatus", event.target.value as AntlerStatus)} value={form.antlerStatus}>
            <option value="">選択してください</option>
            <option value="none">なし</option>
            <option value="velvet">袋角</option>
            <option value="one">1本角</option>
            <option value="two">2本角</option>
            <option value="three">3本角</option>
            <option value="four">4本角</option>
          </Select>
          <Select label="推定年齢" onChange={(event) => updateForm("estimatedAge", event.target.value as EstimatedAge)} value={form.estimatedAge}>
            <option value="">選択してください</option>
            <option value="one">1歳</option>
            <option value="two">2歳</option>
            <option value="three">3歳</option>
            <option value="four">4歳</option>
            <option value="older">それ以上</option>
          </Select>
          <Input label="体重 kg" onChange={(event) => updateForm("weightKg", event.target.value)} placeholder="53.2" type="number" value={form.weightKg} />
          <Textarea label="備考" onChange={(event) => updateForm("notes", event.target.value)} placeholder="特記事項を入力" value={form.notes} />
        </Card>
      ) : null}

      {currentStep === 1 ? (
        <Card className="grid gap-4 rounded-2xl p-4 shadow-sm">
          <h2 className="text-center text-sm font-bold">捕獲情報</h2>
          <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-2">
            <div className="min-w-0">
              <Input className="w-full min-w-0" label="天気" onChange={(event) => updateForm("weather", event.target.value)} placeholder="晴れ" value={form.weather} />
            </div>
            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-[var(--color-text)]">
              気温
              <span className="flex min-w-0 items-center gap-1">
                <input
                  className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 text-base text-[var(--color-text)] outline-none transition-[var(--transition-base)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]"
                  onChange={(event) => updateForm("temperatureC", event.target.value)}
                  placeholder="24"
                  type="number"
                  value={form.temperatureC}
                />
                <span className="shrink-0 text-sm font-bold text-[var(--color-text-muted)]">℃</span>
              </span>
            </label>
          </div>
          {weatherStatus === "loading" ? <p className="text-xs font-bold text-[var(--color-text-muted)]">天気取得中...</p> : null}
          {weatherStatus === "error" ? <p className="text-xs font-bold text-orange-600">{weatherErrorMessage}</p> : null}
          <Input label="捕獲日時 *" onChange={(event) => updateCapturedAt(event.target.value)} type="datetime-local" value={form.capturedAt} />
          <Input label="捕獲場所" onChange={(event) => updateForm("captureLocation", event.target.value)} placeholder="塩山" value={form.captureLocation} />
          <div className="grid gap-2">
            <Input label="メッシュ番号" onChange={(event) => updateForm("meshNumber", event.target.value)} placeholder="11" value={form.meshNumber} />
            <Button leftIcon={<MapPinned size={18} />} onClick={goMeshSearch} variant="secondary">
              メッシュ番号を検索
            </Button>
          </div>
          <Select label="捕獲方法" onChange={(event) => updateForm("captureMethod", event.target.value)} value={form.captureMethod}>
            <option value="">選択してください</option>
            <option value="銃">銃</option>
            <option value="ワナ">ワナ</option>
            <option value="その他">その他</option>
          </Select>
          <Input label="捕獲者名" onChange={(event) => updateForm("hunterName", event.target.value)} placeholder="ジビエ 太郎" value={form.hunterName} />
        </Card>
      ) : null}

      {currentStep === 2 ? (
        <Card className="grid gap-4 rounded-2xl p-4 shadow-sm">
          <h2 className="text-center text-sm font-bold">搬入情報</h2>
          <Input label="搬入日時 *" onChange={(event) => updateForm("receivedAt", event.target.value)} type="datetime-local" value={form.receivedAt} />
          <Input label="搬入者" onChange={(event) => updateForm("transporterName", event.target.value)} placeholder="ジビエ 太郎" value={form.transporterName} />
          <Input label="止め刺し者" onChange={(event) => updateForm("receivedBy", event.target.value)} placeholder="搬入者と同じ" value={form.receivedBy} />
          <Select label="放血の実施" onChange={(event) => updateForm("bleedingPerformed", event.target.value as BleedingPerformed)} value={form.bleedingPerformed}>
            <option value="">選択してください</option>
            <option value="yes">あり</option>
            <option value="no">なし</option>
          </Select>
          <Select label="放血用ナイフの消毒方法" onChange={(event) => updateForm("knifeSanitationMethod", event.target.value as KnifeSanitationMethod)} value={form.knifeSanitationMethod}>
            <option value="">選択してください</option>
            <option value="alcohol">アルコール</option>
            <option value="flame">火炎</option>
          </Select>
          <Input label="放血開始時間" onChange={(event) => updateForm("bleedingStartTime", event.target.value)} type="time" value={form.bleedingStartTime} />
        </Card>
      ) : null}

      {currentStep === 3 ? (
        <Card className="grid gap-4 rounded-2xl p-4 shadow-sm">
          {photoStepView === "summary" ? (
            <>
              <h2 className="text-center text-sm font-bold">運搬情報</h2>
              <p className="text-xs font-semibold leading-5 text-[var(--color-text-muted)]">運搬時の冷却、被弾または止め刺し部位、異常確認を記録します。</p>
              <div className="grid gap-2">
                {photoSlots.map((slot) => (
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] p-3" key={slot}>
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[var(--color-primary)] shadow-sm">
                      <ImagePlus size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-bold">{slot}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">被弾箇所に関する確認項目です。</p>
                    </div>
                  </div>
                ))}
              </div>
              <Select label="運搬時冷却" onChange={(event) => updateForm("transportCooling", event.target.value as TransportCooling)} value={form.transportCooling}>
                <option value="">選択してください</option>
                <option value="yes">有</option>
                <option value="no">無</option>
              </Select>
              <Select label="被弾または止め刺し部位" onChange={(event) => updateForm("impactOrBleedingPart", event.target.value as ImpactOrBleedingPart)} value={form.impactOrBleedingPart}>
                <option value="">選択してください</option>
                <option value="head">頭部</option>
                <option value="jaw">顎部</option>
                <option value="chest_heart">胸部（心臓）</option>
                <option value="abdomen">腹部</option>
                <option value="other">その他</option>
              </Select>
              <div className="grid gap-2">
                <button className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-3 text-left shadow-sm" onClick={() => setPhotoStepView("receiving")} type="button">
                  <span>
                    <span className="block text-sm font-bold">受入時の異常</span>
                  </span>
                  <Badge variant={receivingAbnormalityCount > 0 ? "danger" : "success"}>{receivingAbnormalityCount > 0 ? `${receivingAbnormalityCount}件` : "異常なし"}</Badge>
                </button>
                <button className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-3 text-left shadow-sm" onClick={() => setPhotoStepView("processing")} type="button">
                  <span>
                    <span className="block text-sm font-bold">解体時の異常</span>
                  </span>
                  <Badge variant={processingAbnormalityCount > 0 || form.acceptanceDecision === "rejected" ? "danger" : "success"}>
                    {processingAbnormalityCount > 0 ? `${processingAbnormalityCount}件` : form.acceptanceDecision === "accepted" ? "異常なし" : animalAcceptanceDecisionLabel[form.acceptanceDecision]}
                  </Badge>
                </button>
              </div>
            </>
          ) : null}

          {photoStepView === "receiving" ? (
            <>
              <button className="text-left text-xs font-bold text-[var(--color-primary)]" onClick={() => setPhotoStepView("summary")} type="button">
                ← 運搬情報へ戻る
              </button>
              <h2 className="text-center text-sm font-bold">受入時の異常</h2>
              <div className="grid gap-2">
                {receivingAbnormalityItems.map((item) => {
                  const check = form.receivingAbnormalityChecks.find((entry) => entry.itemId === item.id);
                  return (
                    <div className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3" key={item.id}>
                      <p className="text-sm font-bold leading-6">{item.label}</p>
                      <Select label="確認結果" onChange={(event) => updateReceivingAbnormality(item.id, event.target.value as ReceivingAbnormalityResult)} value={check?.result ?? "no"}>
                        <option value="no">いいえ</option>
                        <option value="yes">はい</option>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {photoStepView === "processing" ? (
            <>
              <button className="text-left text-xs font-bold text-[var(--color-primary)]" onClick={() => setPhotoStepView("summary")} type="button">
                ← 運搬情報へ戻る
              </button>
              <h2 className="text-center text-sm font-bold">解体時の異常</h2>
              <div className="grid gap-2">
                {processingAbnormalityItems.map((item) => {
                  const check = form.processingAbnormalityChecks.find((entry) => entry.itemId === item.id);
                  return (
                    <div className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3" key={item.id}>
                      <div>
                        <p className="text-xs font-bold text-[var(--color-primary)]">{item.category}</p>
                        <p className="mt-1 text-sm font-bold leading-6">{item.label}</p>
                      </div>
                      <Select label="確認結果" onChange={(event) => updateProcessingAbnormality(item.id, "result", event.target.value as ProcessingAbnormalityResult)} value={check?.result ?? "ok"}>
                        <option value="ok">問題なし</option>
                        <option value="abnormal">異常あり</option>
                      </Select>
                      <Input
                        disabled={(check?.result ?? "ok") !== "abnormal"}
                        label="備考"
                        onChange={(event) => updateProcessingAbnormality(item.id, "note", event.target.value)}
                        placeholder="異常があった場合の理由や措置"
                        value={check?.note ?? ""}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <Select label="受入可否" onChange={(event) => updateAcceptanceDecision(event.target.value as AnimalAcceptanceDecision)} value={form.acceptanceDecision}>
                  <option value="accepted">異常なし</option>
                  <option value="rejected">不可</option>
                </Select>
                <Input
                  disabled={form.acceptanceDecision !== "rejected"}
                  label="不可の場合の理由"
                  onChange={(event) => updateForm("acceptanceRejectionReason", event.target.value)}
                  placeholder="不可の場合の理由を記載"
                  value={form.acceptanceRejectionReason}
                />
              </div>
            </>
          ) : null}
        </Card>
      ) : null}

      {currentStep === 4 ? (
        <Card className="grid gap-4 rounded-2xl p-4 shadow-sm">
          {isCompleted ? (
            <div className="grid place-items-center gap-4 py-4 text-center">
              <CheckCircle2 className="text-[var(--color-primary)]" size={72} />
              <div>
                <p className="text-xl font-bold text-[var(--color-primary)]">仮登録が完了しました</p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">次StepでSupabase保存処理に置き換え予定です。</p>
              </div>
              <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white" href="/animals">
                一覧に戻る
                <ChevronRight size={16} />
              </Link>
              <Link className="text-xs font-bold text-[var(--color-primary)] underline underline-offset-4" href={`/animals/${registeredAnimalNumber}`}>
                登録した個体の詳細を見る
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-center text-sm font-bold">入力内容の確認</h2>
              <div className="grid gap-2 text-sm">
                {[
                  ["個体識別番号", form.animalNumber || "未入力"],
                  ["種別", form.species ? speciesLabel[form.species] ?? getSpeciesName(form.species) : "未入力"],
                  ["性別", sexLabel[form.sex]],
                  ["妊娠の有無", pregnancyStatusLabel[form.pregnancyStatus]],
                  ["角の有無", antlerStatusLabel[form.antlerStatus]],
                  ["推定年齢", estimatedAgeLabel[form.estimatedAge]],
                  ["体重", form.weightKg ? `${form.weightKg}kg` : "未入力"],
                  ["捕獲日時", formatDateTime(form.capturedAt)],
                  ["天気", form.weather || "未入力"],
                  ["気温", form.temperatureC ? `${form.temperatureC}℃` : "未入力"],
                  ["捕獲場所", form.captureLocation || "未入力"],
                  ["メッシュ番号", form.meshNumber || "未入力"],
                  ["捕獲方法", form.captureMethod || "未入力"],
                  ["捕獲者名", form.hunterName || "未入力"],
                  ["搬入日時", formatDateTime(form.receivedAt)],
                  ["熟成終了予定日", calculateAgingEndDate(form.receivedAt, defaultAgingDays)],
                  ["搬入者", form.transporterName || "未入力"],
                  ["止め刺し者", form.receivedBy || "未入力"],
                  ["放血の実施", bleedingPerformedLabel[form.bleedingPerformed]],
                  ["放血用ナイフの消毒方法", knifeSanitationMethodLabel[form.knifeSanitationMethod]],
                  ["放血開始時間", form.bleedingStartTime || "未入力"],
                  ["被弾箇所", "運搬情報で確認"],
                  ["運搬時冷却", transportCoolingLabel[form.transportCooling]],
                  ["被弾または止め刺し部位", impactOrBleedingPartLabel[form.impactOrBleedingPart]],
                  ["受入時の異常", receivingAbnormalityCount > 0 ? `${receivingAbnormalityCount}件あり` : "すべていいえ"],
                  ["解体時の異常", processingAbnormalityCount > 0 ? `${processingAbnormalityCount}件あり` : "すべて問題なし"],
                  ["受入可否", form.acceptanceDecision === "accepted" ? "異常なし" : animalAcceptanceDecisionLabel[form.acceptanceDecision]],
                  ["不可理由", form.acceptanceRejectionReason || "なし"],
                  ["備考", form.notes || "なし"],
                ].map(([label, value]) => (
                  <div className="grid grid-cols-[110px_1fr] border-b border-[var(--color-border)] pb-2" key={label}>
                    <span className="font-bold text-[var(--color-text-muted)]">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
              <Badge variant="muted">localStorageへの仮保存です。DB保存はまだ行いません。</Badge>
              <p className="rounded-xl bg-[var(--color-primary-soft)] p-3 text-xs font-bold text-[var(--color-primary-dark)]">衛生3帳票を個体番号に自動記録します。</p>
              <Button onClick={completeTemporaryRegistration}>仮登録する</Button>
            </>
          )}
        </Card>
      ) : null}

      {!isCompleted ? (
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={goBack} variant="secondary">戻る</Button>
          {currentStep < steps.length - 1 ? <Button onClick={goNext}>次へ</Button> : <Button onClick={completeTemporaryRegistration}>仮登録する</Button>}
        </div>
      ) : null}
    </AppLayout>
  );
}
