import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyRefreshToken: vi.fn(),
  getRefreshToken: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock("@/application/usecases/auth/VerifyRefreshTokenUsecase", () => ({
  VerifyRefreshTokenUsecase: vi.fn().mockImplementation(function () {
    return {
      execute: mocks.verifyRefreshToken,
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

vi.mock("@/infrastructure/rate-limiter", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
}));

function createRefreshRequest(body: unknown = {}) {
  return new NextRequest("http://localhost/api/auth/refresh", {
    method: "POST",
    headers: {
      cookie: "refreshToken=valid-refresh",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      retryAfterSeconds: 0,
    });
    mocks.getClientIp.mockReturnValue("127.0.0.1");
    mocks.verifyRefreshToken.mockResolvedValue({ id: 1, loginId: "userA" });
    mocks.getRefreshToken.mockResolvedValue("valid-refresh");
    mocks.generateAccessToken.mockResolvedValue("new-access-token");
    mocks.generateRefreshToken.mockResolvedValue("new-refresh-token");
  });

  it("uses the verified refresh token owner instead of spoofable request body identity", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      createRefreshRequest({ id: 999, loginId: "admin", refreshToken: "attacker-token" })
    );

    expect(response.status).toBe(200);
    expect(mocks.verifyRefreshToken).toHaveBeenCalledWith("valid-refresh");
    expect(mocks.generateAccessToken).toHaveBeenCalledWith({
      id: 1,
      loginId: "userA",
    });
    expect(mocks.generateRefreshToken).toHaveBeenCalledWith({
      id: 1,
      loginId: "userA",
    });

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("accessToken=new-access-token");
    expect(setCookie).toContain("refreshToken=new-refresh-token");
  });

  it("rejects a refresh token that does not match the Redis stored token", async () => {
    const { POST } = await import("./route");
    mocks.getRefreshToken.mockResolvedValue("different-refresh");

    const response = await POST(createRefreshRequest());

    expect(response.status).toBe(401);
    expect(mocks.generateAccessToken).not.toHaveBeenCalled();
    expect(mocks.generateRefreshToken).not.toHaveBeenCalled();
  });
});
