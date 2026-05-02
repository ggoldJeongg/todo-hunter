import { CheckResetPasswordCodeUsecase } from "@/application/usecases/auth/CheckResetPasswordCodeUsecase";
import { RdVerificationRepository } from "@/infrastructure/repositories/RdVerificationRepository";
import { VerifyCodeError } from "@/application/usecases/auth/errors/VerifyCodeError";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/infrastructure/rate-limiter";

const VERIFY_RATE_LIMIT = { maxRequests: 5, windowSeconds: 300 };

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);
    const rateLimit = await checkRateLimit(
      `verify-reset-code:${clientIp}`,
      VERIFY_RATE_LIMIT.maxRequests,
      VERIFY_RATE_LIMIT.windowSeconds
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "인증 시도가 너무 많습니다. 5분 후 다시 시도해주세요." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { email, verificationCode } = await req.json();

    if (!email || !verificationCode) {
      return NextResponse.json(
        { error: "이메일과 인증 코드를 입력해야합니다." },
        { status: 400 }
      );
    }

    const verificationRepository = new RdVerificationRepository();
    const checkCodeUsecase = new CheckResetPasswordCodeUsecase(verificationRepository);

    const isValid = await checkCodeUsecase.execute(email, verificationCode);

    if (isValid) {
      return NextResponse.json(
        { message: "인증이 완료되었습니다.", isVerified: true },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "인증 코드가 잘못되었습니다.", isVerified: false },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof VerifyCodeError) {
      const status = error.type === "EXPIRED_CODE" ? 410 : 400;
      return NextResponse.json(
        { error: error.message, isVerified: false },
        { status }
      );
    }
    console.error("Reset password code verify error:", error);
    return NextResponse.json({ error: "서버 오류 발생" }, { status: 500 });
  }
}
