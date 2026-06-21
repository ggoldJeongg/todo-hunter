import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IRdAuthenticationRepository } from "@/domain/repositories/IRdAuthenticationRepository";
import type { IUserRepository } from "@/domain/repositories";
import type { IVerificationRepository } from "@/domain/repositories/IVerificationRepository";
import { ResetPasswordUsecase } from "./ResetPasswordUsecase";

const user = {
  id: 1,
  loginId: "hunter",
  email: "hunter@example.com",
  password: "hashed-password",
  nickname: "hunter",
  provider: "email",
  providerId: null,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

describe("ResetPasswordUsecase", () => {
  const userRepository = {
    findByLoginId: vi.fn(),
    updatePassword: vi.fn(),
  } as unknown as IUserRepository;

  const verificationRepository = {
    getResetPasswordCode: vi.fn(),
    getResetPasswordCodeExpiration: vi.fn(),
    deleteResetPasswordCode: vi.fn(),
  } as unknown as IVerificationRepository;

  const authenticationRepository = {
    deleteRefreshToken: vi.fn(),
  } as unknown as IRdAuthenticationRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepository.findByLoginId).mockResolvedValue(user);
    vi.mocked(userRepository.updatePassword).mockResolvedValue(undefined);
    vi.mocked(verificationRepository.getResetPasswordCode).mockResolvedValue("123456");
    vi.mocked(verificationRepository.getResetPasswordCodeExpiration).mockResolvedValue(
      Date.now() + 60_000
    );
    vi.mocked(verificationRepository.deleteResetPasswordCode).mockResolvedValue(undefined);
    vi.mocked(authenticationRepository.deleteRefreshToken).mockResolvedValue(undefined);
  });

  it("revokes the user's refresh token after a successful password reset", async () => {
    const usecase = new ResetPasswordUsecase(
      userRepository,
      verificationRepository,
      authenticationRepository
    );

    await usecase.execute("hunter", "hunter@example.com", "123456", "new-password");

    expect(authenticationRepository.deleteRefreshToken).toHaveBeenCalledWith("hunter");
    expect(verificationRepository.deleteResetPasswordCode).toHaveBeenCalledWith(
      "hunter@example.com"
    );
  });
});
