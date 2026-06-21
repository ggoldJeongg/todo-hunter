import { decodeJwt } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GenerateRefreshTokenUsecase } from "./GenerateRefreshTokenUsecase";

describe("GenerateRefreshTokenUsecase", () => {
  const repository = {
    saveRefreshToken: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret-that-is-long-enough";
    process.env.REFRESH_TOKEN_EXPIRES = "1h";
    repository.saveRefreshToken.mockResolvedValue(undefined);
  });

  it("persists a newly generated refresh token for the user", async () => {
    const usecase = new GenerateRefreshTokenUsecase(repository as never);

    const token = await usecase.execute({ id: 1, loginId: "hunter" });

    expect(repository.saveRefreshToken).toHaveBeenCalledWith("hunter", token);
    expect(decodeJwt(token)).toMatchObject({
      id: 1,
      loginId: "hunter",
    });
  });

  it("generates a distinct token each time so rotation invalidates the previous value", async () => {
    const usecase = new GenerateRefreshTokenUsecase(repository as never);

    const firstToken = await usecase.execute({ id: 1, loginId: "hunter" });
    const secondToken = await usecase.execute({ id: 1, loginId: "hunter" });

    expect(secondToken).not.toBe(firstToken);
    expect(decodeJwt(firstToken).jti).toBeTypeOf("string");
    expect(decodeJwt(secondToken).jti).toBeTypeOf("string");
    expect(decodeJwt(secondToken).jti).not.toBe(decodeJwt(firstToken).jti);
    expect(repository.saveRefreshToken).toHaveBeenLastCalledWith("hunter", secondToken);
  });
});
