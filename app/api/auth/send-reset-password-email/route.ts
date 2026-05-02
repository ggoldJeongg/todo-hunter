import { GenerateVerifyCodeUsecase } from "@/application/usecases/auth/GenerateVerifyCodeUsecase";
import { SendResetPasswordEmailUsecase } from "@/application/usecases/auth/SendResetPasswordEmailUsecase";
import { PriUserRepository } from "@/infrastructure/repositories/PriUserRepository";
import { RdVerificationRepository } from "@/infrastructure/repositories/RdVerificationRepository";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/infrastructure/rate-limiter";

const EMAIL_RATE_LIMIT = { maxRequests: 3, windowSeconds: 120 };

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req.headers);
  const rateLimit = await checkRateLimit(
    `send-reset-email:${clientIp}`,
    EMAIL_RATE_LIMIT.maxRequests,
    EMAIL_RATE_LIMIT.windowSeconds
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "이메일 발송 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const { loginId, email } = await req.json();

    if (!loginId || !email) {
      return NextResponse.json(
        { error: "아이디와 이메일을 입력해주세요." },
        { status: 400 }
      );
    }

    const userRepository = new PriUserRepository(prisma);
    const generateVerifyCodeUsecase = new GenerateVerifyCodeUsecase();
    const verificationRepository = new RdVerificationRepository();

    const sendResetPasswordEmailUsecase = new SendResetPasswordEmailUsecase(
      userRepository,
      generateVerifyCodeUsecase,
      verificationRepository,
    );

    await sendResetPasswordEmailUsecase.execute(loginId, email);

    // 유저 존재 여부와 무관하게 동일 응답 (열거 공격 방지)
    return NextResponse.json(
      { message: "입력하신 이메일로 인증코드가 발송되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password email send error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
