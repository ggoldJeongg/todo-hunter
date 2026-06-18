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

// ë¡œê·¸?? ê°™ì? IP?ì„œ 60ì´???ìµœë? 5??
const LOGIN_RATE_LIMIT = { maxRequests: 5, windowSeconds: 60 };

export async function POST(req: NextRequest) {
    try {
        // Rate Limiting ê²€??
        const clientIp = getClientIp(req.headers);
        const rateLimit = await checkRateLimit(
            `signin:${clientIp}`,
            LOGIN_RATE_LIMIT.maxRequests,
            LOGIN_RATE_LIMIT.windowSeconds
        );

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "ë¡œê·¸???œë„ê°€ ?ˆë¬´ ë§ìŠµ?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”." },
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
        
        // ?¬ìš©??ID ?ì„± (FindUserIdByLoginIdUsecaseë¥??¬ìš©?˜ì—¬ loginIdë¡?id ê°€?¸ì˜¤ê¸?
        const findUserIdByLoginIdUsecase = new FindUserIdByLoginIdUsecase(userRepository);
        const idRaw = await findUserIdByLoginIdUsecase.execute(signInResponseDto.loginId);
        const id = parseInt(idRaw, 10);

        // ?¬ìš©??ë¡œê·¸??ID ?ì„±
        const loginId = signInResponseDto.loginId;

        const refreshToken = await generateRefreshTokenUsecase.execute({ id: id, loginId: loginId });


        // Access Token ?ì„±
        const accessToken = await generateAccessTokenUsecase.execute({ id: id, loginId: loginId });

        // ì¿ í‚¤ ?¤ì • ë°??‘ë‹µ (? í°?€ HttpOnly ì¿ í‚¤ë¡œë§Œ ?„ë‹¬, body???¬í•¨?˜ì? ?ŠìŒ)
        const response = NextResponse.json({ message: "ë¡œê·¸???±ê³µ" }, { status: 200 });
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
        console.error("ë¡œê·¸???¤ë¥˜:", error instanceof Error ? error.message : "unknown error");

        if(error instanceof LoginError){
            const errorMapping: Record<LoginErrorType, {message: string; status: number}> = {
                MISSING_CREDENTIALS: {
                message: "?„ì´?”ì? ë¹„ë?ë²ˆí˜¸ë¥?ëª¨ë‘ ?…ë ¥?´ì£¼?¸ìš”.",
                status: 400,
                },
                LOGIN_ID_NOT_FOUND: {
                message: "?„ì´???ëŠ” ë¹„ë?ë²ˆí˜¸ê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.",
                status: 401,
                },
                INVALID_PASSWORD: {
                message: "?„ì´???ëŠ” ë¹„ë?ë²ˆí˜¸ê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.",
                status: 401,
                },
                UNKNOWN_ERROR: {
                message: "?œë²„ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”.",
                status: 500,
                },
            };

            const response = errorMapping[error.type] || errorMapping["UNKNOWN_ERROR"];
            return NextResponse.json({error: response.message}, {status: response.status});
        }

        return NextResponse.json(
            {error: "?œë²„ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”."}, {status: 500}
        );
    }
}
