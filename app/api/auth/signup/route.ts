import { SignUpRequestDTO } from "@/application/usecases/auth/dtos/SignUpRequestDTO";
import { SignUpUsecase } from "@/application/usecases/auth/SignUpUsecase";
import { ICharacterRepository, IStatusRepository, IUserRepository } from "@/domain/repositories";
import { IRdAuthenticationRepository } from "@/domain/repositories/IRdAuthenticationRepository";
import { PriCharacterRepository, PriStatusRepository, PriUserRepository } from "@/infrastructure/repositories";
import { RdAuthenticationRepository } from "@/infrastructure/repositories/RdAuthenticationRepository";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/infrastructure/rate-limiter";

const SIGNUP_RATE_LIMIT = { maxRequests: 3, windowSeconds: 60 };

export async function POST(req: NextRequest) {
    const clientIp = getClientIp(req.headers);
    const rateLimit = await checkRateLimit(
        `signup:${clientIp}`,
        SIGNUP_RATE_LIMIT.maxRequests,
        SIGNUP_RATE_LIMIT.windowSeconds
    );

    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
            { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
        );
    }

    const userData: SignUpRequestDTO = await req.json();

    // 필수 필드 체크
    if (!userData.loginId || !userData.email || !userData.nickname || !userData.password) {
        return NextResponse.json({ error: "모든 필드를 입력해야 합니다." }, { status: 400 });
    }

    // 리포지토리 생성
    const userRepository:IUserRepository = new PriUserRepository(prisma);
    const characterRepository:ICharacterRepository = new PriCharacterRepository(prisma);
    const statusRepository:IStatusRepository = new PriStatusRepository(prisma);
    const rdAuthenticationRepository: IRdAuthenticationRepository = new RdAuthenticationRepository();
    
    // 유스케이스 생성
    const signUpUsecase = new SignUpUsecase(userRepository, characterRepository, statusRepository, rdAuthenticationRepository);

    // // 유스케이스 실행 (가입만 실행 시)
    // await signUpUsecase.execute(userData);
    
    // try {
    //     return NextResponse.json({ message:"회원가입 성공" }, { status: 201 });
    // } catch (error) {
    //     console.error("❌ 회원가입 오류", error);
    //     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    // }

    // 유스케이스 실행 (가입 후 토큰 생성 후 로그인)
    const { accessToken, refreshToken } = await signUpUsecase.execute(userData);

    try {
        // 쿠키 설정 및 응답
        const response = NextResponse.json({ message: "회원가입 성공" }, { status: 201 });
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
        console.error("❌ 회원가입 오류", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}