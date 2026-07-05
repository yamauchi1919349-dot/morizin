"use client";

import Link from "next/link";
import { ArrowLeft, Camera, ChevronRight, MoreVertical, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout";
import { BottomNavigation, Button, Card, Input } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";
import { getAnimals } from "@/lib/animalStorage";
import { getAnimalStatusBadgeClass } from "@/lib/animalStatus";
import { type Animal } from "@/types/gibier";

const pageSize = 10;
const maxPageButtons = 5;
const tabs = ["基本情報", "作業履歴", "写真", "トレーサビリティ"];
const filters = ["すべて", "受入済", "精肉済"] as const;
const fiscalYearOptions = [
  { label: "2026年度", value: "2026" },
  { label: "2025年度", value: "2025" },
  { label: "2024年度", value: "2024" },
  { label: "すべて", value: "all" },
] as const;

type AnimalListStatus = "受入済" | "精肉済";
type AnimalListFilter = (typeof filters)[number];
type FiscalYearOption = (typeof fiscalYearOptions)[number]["value"];

type AnimalListQuery = {
  searchText: string;
  statusFilter: AnimalListFilter;
  fiscalYear: FiscalYearOption;
  offset: number;
  limit: number;
};

function uniqueAnimals(animals: Animal[]) {
  return animals.filter((animal, index, array) => array.findIndex((candidate) => candidate.id === animal.id || candidate.animalNumber === animal.animalNumber) === index);
}

function parseDateValue(value?: string) {
  if (!value) return 0;

  const normalized = value.replaceAll("/", "-").replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getNewestTimestamp(animal: Animal) {
  return Math.max(parseDateValue(animal.createdAt), parseDateValue(animal.receivedAt), parseDateValue(animal.capturedAt));
}

function sortAnimalsByNewest(animals: Animal[]) {
  return [...animals].sort((a, b) => getNewestTimestamp(b) - getNewestTimestamp(a) || b.animalNumber.localeCompare(a.animalNumber));
}

function getListStatus(animal: Animal): AnimalListStatus {
  return animal.status === "processed" ? "精肉済" : "受入済";
}

function getSpeciesName(animal: Animal) {
  return animal.species === "deer" ? "ニホンジカ" : "イノシシ";
}

function getSexName(animal: Animal) {
  if (animal.sex === "male") return "オス";
  if (animal.sex === "female") return "メス";
  return "不明";
}

function getFiscalYearTimestampRange(fiscalYear: FiscalYearOption) {
  if (fiscalYear === "all") return null;

  const year = Number(fiscalYear);
  return {
    start: new Date(year, 3, 1).getTime(),
    end: new Date(year + 1, 3, 1).getTime(),
  };
}

function matchesFiscalYear(animal: Animal, fiscalYear: FiscalYearOption) {
  const range = getFiscalYearTimestampRange(fiscalYear);
  if (!range) return true;

  const timestamp = parseDateValue(animal.capturedAt) || parseDateValue(animal.receivedAt) || parseDateValue(animal.createdAt);
  return timestamp >= range.start && timestamp < range.end;
}

function matchesSearch(animal: Animal, searchText: string) {
  const keyword = searchText.trim().toLowerCase();
  if (!keyword) return true;

  return [animal.animalNumber, getSpeciesName(animal), animal.species, animal.captureLocation, animal.hunterName]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword));
}

function createAnimalListQuery(params: {
  searchText: string;
  statusFilter: AnimalListFilter;
  fiscalYear: FiscalYearOption;
  page: number;
}): AnimalListQuery {
  const page = Math.max(1, params.page);

  return {
    searchText: params.searchText,
    statusFilter: params.statusFilter,
    fiscalYear: params.fiscalYear,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}

function queryAnimalList(allAnimals: Animal[], query: AnimalListQuery) {
  const filteredAnimals = sortAnimalsByNewest(uniqueAnimals(allAnimals))
    .filter((animal) => query.statusFilter === "すべて" || getListStatus(animal) === query.statusFilter)
    .filter((animal) => matchesFiscalYear(animal, query.fiscalYear))
    .filter((animal) => matchesSearch(animal, query.searchText));

  return {
    totalCount: filteredAnimals.length,
    items: filteredAnimals.slice(query.offset, query.offset + query.limit),
  };
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const visibleCount = Math.min(maxPageButtons, totalPages);
  const half = Math.floor(visibleCount / 2);
  const start = Math.min(Math.max(1, currentPage - half), Math.max(1, totalPages - visibleCount + 1));

  return Array.from({ length: visibleCount }, (_, index) => start + index);
}

export default function AnimalsPage() {
  const [storedAnimals, setStoredAnimals] = useState<Animal[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<AnimalListFilter>("すべて");
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<FiscalYearOption>("all");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPaginationOpen, setIsPaginationOpen] = useState(false);
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStoredAnimals(getAnimals());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const listQuery = useMemo(
    () =>
      createAnimalListQuery({
        searchText,
        statusFilter: selectedFilter,
        fiscalYear: selectedFiscalYear,
        page: currentPage,
      }),
    [currentPage, searchText, selectedFilter, selectedFiscalYear],
  );
  const { items: pagedAnimals, totalCount } = useMemo(() => queryAnimalList(storedAnimals, listQuery), [listQuery, storedAnimals]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const selectedFiscalYearLabel = fiscalYearOptions.find((option) => option.value === selectedFiscalYear)?.label ?? "すべて";
  const showMoreButton = !isPaginationOpen && totalCount > pageSize;
  const showPagination = isPaginationOpen && totalCount > pageSize;

  function resetPaging() {
    setCurrentPage(1);
    setIsPaginationOpen(false);
  }

  function updateSearchText(value: string) {
    setSearchText(value);
    resetPaging();
  }

  function updateFilter(filter: AnimalListFilter) {
    setSelectedFilter(filter);
    resetPaging();
  }

  function updateFiscalYear(value: FiscalYearOption) {
    setSelectedFiscalYear(value);
    setIsYearMenuOpen(false);
    resetPaging();
  }

  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("animals")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="text-sm font-bold text-[var(--color-primary)]" href="/dashboard">
          <ArrowLeft size={18} />
        </Link>
        <div className="text-center">
          <h1 className="text-base font-bold">個体一覧</h1>
          <p className="mt-0.5 text-[10px] font-bold text-[var(--color-text-muted)]">{selectedFiscalYearLabel}</p>
        </div>
        <div className="relative">
          <Button aria-label="年度メニュー" className="border-0" onClick={() => setIsYearMenuOpen((open) => !open)} variant="icon">
            <MoreVertical size={20} />
          </Button>
          {isYearMenuOpen ? (
            <Card className="absolute right-0 top-12 z-20 grid w-40 gap-1 rounded-xl p-2 shadow-lg">
              {fiscalYearOptions.map((option) => (
                <button
                  className={`min-h-10 rounded-lg px-3 text-left text-xs font-bold ${
                    selectedFiscalYear === option.value ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
                  }`}
                  key={option.value}
                  onClick={() => updateFiscalYear(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </Card>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 text-[var(--color-text-muted)]" size={17} />
          <Input className="pl-9" onChange={(event) => updateSearchText(event.target.value)} placeholder="個体番号・種別で検索" value={searchText} />
        </div>
        <Link className="inline-flex h-11 items-center justify-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-xs font-bold text-white" href="/animals/receive">
          <Plus size={16} />
          受入
        </Link>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex min-w-max gap-2">
          {filters.map((filter) => (
            <button
              className={`min-h-9 rounded-full px-4 text-xs font-bold ${
                selectedFilter === filter ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "border border-[var(--color-border)] bg-white text-[var(--color-text-muted)]"
              }`}
              key={filter}
              onClick={() => updateFilter(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-xs font-bold text-[var(--color-text-muted)]">
        <span>{totalCount}件</span>
        <span>
          {totalCount === 0 ? "0件表示" : `${listQuery.offset + 1}-${listQuery.offset + pagedAnimals.length}件表示`}
        </span>
      </div>

      <section className="grid gap-3">
        {pagedAnimals.length === 0 ? (
          <Card className="grid gap-2 rounded-2xl p-5 text-center shadow-sm">
            <p className="text-sm font-bold">該当する個体がありません</p>
            <p className="text-xs font-semibold text-[var(--color-text-muted)]">検索条件や年度を変更してください。</p>
          </Card>
        ) : null}

        {pagedAnimals.map((animal) => {
          const listStatus = getListStatus(animal);

          return (
            <Card className="grid gap-3 rounded-2xl p-3 shadow-sm" key={animal.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-muted)]">個体識別番号</p>
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{animal.animalNumber}</h2>
                    <span className={getAnimalStatusBadgeClass(animal)}>{listStatus}</span>
                  </div>
                </div>
                <div className="h-16 w-20 overflow-hidden rounded-xl bg-[linear-gradient(135deg,#315f2f,#d8c68f)]">
                  <div className="grid h-full place-items-center text-lg font-bold text-white">{getSpeciesName(animal)}</div>
                </div>
              </div>

              <div className="flex gap-2 border-b border-[var(--color-border)] pb-2">
                {tabs.map((tab, tabIndex) => (
                  <span className={`text-[10px] font-bold ${tabIndex === 0 ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}`} key={tab}>
                    {tab}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <span className="text-[var(--color-text-muted)]">種別</span>
                <strong>{getSpeciesName(animal)} / {getSexName(animal)}</strong>
                <span className="text-[var(--color-text-muted)]">妊娠の有無</span>
                <strong>{animal.pregnancyStatus === "yes" ? "あり" : animal.pregnancyStatus === "no" ? "なし" : "未入力"}</strong>
                <span className="text-[var(--color-text-muted)]">角の有無</span>
                <strong>{animal.antlerStatus || "未入力"}</strong>
                <span className="text-[var(--color-text-muted)]">推定年齢</span>
                <strong>{animal.estimatedAge || "未入力"}</strong>
                <span className="text-[var(--color-text-muted)]">捕獲者</span>
                <strong>{animal.hunterName || "未入力"}</strong>
                <span className="text-[var(--color-text-muted)]">捕獲日</span>
                <strong>{animal.capturedAt || "未入力"}</strong>
                <span className="text-[var(--color-text-muted)]">捕獲場所</span>
                <strong>{animal.captureLocation || "未入力"}</strong>
                <span className="text-[var(--color-text-muted)]">体重</span>
                <strong>{animal.weightKg}kg</strong>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-xs font-bold text-white" href={`/animals/${animal.animalNumber}`}>
                  詳細
                  <ChevronRight size={16} />
                </Link>
                <Button aria-label="写真" variant="icon">
                  <Camera size={18} />
                </Button>
              </div>
            </Card>
          );
        })}
      </section>

      {showMoreButton ? (
        <Button onClick={() => setIsPaginationOpen(true)} size="lg" variant="secondary">
          もっと見る
        </Button>
      ) : null}

      {showPagination ? (
        <div className="grid gap-2 rounded-2xl bg-white p-3 shadow-sm">
          <div className="flex items-center justify-center gap-1">
            <Button disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} size="sm" variant="secondary">
              前へ
            </Button>
            {pageNumbers.map((pageNumber) => (
              <button
                className={`grid h-9 min-w-9 place-items-center rounded-[var(--radius-md)] px-2 text-sm font-bold ${
                  currentPage === pageNumber ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-white text-[var(--color-text)]"
                }`}
                key={pageNumber}
                onClick={() => setCurrentPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <Button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} size="sm" variant="secondary">
              次へ
            </Button>
          </div>
          <p className="text-center text-[10px] font-bold text-[var(--color-text-muted)]">
            {currentPage} / {totalPages}ページ
          </p>
        </div>
      ) : null}
    </AppLayout>
  );
}
