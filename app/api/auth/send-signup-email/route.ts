import { GenerateVerifyCodeUsecase } from "@/application/usecases/auth/GenerateVerifyCodeUsecase";
import { SendSignUpEmailUsecase } from "@/application/usecases/auth/SendSignUpEmailUsecase";

import { RdVerificationRepository } from "@/infrastructure/repositories/RdVerificationRepository";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/infrastructure/rate-limiter";
import { normalizeEmail } from "@/utils/validation";

const EMAIL_RATE_LIMIT = { maxRequests: 3, windowSeconds: 120 };

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req.headers);
  const rateLimit = await checkRateLimit(
    `send-email:${clientIp}`,
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
    const { email: rawEmail } = await req.json();

    if (!rawEmail || typeof rawEmail !== "string") {
      // 입력 에러 시
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 인증/가입과 동일한 정규화로 Redis 키 일치 보장
    const email = normalizeEmail(rawEmail);

    // Infrastructure Layer DI 의존성 주입
    const generateVerifyCodeUsecase = new GenerateVerifyCodeUsecase();
    const verificationRepository = new RdVerificationRepository();

    const sendSignUpEmailUsecase = new SendSignUpEmailUsecase(
      generateVerifyCodeUsecase,
      verificationRepository
    );

    //usecase 실행
    await sendSignUpEmailUsecase.execute(email);

    // 성공 시 확인 메시지
    return NextResponse.json(
      { message: "Email sent successfully." },
      { status: 200 }
    );
  } catch (error) {
    // server에러 코드 및 메시지
    console.error("Email send Error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
