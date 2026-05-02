import { IUserRepository } from "@/domain/repositories";
import { IVerificationRepository } from "@/domain/repositories/IVerificationRepository";
import { VerifyCodeError } from "./errors/VerifyCodeError";

export class ResetPasswordUsecase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly verificationRepository: IVerificationRepository,
  ) {}

  async execute(
    loginId: string,
    email: string,
    verificationCode: string,
    newPassword: string,
  ): Promise<void> {
    if (!loginId || !email || !verificationCode || !newPassword) {
      throw new Error("필수 값이 누락되었습니다.");
    }
    if (newPassword.length < 8) {
      throw new Error("비밀번호는 8자 이상이어야 합니다.");
    }

    // 코드 재검증 (Check 단계 이후 변조/만료 가능성 방지)
    const savedCode = await this.verificationRepository.getResetPasswordCode(email);
    const expirationTime = await this.verificationRepository.getResetPasswordCodeExpiration(email);

    if (!savedCode) {
      throw new VerifyCodeError("INVALID_CODE", "인증코드가 존재하지 않습니다.");
    }
    if (expirationTime !== null && Date.now() > expirationTime) {
      throw new VerifyCodeError("EXPIRED_CODE", "인증코드가 만료되었습니다.");
    }
    if (String(savedCode) !== String(verificationCode)) {
      throw new VerifyCodeError("INVALID_CODE", "인증코드가 일치하지 않습니다.");
    }

    const user = await this.userRepository.findByLoginId(loginId);
    if (!user || user.email !== email || user.provider !== "email") {
      // 동일 메시지로 통일 (열거 공격 방지)
      throw new VerifyCodeError("INVALID_CODE", "인증 정보가 올바르지 않습니다.");
    }

    await this.userRepository.updatePassword(user.id, newPassword);
    await this.verificationRepository.deleteResetPasswordCode(email);
  }
}
