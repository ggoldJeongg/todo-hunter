import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyRefreshToken: vi.fn(),
  deleteRefreshToken: vi.fn(),
}));

vi.mock("@/application/usecases/auth/VerifyRefreshTokenUsecase", () => ({
  VerifyRefreshTokenUsecase: vi.fn().mockImplementation(function () {
    return {
      execute: mocks.verifyRefreshToken,
    };
  }),
}));

vi.mock("@/infrastructure/repositories/RdAuthenticationRepository", () => ({
  RdAuthenticationRepository: vi.fn().mockImplementation(function () {
    return {
      deleteRefreshToken: mocks.deleteRefreshToken,
    };
  }),
}));

function createSignoutRequest(cookie = "refreshToken=valid-refresh") {
  return new NextRequest("http://localhost/api/auth/signout", {
    method: "POST",
    headers: {
      cookie,
    },
  });
}

describe("POST /api/auth/signout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyRefreshToken.mockResolvedValue({ id: 1, loginId: "hunter" });
    mocks.deleteRefreshToken.mockResolvedValue(undefined);
  });

  it("revokes the stored refresh token for the verified token owner", async () => {
    const { POST } = await import("./route");

    const response = await POST(createSignoutRequest());

    expect(response.status).toBe(200);
    expect(mocks.verifyRefreshToken).toHaveBeenCalledWith("valid-refresh");
    expect(mocks.deleteRefreshToken).toHaveBeenCalledWith("hunter");
  });

  it("expires access and refresh cookies on logout", async () => {
    const { POST } = await import("./route");

    const response = await POST(createSignoutRequest());
    const setCookie = response.headers.get("set-cookie");

    expect(setCookie).toContain("accessToken=");
    expect(setCookie).toContain("refreshToken=");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });
});
