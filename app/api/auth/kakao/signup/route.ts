import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GenerateAccessTokenUsecase } from "@/application/usecases/auth/GenerateAccessTokenUsecase";
import { GenerateRefreshTokenUsecase } from "@/application/usecases/auth/GenerateRefreshTokenUsecase";
import { RdAuthenticationRepository } from "@/infrastructure/repositories/RdAuthenticationRepository";
import { checkRateLimit, getClientIp } from "@/infrastructure/rate-limiter";

const KAKAO_SIGNUP_RATE_LIMIT = { maxRequests: 3, windowSeconds: 60 };

export async function POST(req: NextRequest) {
  try {
    // Rate Limiting
    const clientIp = getClientIp(req.headers);
    const rateLimit = await checkRateLimit(
      `kakao-signup:${clientIp}`,
      KAKAO_SIGNUP_RATE_LIMIT.maxRequests,
      KAKAO_SIGNUP_RATE_LIMIT.windowSeconds
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    // kakao_pending 쿠키에서 카카오 데이터 읽기
    const pendingCookie = req.cookies.get("kakao_pending")?.value;
    if (!pendingCookie) {
      return NextResponse.json(
        { error: "카카오 인증 정보가 만료되었습니다. 다시 로그인해주세요." },
        { status: 400 }
      );
    }

    const { kakaoId, kakaoEmail } = JSON.parse(pendingCookie);
    if (!kakaoId || !kakaoEmail) {
      return NextResponse.json(
        { error: "카카오 인증 정보가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    // 요청 body에서 닉네임 받기
    const { nickname } = await req.json();
    if (!nickname || typeof nickname !== "string" || nickname.trim().length === 0) {
      return NextResponse.json(
        { error: "닉네임을 입력해주세요." },
        { status: 400 }
      );
    }

    // 이미 가입된 사용자인지 재확인
    const existingUser = await prisma.user.findUnique({
      where: { providerId: kakaoId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 가입된 사용자입니다." },
        { status: 409 }
      );
    }

    // 유저 + 캐릭터 + 스테이터스 생성
    const user = await prisma.user.create({
      data: {
        loginId: `kakao_${kakaoId}`,
        email: kakaoEmail,
        password: null,
        nickname: nickname.trim(),
        provider: "kakao",
        providerId: kakaoId,
        characters: {
          create: {
            endingState: 0,
            status: {
              create: {
                str: 0,
                int: 0,
                emo: 0,
                fin: 0,
                liv: 0,
              },
            },
          },
        },
      },
    });

    // JWT 토큰 발급
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

    // 응답 + 쿠키 설정
    const response = NextResponse.json({ message: "가입 성공" }, { status: 201 });

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: parseInt((process.env.ACCESS_TOKEN_EXPIRES || "3600").replace("s", ""), 10),
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: parseInt((process.env.REFRESH_TOKEN_EXPIRES || "3600").replace("s", ""), 10),
    });

    // 사용 완료된 kakao_pending 쿠키 삭제
    response.cookies.delete("kakao_pending");

    return response;
  } catch (error) {
    console.error("카카오 가입 오류:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
