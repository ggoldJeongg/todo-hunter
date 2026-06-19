import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  findUserIdByLoginId: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  getRefreshToken: vi.fn(),
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock("@/application/usecases/auth/SignInUsecase", () => ({
  SignInUsecase: vi.fn().mockImplementation(function () {
    return {
      execute: mocks.signIn,
    };
  }),
}));

vi.mock("@/application/usecases/auth/FindUserIdByLoginIdUsecase", () => ({
  FindUserIdByLoginIdUsecase: vi.fn().mockImplementation(function () {
    return {
      execute: mocks.findUserIdByLoginId,
    };
  }),
}));

vi.mock("@/application/usecases/auth/GenerateAccessTokenUsecase", () => ({
  GenerateAccessTokenUsecase: vi.fn().mockImplementation(function () {
    return {
      execute: mocks.generateAccessToken,
    };
  }),
}));

vi.mock("@/application/usecases/auth/GenerateRefreshTokenUsecase", () => ({
  GenerateRefreshTokenUsecase: vi.fn().mockImplementation(function () {
    return {
      execute: mocks.generateRefreshToken,
    };
  }),
}));

vi.mock("@/infrastructure/repositories/RdAuthenticationRepository", () => ({
  RdAuthenticationRepository: vi.fn().mockImplementation(function () {
    return {
      getRefreshToken: mocks.getRefreshToken,
    };
  }),
}));

vi.mock("@/application/usecases/auth/VerifyPasswordUsecase", () => ({
  VerifyPasswordUsecase: vi.fn(),
}));

vi.mock("@/infrastructure/repositories", () => ({
  PriUserRepository: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/infrastructure/rate-limiter", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
}));

function createSigninRequest() {
  return new NextRequest("http://localhost/api/auth/signin", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      loginId: "hunter",
      password: "password123",
    }),
  });
}

describe("POST /api/auth/signin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      retryAfterSeconds: 0,
    });
    mocks.getClientIp.mockReturnValue("127.0.0.1");
    mocks.signIn.mockResolvedValue({
      id: 1,
      loginId: "hunter",
      nickname: "hunter",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    });
    mocks.findUserIdByLoginId.mockResolvedValue("1");
    mocks.getRefreshToken.mockResolvedValue("existing-refresh-token");
    mocks.generateAccessToken.mockResolvedValue("new-access-token");
    mocks.generateRefreshToken.mockResolvedValue("new-refresh-token");
  });

  it("always issues a new refresh token instead of reusing an existing one", async () => {
    const { POST } = await import("./route");

    const response = await POST(createSigninRequest());

    expect(response.status).toBe(200);
    expect(mocks.getRefreshToken).not.toHaveBeenCalled();
    expect(mocks.generateRefreshToken).toHaveBeenCalledWith({
      id: 1,
      loginId: "hunter",
    });

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("refreshToken=new-refresh-token");
  });
});
