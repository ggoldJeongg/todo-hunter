import { NextResponse, NextRequest } from "next/server";
import { getUserFromCookie } from "@/utils/auth";
import { decodeJwt } from "jose";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // '/play' 및 '/signin' 경로를 미들웨어가 처리하지 않도록 제외
  if (pathname === "/signin"
    || pathname === "/signup"
    || pathname === "/findid"
    || pathname.startsWith("/play")) {
    return NextResponse.next();
  }

  // '/beginning' 접근 차단 — 랜딩 페이지로 리다이렉트
  if (pathname === "/beginning") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { user } = await getUserFromCookie(request);
  
  // 쿠키로부터 accessToken과 refreshToken 값 저장
  const accessToken = request.cookies.get("accessToken");
  const refreshToken = request.cookies.get("refreshToken");
  // 쿠키로부터 accessToken과 refreshToken 존재 여부 확인
  const hasAccessToken = request.cookies.get("accessToken") ? true : false;
  const hasRefreshToken = request.cookies.get("refreshToken") ? true : false;

  const response = NextResponse.next();

  if (user) {
    // accessToken이 유효한 경우 /play/character로 리다이렉트
    if (accessToken && pathname !== "/play/character") {
      return NextResponse.redirect(new URL("/play/character", request.url));
    }
    return NextResponse.next();
  } else if (!accessToken && refreshToken) {
    // refreshToken만 존재하고 accessToken이 없는 경우 루트로 리다이렉트

    try {
      const decoded = decodeJwt(refreshToken.value) as { id?: string; loginId?: string };

      // accessToken 존재 여부 헤더 설정
      response.headers.set("X-Has-AccessToken", String(hasAccessToken));
      // refreshToken 존재 여부 헤더 설정
      response.headers.set("X-Has-RefreshToken", String(hasRefreshToken));
      
      // refreshToken 값 자체를 헤더에 설정
      response.headers.set("X-RefreshToken", refreshToken.value);

      // 디코드된 객체에서 id와 loginId를 헤더에 설정
      if (decoded?.id) {
        response.headers.set("X-Id", decoded.id);
      }
      if (decoded?.loginId) {
        response.headers.set("X-LoginId", decoded.loginId);
      }
    } catch {
      // 디코드 실패 시 기본 응답 반환
      return NextResponse.next();
    }
  } else {
    response.headers.set("X-Has-AccessToken", String(hasAccessToken));
    response.headers.set("X-Has-RefreshToken", String(hasRefreshToken));
  }

  // 응답 내용을 클라이언트로 반환
  return response;

  // 인증되지 않은 경우 그대로 진행 (클라이언트에서 처리)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|endings/|titles/|fonts/|icons/|images/|js/|manifest.json).*)"], // _next, /api, /icons, /images 경로 제외, /mainfest.json 예외 처리
};
