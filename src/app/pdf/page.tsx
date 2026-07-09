import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Badge, BottomNavigation, Card } from "@/components/ui";
import { createAppNavigationItems } from "@/constants/appNavigation";

export default function PdfPage() {
  return (
    <AppLayout bottomNavigation={<BottomNavigation items={createAppNavigationItems("pdf")} />} className="mx-auto grid max-w-md gap-3 py-4">
      <header className="flex items-center justify-between">
        <Link className="text-sm font-bold text-[var(--color-primary)]" href="/dashboard">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-bold">個体カルテPDF</h1>
        <Badge className="bg-purple-100 text-purple-700">PDF</Badge>
      </header>

      <Card className="grid gap-4 rounded-2xl border-purple-200 p-4 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-purple-100 text-purple-700">
          <FileText size={26} />
        </div>
        <div className="grid gap-2">
          <p className="text-lg font-bold">出力する個体を選択してください</p>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">
            個体を新規登録すると、個体詳細画面からカルテPDFとトレーサビリティPDFを出力できます。
          </p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-bold text-white" href="/animals">
          個体一覧へ
        </Link>
      </Card>
    </AppLayout>
  );
}
