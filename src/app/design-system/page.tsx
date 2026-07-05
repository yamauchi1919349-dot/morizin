import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Home,
  Package,
  Plus,
  Settings,
  Truck,
} from "lucide-react";
import { AppLayout } from "@/components/layout";
import {
  Badge,
  BottomNavigation,
  Button,
  Card,
  Checkbox,
  Input,
  PageHeader,
  RadioGroup,
  SectionTitle,
  Select,
  StatCard,
  Textarea,
} from "@/components/ui";

const colors = [
  { name: "メインカラー", value: "#006B35", className: "bg-[var(--color-primary)]" },
  { name: "サブカラー", value: "#DFF3E7", className: "bg-[var(--color-primary-soft)]" },
  { name: "背景色", value: "#F7F8F5", className: "bg-[var(--color-background)]" },
  { name: "カード色", value: "#FFFFFF", className: "bg-white" },
  { name: "ボーダー色", value: "#DDE3DA", className: "bg-[var(--color-border)]" },
  { name: "警告色", value: "#F59E0B", className: "bg-[var(--color-warning)]" },
  { name: "エラー色", value: "#DC2626", className: "bg-[var(--color-danger)]" },
];

const navItems = [
  { label: "ホーム", icon: Home, active: true },
  { label: "記録", icon: ClipboardCheck },
  { label: "在庫", icon: Package },
  { label: "設定", icon: Settings },
];

function DesignSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <SectionTitle title={title} description={description} />
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <AppLayout
      bottomNavigation={<BottomNavigation items={navItems} />}
      header={
        <PageHeader
          action={
            <Button leftIcon={<Plus size={18} />} size="sm">
              新規
            </Button>
          }
          description="Step2で作成した共通UIを並べ、今後の画面制作前に見た目の基準を確認するページです。"
          eyebrow="Step2.5"
          title="Design System"
        />
      }
      className="grid gap-8 py-6"
    >
      <DesignSection title="カラーパレット" description="白背景、濃い緑アクセント、薄い境界線を基準にします。">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {colors.map((color) => (
            <Card className="grid gap-3" key={color.name}>
              <div className={`h-16 rounded-[var(--radius-md)] border border-[var(--color-border)] ${color.className}`} />
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">{color.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{color.value}</p>
              </div>
            </Card>
          ))}
        </div>
      </DesignSection>

      <DesignSection title="タイポグラフィ" description="現場で読みやすいサイズ感と太さを基準にします。">
        <Card className="grid gap-4">
          <div>
            <p className="text-3xl font-bold text-[var(--color-text)]">大見出し 森zin</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Page title / 主要画面タイトル</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--color-text)]">中見出し 個体管理</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Section title / 一覧や詳細の見出し</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--color-text)]">小見出し 衛生記録</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Card title / カード内の見出し</p>
          </div>
          <p className="text-base leading-7 text-[var(--color-text)]">本文はスマホでも読みやすい行間で、入力内容や説明文を自然に確認できます。</p>
          <p className="text-sm text-[var(--color-text-muted)]">補助テキストは入力の補足や状態説明に使用します。</p>
          <p className="text-xs font-semibold text-[var(--color-text-subtle)]">キャプション / 2026.06.27</p>
        </Card>
      </DesignSection>

      <DesignSection title="ボタン一覧" description="大きめのタッチ領域と明確な状態差を持たせます。">
        <Card className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="text">Text</Button>
          <Button disabled>Disabled</Button>
          <Button aria-label="通知" variant="icon">
            <Bell size={20} />
          </Button>
        </Card>
      </DesignSection>

      <DesignSection title="カード一覧" description="通常カード、クリック可能カード、情報カード、PDFカード、統計カードを確認します。">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <p className="text-sm font-bold">通常カード</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">基本情報や説明をまとめる標準カードです。</p>
          </Card>
          <Card className="flex items-center justify-between gap-3" variant="clickable">
            <div>
              <p className="text-sm font-bold">クリック可能カード</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">一覧から詳細へ進む想定です。</p>
            </div>
            <ChevronRight size={20} />
          </Card>
          <Card variant="info">
            <p className="text-sm font-bold text-[var(--color-primary-dark)]">情報カード</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">補足や完了状態を穏やかに表示します。</p>
          </Card>
          <Card className="min-h-32" variant="pdf">
            <div className="flex items-start gap-3">
              <FileText className="text-[var(--color-primary)]" size={24} />
              <div>
                <p className="text-sm font-bold">PDFカード想定</p>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">帳票テンプレートの見た目確認用です。</p>
              </div>
            </div>
          </Card>
          <StatCard icon={<Package size={24} />} label="統計カード" value="18kg" />
        </div>
      </DesignSection>

      <DesignSection title="フォーム部品" description="入力は選択式、チェック式を中心に組み合わせられる状態にします。">
        <Card className="grid gap-4 lg:grid-cols-2">
          <Input helperText="例: 126046" label="Input" placeholder="個体番号" />
          <Select defaultValue="deer" helperText="選択式入力の基本形です。" label="Select">
            <option value="deer">鹿</option>
            <option value="boar">猪</option>
            <option value="other">その他</option>
          </Select>
          <Textarea className="lg:col-span-2" helperText="現場メモや備考に使用します。" label="Textarea" placeholder="備考を入力" />
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">Checkbox</p>
            <Checkbox defaultChecked description="チェック式で素早く記録できます。" label="確認済み" />
            <Checkbox description="未確認の項目も同じ見た目です。" label="再確認が必要" />
          </div>
          <RadioGroup
            label="RadioGroup"
            name="sample-method"
            options={[
              { label: "ワナ", value: "trap", description: "捕獲方法の選択例" },
              { label: "銃", value: "gun", description: "現場入力で迷わない並び" },
            ]}
            defaultValue="trap"
          />
        </Card>
      </DesignSection>

      <DesignSection title="Badge" description="状態が一目で分かる短いラベルです。">
        <Card className="flex flex-wrap gap-2">
          <Badge variant="success">完了</Badge>
          <Badge variant="muted">未実施</Badge>
          <Badge>進行中</Badge>
          <Badge variant="warning">注意</Badge>
          <Badge variant="danger">エラー</Badge>
        </Card>
      </DesignSection>

      <DesignSection title="ナビゲーション" description="PageHeader、BottomNavigation、AppLayout の組み合わせ確認です。">
        <Card className="grid gap-4">
          <PageHeader
            action={<Button variant="secondary">操作</Button>}
            description="ヘッダーは画面の目的と主要操作をまとめます。"
            eyebrow="Navigation"
            title="PageHeader"
          />
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-background)] p-4 text-sm text-[var(--color-text-muted)]">
            このページ全体が AppLayout で構成されています。スマホ幅では画面下部に BottomNavigation が固定表示されます。
          </div>
        </Card>
      </DesignSection>

      <DesignSection title="スマホ画面サンプル" description="本実装ではなく、カード密度と導線の見た目を確認するための簡易サンプルです。">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="mx-auto grid w-full max-w-sm gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[var(--color-primary)]">Sample</p>
                <h3 className="text-xl font-bold">ダッシュボード風</h3>
              </div>
              <Badge variant="success">本日</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<CheckCircle2 size={22} />} label="受入" tone="success" value="3頭" />
              <StatCard icon={<AlertTriangle size={22} />} label="未確認" tone="warning" value="1件" />
            </div>
            <Card variant="info">
              <p className="text-sm font-bold">今日の記録状況</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">衛生記録と在庫確認のステータスを見やすく並べる想定です。</p>
            </Card>
          </Card>

          <Card className="mx-auto grid w-full max-w-sm gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[var(--color-primary)]">Sample</p>
                <h3 className="text-xl font-bold">個体詳細風</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">個体番号 126046</p>
              </div>
              <Badge>処理中</Badge>
            </div>
            <div className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-[var(--color-text-muted)]">種類</span>
                <strong>鹿</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--color-text-muted)]">重量</span>
                <strong>53.2kg</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[var(--color-text-muted)]">写真</span>
                <span className="inline-flex items-center gap-1 text-[var(--color-primary)]">
                  <Camera size={16} />
                  登録済み
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <Button leftIcon={<FileText size={18} />}>個体カルテPDF</Button>
              <Button leftIcon={<Truck size={18} />} variant="secondary">
                トレーサビリティPDF
              </Button>
            </div>
          </Card>
        </div>
      </DesignSection>
    </AppLayout>
  );
}
