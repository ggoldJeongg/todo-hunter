export interface IVerificationRepository {
    saveVerificationCode(email: string, code: string, expiresIn: number): Promise<void>;
    getVerificationCode(email: string): Promise<string | null>;
    deleteVerificationCode(email: string): Promise<void>;
    getVerificationCodeExpiration(email: string): Promise<number | null>;
    saveSignupVerifiedEmail(email: string, expiresIn: number): Promise<void>;
    hasSignupVerifiedEmail(email: string): Promise<boolean>;
    deleteSignupVerifiedEmail(email: string): Promise<void>;

    // 비밀번호 재설정 전용 (회원가입 인증코드와 키 네임스페이스 분리)
    saveResetPasswordCode(email: string, code: string, expiresIn: number): Promise<void>;
    getResetPasswordCode(email: string): Promise<string | null>;
    deleteResetPasswordCode(email: string): Promise<void>;
    getResetPasswordCodeExpiration(email: string): Promise<number | null>;
}
