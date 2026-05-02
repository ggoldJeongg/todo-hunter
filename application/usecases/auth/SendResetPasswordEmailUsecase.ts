import nodemailer from 'nodemailer';
import { GenerateVerifyCodeUsecase } from "@/application/usecases/auth/GenerateVerifyCodeUsecase";
import { IUserRepository } from "@/domain/repositories";
import { IVerificationRepository } from "@/domain/repositories/IVerificationRepository";
import { sendResetPasswordEmailTemplate } from '@/utils/sendEmailTemplate';

// 이메일 가입 유저만 비밀번호 재설정 가능. 카카오 등 OAuth 유저는 차단.
export class SendResetPasswordEmailUsecase {
  private transporter;
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly generateVerifyCodeUsecase: GenerateVerifyCodeUsecase,
    private readonly verificationRepository: IVerificationRepository,
  ) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT as string, 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
      logger: true,
      debug: false,
    });
  }

  // 반환: 발송 성공 여부와 무관하게 "처리 완료" 시그널만 줌 (이메일 존재 여부 노출 방지)
  async execute(loginId: string, email: string): Promise<void> {
    if (!loginId || !email) {
      throw new Error("아이디와 이메일을 입력해야 합니다.");
    }

    const user = await this.userRepository.findByLoginId(loginId);

    // 유저가 없거나, 이메일 불일치, 또는 OAuth 가입자(password null)인 경우는
    // 조용히 종료. (열거 공격 방지)
    if (!user || user.email !== email || user.provider !== "email" || !user.password) {
      return;
    }

    const verificationCode = this.generateVerifyCodeUsecase.execute();
    await this.verificationRepository.saveResetPasswordCode(email, verificationCode, 300);

    const emailHtml = sendResetPasswordEmailTemplate(verificationCode);
    await this.transporter.sendMail({
      from: `"TODO HUNTER Team" <${process.env.SMTP_USER_EMAIL}>`,
      to: email,
      subject: "[TODO HUNTER] 비밀번호 재설정 인증코드 안내",
      html: emailHtml,
    });
  }
}
