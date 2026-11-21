import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hong Kong Trip 2026 · 홍콩 여행 플래너",
  description: "2026년 12월 1일~5일 홍콩 4박 5일 인터랙티브 여행 플래너",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "HK Trip", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#FBF8F2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
