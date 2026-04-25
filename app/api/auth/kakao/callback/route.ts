import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GenerateAccessTokenUsecase } from "@/application/usecases/auth/GenerateAccessTokenUsecase";
import { GenerateRefreshTokenUsecase } from "@/application/usecases/auth/GenerateRefreshTokenUsecase";
import { RdAuthenticationRepository } from "@/infrastructure/repositories/RdAuthenticationRepository";

export async function GET(req: NextRequest) {
  // 프록시 뒤에서는 req.url이 내부 URL(localhost)로 잡히므로 환경변수 기반 절대 URL 사용
  const baseUrl = process.env.DEFAULT_API_URL || new URL(req.url).origin;

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(new URL("/signin?error=no_code", baseUrl));
    }

    // CSRF 검증: 쿠키에 저장된 state와 콜백의 state 비교
    const savedState = req.cookies.get("kakao_oauth_state")?.value;

    if (!state || !savedState || state !== savedState) {
      return NextResponse.redirect(new URL("/signin?error=invalid_state", baseUrl));
    }

    // 1. 인가 코드로 카카오 액세스 토큰 발급
    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_REST_API_KEY!,
        client_secret: process.env.KAKAO_CLIENT_SECRET!,
        redirect_uri: process.env.KAKAO_REDIRECT_URI!,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/signin?error=token_failed", baseUrl));
    }

    // 2. 카카오 사용자 정보 조회
    const userResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const kakaoUser = await userResponse.json();
    const kakaoId = String(kakaoUser.id);
    const kakaoNickname = kakaoUser.properties?.nickname || "헌터";
    const kakaoEmail = kakaoUser.kakao_account?.email || `kakao_${kakaoId}@todohunter.local`;

    // 사용 완료된 CSRF state 쿠키 삭제
    const deleteCsrfCookie = (res: NextResponse) => {
      res.cookies.delete("kakao_oauth_state");
    };

    // 3. DB에서 기존 카카오 사용자 조회
    const user = await prisma.user.findUnique({
      where: { providerId: kakaoId },
    });

    if (!user) {
      // 신규 사용자: 닉네임 입력을 위해 signup 페이지로 리다이렉트
      const response = NextResponse.redirect(new URL("/signup?provider=kakao", baseUrl));

      // 카카오 데이터를 HttpOnly 쿠키에 임시 저장 (5분 만료)
      response.cookies.set("kakao_pending", JSON.stringify({
        kakaoId,
        kakaoEmail,
        kakaoNickname,
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
        maxAge: 300,
      });

      deleteCsrfCookie(response);
      return response;
    }

    // 기존 사용자: 바로 로그인 처리
    // 4. JWT 토큰 발급 (기존 시스템 활용)
    const generateAccessToken = new GenerateAccessTokenUsecase();
    const generateRefreshToken = new GenerateRefreshTokenUsecase(new RdAuthenticationRepository());

    const accessToken = await generateAccessToken.execute({
      id: user.id,
      loginId: user.loginId,
    });

    const refreshToken = await generateRefreshToken.execute({
      id: user.id,
      loginId: user.loginId,
    });

    // 5. 쿠키 설정 후 캐릭터 페이지로 리다이렉트
    const response = NextResponse.redirect(new URL("/play/character", baseUrl));

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
      maxAge: parseInt((process.env.ACCESS_TOKEN_EXPIRES || "3600").replace("s", ""), 10),
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
      maxAge: parseInt((process.env.REFRESH_TOKEN_EXPIRES || "3600").replace("s", ""), 10),
    });

    deleteCsrfCookie(response);

    return response;
  } catch (error) {
    console.error("카카오 로그인 오류:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.redirect(new URL("/signin?error=kakao_failed", baseUrl));
  }
}
