import { NextResponse, NextRequest } from "next/server";
import { getUserFromCookie } from "@/utils/auth";

// 공개 경로 (인증 불필요) — Fail-safe default: 이 Set에 없으면 모두 인증 필수
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/signin",
  "/signup",
  "/findid",
]);

// 차단 경로 (사용 중단된 페이지)
const BLOCKED_PATHS = new Set<string>([
  "/beginning",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 차단 경로: 루트로 리다이렉트
  if (BLOCKED_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 토큰 검증 (+ 만료 시 자동 갱신)
  const { user, response: refreshedResponse } = await getUserFromCookie(request);

  // 공개 경로 처리
  if (PUBLIC_PATHS.has(pathname)) {
    // 이미 로그인된 사용자는 게임으로 리다이렉트
    if (user) {
      return NextResponse.redirect(new URL("/play/character", request.url));
    }

    // 미로그인 사용자: 토큰 상태를 헤더로 노출 (랜딩 페이지 useEffect에서 사용)
    const hasAccessToken = !!request.cookies.get("accessToken");
    const hasRefreshToken = !!request.cookies.get("refreshToken");
    const response = refreshedResponse ?? NextResponse.next();
    response.headers.set("X-Has-AccessToken", String(hasAccessToken));
    response.headers.set("X-Has-RefreshToken", String(hasRefreshToken));
    return response;
  }

  // 보호 경로: 인증 필수
  if (!user) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  // 인증된 사용자 통과 (토큰 갱신된 경우 새 쿠키 포함한 응답 반환)
  return refreshedResponse ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|endings/|titles/|fonts/|icons/|images/|js/|manifest.json).*)"],
};
