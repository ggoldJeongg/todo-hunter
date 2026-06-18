import { ICharacterRepository, IStatusRepository, IUserRepository } from "@/domain/repositories";
import { IRdAuthenticationRepository } from "@/domain/repositories/IRdAuthenticationRepository";
import { SignUpRequestDTO } from "./dtos/SignUpRequestDTO";
// import { createTokens } from "@/utils/auth";
import { GenerateAccessTokenUsecase } from "./GenerateAccessTokenUsecase";
import { GenerateRefreshTokenUsecase } from "./GenerateRefreshTokenUsecase";

type SignUpRepositories = {
  userRepository: IUserRepository;
  characterRepository: ICharacterRepository;
  statusRepository: IStatusRepository;
};

type SignUpTransaction = <T>(
  operation: (repositories: SignUpRepositories) => Promise<T>
) => Promise<T>;

export class SignUpTokenPersistenceError extends Error {
  constructor(cause: unknown) {
    super("Account created, but failed to save refresh token");
    this.name = "SignUpTokenPersistenceError";
    this.cause = cause;
  }
}

export class SignUpUsecase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly characterRepository: ICharacterRepository,
    private readonly statusRepository: IStatusRepository,
    private readonly rdAuthenticationRepository: IRdAuthenticationRepository, // Refresh Token 저장을 위한 의존성 추가
    private readonly transaction?: SignUpTransaction
  ) {}

  // async execute(request: SignUpRequestDTO): Promise<void>
  async execute(request: SignUpRequestDTO): Promise<{ accessToken: string; refreshToken: string; }> {
    const repositories = {
      userRepository: this.userRepository,
      characterRepository: this.characterRepository,
      statusRepository: this.statusRepository,
    };

    const user = this.transaction
      ? await this.transaction((transactionRepositories) =>
          this.createAccount(request, transactionRepositories)
        )
      : await this.createAccount(request, repositories);

    // 유즈케이스를 사용해 토큰 생성
    const accessTokenUsecase = new GenerateAccessTokenUsecase();
    const refreshTokenUsecase = new GenerateRefreshTokenUsecase(this.rdAuthenticationRepository);

    const userPayload = { id: user.id, loginId: user.loginId }; // GenerateAccessTokenUsecase와 GenerateRefreshTokenUsecase가 요구하는 형식
    const accessToken = await accessTokenUsecase.execute(userPayload);
    let refreshToken: string;

    try {
      refreshToken = await refreshTokenUsecase.execute(userPayload);
    } catch (error) {
      throw new SignUpTokenPersistenceError(error);
    }

    // // 필요에 따라 토큰 반환 또는 사용
    // return tokens;

    return { accessToken, refreshToken };
  }

  private async createAccount(
    request: SignUpRequestDTO,
    repositories: SignUpRepositories
  ) {
    const user = await repositories.userRepository.create({
      loginId: request.loginId,
      email: request.email,
      password: request.password,
      nickname: request.nickname,
      provider: "email",
      providerId: null,
    });

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일

    let endingState = 1;
    if (dayOfWeek === 0) { // 일요일
      endingState = 0;
    }

    const character = await repositories.characterRepository.create(user.id, endingState);
    await repositories.statusRepository.create(character.id);

    return user;
  }
}
