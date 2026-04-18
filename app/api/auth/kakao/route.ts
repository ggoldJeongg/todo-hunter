import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { checkRateLimit, getClientIp } from "@/infrastructure/rate-limiter";

// 카카오 로그인: 같은 IP에서 60초 내 최대 5회
const KAKAO_RATE_LIMIT = { maxRequests: 5, windowSeconds: 60 };

// 카카오 로그인 페이지로 리다이렉트
export async function GET(req: NextRequest) {
  // Rate Limiting 검사
  const clientIp = getClientIp(req.headers);
  const rateLimit = await checkRateLimit(
    `kakao:${clientIp}`,
    KAKAO_RATE_LIMIT.maxRequests,
    KAKAO_RATE_LIMIT.windowSeconds
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }
  // CSRF 방지를 위한 state 토큰 생성
  const state = crypto.randomBytes(32).toString("hex");

  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(process.env.KAKAO_REDIRECT_URI!)}&response_type=code&state=${state}`;

  const response = NextResponse.redirect(kakaoAuthUrl);

  // state 값을 HttpOnly 쿠키에 저장 (콜백에서 검증용)
  response.cookies.set("kakao_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10분 후 만료
    sameSite: "lax",
  });

  return response;
}
