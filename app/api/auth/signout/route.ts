import { NextRequest, NextResponse } from "next/server";
import { VerifyRefreshTokenUsecase } from "@/application/usecases/auth/VerifyRefreshTokenUsecase";
import { RdAuthenticationRepository } from "@/infrastructure/repositories/RdAuthenticationRepository";

export async function POST(req: NextRequest) {
    const refreshToken = req.cookies.get("refreshToken")?.value;

    // 서버 측 Refresh Token 무효화 (best-effort)
    if (refreshToken) {
        try {
            const verifyRefreshTokenUsecase = new VerifyRefreshTokenUsecase();
            const payload = await verifyRefreshTokenUsecase.execute(refreshToken);

            if (payload?.loginId) {
                const authenticationRepository = new RdAuthenticationRepository();
                await authenticationRepository.deleteRefreshToken(payload.loginId as string);
            }
        } catch (error) {
            // Redis 삭제 실패해도 쿠키는 제거해 로그아웃 UX는 정상 처리
            console.error("Redis refresh token 삭제 실패:", error);
        }
    }

    const response = NextResponse.json({ message: "Logged out" });

    // 쿠키 만료 처리로 클라이언트 측 토큰 제거
    response.cookies.set("accessToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(0),
    });

    response.cookies.set("refreshToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(0),
    });

    return response;
}
