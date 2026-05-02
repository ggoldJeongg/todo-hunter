import { IVerificationRepository } from "@/domain/repositories/IVerificationRepository";
import { VerifyCodeError } from "./errors/VerifyCodeError";

// 인증코드 확인. 성공 시 코드는 즉시 삭제하지 않고, ResetPasswordUsecase 단계에서 최종 검증 후 삭제.
// (코드 한 번 입력 → 새 비밀번호 입력 → 제출 사이의 시간차에 코드가 살아있어야 함)
export class CheckResetPasswordCodeUsecase {
  constructor(private readonly verificationRepository: IVerificationRepository) {}

  async execute(email: string, verificationCode: string): Promise<boolean> {
    const savedCode = await this.verificationRepository.getResetPasswordCode(email);
    const expirationTime = await this.verificationRepository.getResetPasswordCodeExpiration(email);

    if (!savedCode) {
      throw new VerifyCodeError("INVALID_CODE", "인증코드가 존재하지 않습니다.");
    }

    if (expirationTime !== null && Date.now() > expirationTime) {
      throw new VerifyCodeError("EXPIRED_CODE", "인증코드가 만료되었습니다.");
    }

    // Upstash Redis는 숫자형 문자열("123456")을 number로 자동 역직렬화할 수 있어
    // String() 캐스팅으로 비교 안정성 확보
    return String(savedCode) === String(verificationCode);
  }
}
