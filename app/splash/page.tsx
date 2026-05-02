// PWA 진입용 splash 라우트.
// manifest.json 의 start_url 이 /splash 라 PWA 실행 시 가장 먼저 보임.
// server component 에서 쿠키만 빠르게 보고 다음 경로 결정 → client 에서 1.5초 splash UI 보여준 뒤 redirect.
import { cookies } from "next/headers";
import SplashView from "./SplashView";

export const dynamic = "force-dynamic";

export default async function SplashPage() {
  const cookieStore = await cookies();
  const hasToken =
    !!cookieStore.get("accessToken") || !!cookieStore.get("refreshToken");
  // 토큰이 있으면 게임으로, 없으면 시작 화면으로.
  // (만료된 토큰은 /play/character 진입 시 미들웨어가 재처리)
  const nextPath = hasToken ? "/play/character" : "/";
  return <SplashView nextPath={nextPath} />;
}
