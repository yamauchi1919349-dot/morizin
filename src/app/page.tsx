import Link from "next/link";
import Image from "next/image";

const links = [
  { label: "ログインへ", href: "/login", primary: true },
  { label: "ホーム画面へ", href: "/dashboard" },
  { label: "デザインシステム", href: "/design-system" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <p className="mb-3 text-sm font-semibold text-[var(--color-primary)]">ジビエ個体管理アプリ</p>
        <div className="flex items-center gap-4">
          <Image alt="森zin" className="rounded-3xl" height={64} src="/images/brand/morizin-icon.png" width={64} />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">森zin</h1>
        </div>
        <p className="mt-6 text-lg leading-8 text-[var(--color-text-muted)]">UI土台作成中の初期プロジェクトです。</p>
        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
          <p className="text-sm font-semibold text-[var(--color-primary-dark)]">Step3: 画面遷移の土台</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {links.map((link) => (
              <Link
                className={
                  link.primary
                    ? "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition-[var(--transition-base)] hover:bg-[var(--color-primary-dark)]"
                    : "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-text)] transition-[var(--transition-base)] hover:bg-[var(--color-surface-muted)]"
                }
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
