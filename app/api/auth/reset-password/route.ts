import { ResetPasswordUsecase } from "@/application/usecases/auth/ResetPasswordUsecase";
import { VerifyCodeError } from "@/application/usecases/auth/errors/VerifyCodeError";
import { PriUserRepository } from "@/infrastructure/repositories/PriUserRepository";
import { RdAuthenticationRepository } from "@/infrastructure/repositories/RdAuthenticationRepository";
import { RdVerificationRepository } from "@/infrastructure/repositories/RdVerificationRepository";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/infrastructure/rate-limiter";

const RESET_RATE_LIMIT = { maxRequests: 5, windowSeconds: 300 };

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req.headers);
  const rateLimit = await checkRateLimit(
    `reset-password:${clientIp}`,
    RESET_RATE_LIMIT.maxRequests,
    RESET_RATE_LIMIT.windowSeconds
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const { loginId, email, verificationCode, newPassword } = await req.json();

    if (!loginId || !email || !verificationCode || !newPassword) {
      return NextResponse.json(
        { error: "필수 값이 누락되었습니다." },
        { status: 400 }
      );
    }

    const userRepository = new PriUserRepository(prisma);
    const verificationRepository = new RdVerificationRepository();
    const authenticationRepository = new RdAuthenticationRepository();
    const resetPasswordUsecase = new ResetPasswordUsecase(
      userRepository,
      verificationRepository,
      authenticationRepository
    );

    await resetPasswordUsecase.execute(loginId, email, verificationCode, newPassword);

    return NextResponse.json(
      { message: "비밀번호가 변경되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof VerifyCodeError) {
      const status = error.type === "EXPIRED_CODE" ? 410 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
