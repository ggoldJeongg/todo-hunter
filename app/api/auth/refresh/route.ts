import { NextRequest, NextResponse } from "next/server";
import { RdAuthenticationRepository } from "@/infrastructure/repositories/RdAuthenticationRepository";
import { VerifyRefreshTokenUsecase } from "@/application/usecases/auth/VerifyRefreshTokenUsecase";
import { GenerateAccessTokenUsecase } from "@/application/usecases/auth/GenerateAccessTokenUsecase";
import { GenerateRefreshTokenUsecase } from "@/application/usecases/auth/GenerateRefreshTokenUsecase";
import { checkRateLimit, getClientIp } from "@/infrastructure/rate-limiter";

const REFRESH_RATE_LIMIT = { maxRequests: 10, windowSeconds: 60 };

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);
    const rateLimit = await checkRateLimit(
      `refresh:${clientIp}`,
      REFRESH_RATE_LIMIT.maxRequests,
      REFRESH_RATE_LIMIT.windowSeconds
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many refresh requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const refreshToken = req.cookies.get("refreshToken")?.value;
    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 401 }
      );
    }

    const authenticationRepository = new RdAuthenticationRepository();
    const verifyRefreshTokenUsecase = new VerifyRefreshTokenUsecase();
    const generateAccessTokenUsecase = new GenerateAccessTokenUsecase();
    const generateRefreshTokenUsecase = new GenerateRefreshTokenUsecase(authenticationRepository);

    const decodedRefreshToken = await verifyRefreshTokenUsecase.execute(refreshToken);
    if (!decodedRefreshToken) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    const id = Number(decodedRefreshToken.id);
    const loginId = decodedRefreshToken.loginId;
    if (!Number.isFinite(id) || typeof loginId !== "string") {
      return NextResponse.json(
        { error: "Invalid refresh token payload" },
        { status: 401 }
      );
    }

    const storedRefreshToken = await authenticationRepository.getRefreshToken(loginId);
    if (storedRefreshToken !== refreshToken) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    const newAccessToken = await generateAccessTokenUsecase.execute({ id, loginId });
    const newRefreshToken = await generateRefreshTokenUsecase.execute({ id, loginId });

    const response = NextResponse.json({ message: "Token refreshed" }, { status: 200 });
    response.cookies.set("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: parseInt(process.env.ACCESS_TOKEN_EXPIRES || "3600", 10),
    });
    response.cookies.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRES || "3600", 10),
    });

    return response;
  } catch (error) {
    console.error("Refresh token error", error);
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
  }
}
