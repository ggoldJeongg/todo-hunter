import { NextResponse, NextRequest } from "next/server";
import { getUserFromCookie } from "@/utils/auth";

// 인증 페이지 — 이미 로그인된 유저는 게임으로 리다이렉트
const AUTH_REDIRECT_PATHS = new Set<string>([
  "/",
  "/signin",
  "/signup",
  "/findid",
]);

// 누구나 접근 가능한 정적 정보 페이지 (로그인 여부와 무관)
const OPEN_PATHS = new Set<string>([
  "/terms",
  "/privacy",
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

  // 누구나 열람 가능한 페이지: 통과
  if (OPEN_PATHS.has(pathname)) {
    return refreshedResponse ?? NextResponse.next();
  }

  // 인증 페이지: 로그인 유저는 게임으로, 비로그인 유저는 토큰 상태 헤더 노출
  if (AUTH_REDIRECT_PATHS.has(pathname)) {
    if (user) {
      return NextResponse.redirect(new URL("/play/character", request.url));
    }

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
