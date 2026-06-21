import { IUserRepository } from "@/domain/repositories";
import { PriUserRepository } from "@/infrastructure/repositories";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignInUsecase } from "@/application/usecases/auth/SignInUsecase";
import { VerifyPasswordUsecase } from "@/application/usecases/auth/VerifyPasswordUsecase";
import { SignInResponseDTO } from "@/application/usecases/auth/dtos/SignInResponseDTO";
import { SignInRequestDTO } from "@/application/usecases/auth/dtos/SignInRequestDTO";
import { LoginError, LoginErrorType } from "@/application/usecases/auth/errors/LoginError";
import { RdAuthenticationRepository } from "@/infrastructure/repositories/RdAuthenticationRepository";
import { GenerateAccessTokenUsecase } from "@/application/usecases/auth/GenerateAccessTokenUsecase";
import { GenerateRefreshTokenUsecase } from "@/application/usecases/auth/GenerateRefreshTokenUsecase";
import { FindUserIdByLoginIdUsecase } from "@/application/usecases/auth/FindUserIdByLoginIdUsecase";
import { checkRateLimit, getClientIp } from "@/infrastructure/rate-limiter";

// 로그인: 같은 IP에서 60초 내 최대 5회
const LOGIN_RATE_LIMIT = { maxRequests: 5, windowSeconds: 60 };

export async function POST(req: NextRequest) {
    try {
        // Rate Limiting 검사
        const clientIp = getClientIp(req.headers);
        const rateLimit = await checkRateLimit(
            `signin:${clientIp}`,
            LOGIN_RATE_LIMIT.maxRequests,
            LOGIN_RATE_LIMIT.windowSeconds
        );

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(rateLimit.retryAfterSeconds),
                    },
                }
            );
        }
        const request: SignInRequestDTO = await req.json();
        const userRepository: IUserRepository = new PriUserRepository(prisma);
        const verifyPasswordUsecase = new VerifyPasswordUsecase();
        const signInUsecase = new SignInUsecase(userRepository, verifyPasswordUsecase);
        const signInResponseDto: SignInResponseDTO = await signInUsecase.execute(request);

        const authenticationRepository = new RdAuthenticationRepository();
        const generateAccessTokenUsecase = new GenerateAccessTokenUsecase();
        const generateRefreshTokenUsecase = new GenerateRefreshTokenUsecase(authenticationRepository);

        // 사용자 ID 조회 (FindUserIdByLoginIdUsecase를 사용하여 loginId로 id 가져오기)
        const findUserIdByLoginIdUsecase = new FindUserIdByLoginIdUsecase(userRepository);
        const idRaw = await findUserIdByLoginIdUsecase.execute(signInResponseDto.loginId);
        const id = parseInt(idRaw, 10);

        // 사용자 로그인 ID
        const loginId = signInResponseDto.loginId;

        const refreshToken = await generateRefreshTokenUsecase.execute({ id: id, loginId: loginId });


        // Access Token 생성
        const accessToken = await generateAccessTokenUsecase.execute({ id: id, loginId: loginId });

        // 쿠키 설정 및 응답 (토큰은 HttpOnly 쿠키로만 전달, body에 포함하지 않음)
        const response = NextResponse.json({ message: "로그인 성공" }, { status: 200 });
        response.cookies.set("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            sameSite: "lax",
            maxAge: parseInt(process.env.ACCESS_TOKEN_EXPIRES || "3600", 10),
        });
        response.cookies.set("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            sameSite: "lax",
            maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRES || "3600", 10),
        });

        return response;
    } catch (error) {
        console.error("로그인 오류:", error instanceof Error ? error.message : "unknown error");

        if(error instanceof LoginError){
            const errorMapping: Record<LoginErrorType, {message: string; status: number}> = {
                MISSING_CREDENTIALS: {
                message: "아이디와 비밀번호를 모두 입력해주세요.",
                status: 400,
                },
                LOGIN_ID_NOT_FOUND: {
                message: "아이디 또는 비밀번호가 올바르지 않습니다.",
                status: 401,
                },
                INVALID_PASSWORD: {
                message: "아이디 또는 비밀번호가 올바르지 않습니다.",
                status: 401,
                },
                UNKNOWN_ERROR: {
                message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                status: 500,
                },
            };

            const response = errorMapping[error.type] || errorMapping["UNKNOWN_ERROR"];
            return NextResponse.json({error: response.message}, {status: response.status});
        }

        return NextResponse.json(
            {error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}, {status: 500}
        );
    }
}
