import type { Metadata } from "next";
import { AuthProviderBoundary } from "@/lib/auth/AuthProviderBoundary";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gibier.arcnest.jp";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "森zin",
  description: "ジビエ個体管理アプリ",
  manifest: "/manifest.json",
  icons: {
    icon: "/images/brand/morizin-icon.png",
    shortcut: "/images/brand/morizin-icon.png",
    apple: "/images/brand/morizin-icon.png",
  },
  openGraph: {
    title: "森zin",
    images: ["/images/brand/morizin-icon.png"],
  },
  twitter: {
    card: "summary",
    title: "森zin",
    images: ["/images/brand/morizin-icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AuthProviderBoundary>{children}</AuthProviderBoundary>
      </body>
    </html>
  );
}
