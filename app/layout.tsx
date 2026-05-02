import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@hackernoon/pixel-icon-library/fonts/iconfont.css";
import NavigationWrapper from "@/components/common/NavigationWrapper"; // 클라이언트 전용 네비게이션
import ContextMenuGuard from "@/components/common/ContextMenuGuard";
import { Toaster } from "@/components/common";
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata: Metadata = {
  title: {
    default: "투두헌터", // Google 검색에서 보이는 타이틀
    template: "%s | TODO HUNTER", // 서브 페이지에 타이틀 추가 시
  },
  applicationName: "TODO HUNTER",
  description: "TODO HUNTER의 공식 웹사이트입니다.",
  keywords: ["투두헌터", "TODO-HUNTER", "투두리스트", "게임형 투두리스트", "TODO", "일정관리"],
  openGraph: {
    title: "TODO HUNTER - 일상의 모험을 시작하세요!",
    description: "TODO HUNTER의 공식 웹사이트입니다.",
    url: "https://todo-hunter.com",
    siteName: "TODO HUNTER",
    type: "website",
  },
  manifest: "/manifest.json",
  // 아이콘은 app/icon.png, app/apple-icon.png 가 자동으로 link 태그를 주입함
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      {/* suppressHydrationWarning: 브라우저 확장(ColorZilla, Grammarly, Dark Reader 등)이
          body 에 attribute 를 주입해 발생하는 가짜 hydration mismatch 무시 */}
      <body className={"antialiased"} suppressHydrationWarning>
        <ContextMenuGuard />
        <div className="max-w-[430px] mx-auto min-h-screen bg-white flex flex-col relative shadow-xl">
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <Toaster position="top-center" />
          <NavigationWrapper /> {/* 클라이언트 전용 네비게이션 */}
        </div>
          {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_GA_ID && (
            <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
          )}  
      </body>
    </html>
  );
}
