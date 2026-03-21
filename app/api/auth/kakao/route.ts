import { NextResponse } from "next/server";

// 카카오 로그인 페이지로 리다이렉트
export async function GET() {
  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_REST_API_KEY}&redirect_uri=${encodeURIComponent(process.env.KAKAO_REDIRECT_URI!)}&response_type=code`;

  return NextResponse.redirect(kakaoAuthUrl);
}
