import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkVerifyCode: vi.fn(),
  deleteVerifyCode: vi.fn(),
  getVerificationCodeExpiration: vi.fn(),
  saveSignupVerifiedEmail: vi.fn(),
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock("@/application/usecases/auth/CheckVerifyCodeUsecase", () => ({
  CheckVerifyCodeUsecase: vi.fn().mockImplementation(function () {
    return {
      execute: mocks.checkVerifyCode,
    };
  }),
}));

vi.mock("@/application/usecases/auth/DeleteVerifyCodeUsecase", () => ({
  DeleteVerifyCodeUsecase: vi.fn().mockImplementation(function () {
    return {
      execute: mocks.deleteVerifyCode,
    };
  }),
}));

vi.mock("@/infrastructure/repositories/RdVerificationRepository", () => ({
  RdVerificationRepository: vi.fn().mockImplementation(function () {
    return {
      getVerificationCodeExpiration: mocks.getVerificationCodeExpiration,
      saveSignupVerifiedEmail: mocks.saveSignupVerifiedEmail,
    };
  }),
}));

vi.mock("@/infrastructure/rate-limiter", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
}));

function createVerifyRequest() {
  return new NextRequest("http://localhost/api/auth/check-verify-code", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: "hunter@example.com",
      verificationCode: "123456",
    }),
  });
}

describe("POST /api/auth/check-verify-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      retryAfterSeconds: 0,
    });
    mocks.getClientIp.mockReturnValue("127.0.0.1");
    mocks.checkVerifyCode.mockResolvedValue(true);
    mocks.deleteVerifyCode.mockResolvedValue(undefined);
    mocks.getVerificationCodeExpiration.mockResolvedValue(Date.now() + 60_000);
    mocks.saveSignupVerifiedEmail.mockResolvedValue(undefined);
  });

  it("stores a short-lived signup verification state when email code verification succeeds", async () => {
    const { POST } = await import("./route");

    const response = await POST(createVerifyRequest());

    expect(response.status).toBe(200);
    expect(mocks.saveSignupVerifiedEmail).toHaveBeenCalledWith("hunter@example.com", 600);
    expect(mocks.deleteVerifyCode).toHaveBeenCalledWith("hunter@example.com");
  });
});
