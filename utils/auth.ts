import { NextRequest, NextResponse } from "next/server";
import { JWTPayload } from "jose";
import { VerifyAccessTokenUsecase } from "@/application/usecases/auth/VerifyAccessTokenUsecase";
import { VerifyRefreshTokenUsecase } from "@/application/usecases/auth/VerifyRefreshTokenUsecase";
import { GenerateAccessTokenUsecase } from "@/application/usecases/auth/GenerateAccessTokenUsecase";
import { RdAuthenticationRepository } from "@/infrastructure/repositories/RdAuthenticationRepository";

interface UserPayload extends JWTPayload {
  id: number;
  loginId: string;
  nickname?: string;
  createdAt?: string;
}

export async function getUserFromCookie(
  req: NextRequest,
  verifyAccessTokenUsecase = new VerifyAccessTokenUsecase(),
  verifyRefreshTokenUsecase = new VerifyRefreshTokenUsecase(),
  generateAccessTokenUsecase = new GenerateAccessTokenUsecase()
): Promise<{ user: UserPayload | null; response?: NextResponse }> {
  try {
    const accessToken = req.cookies.get("accessToken")?.value;
    const refreshToken = req.cookies.get("refreshToken")?.value;

    if (!accessToken) {
      return { user: null };
    }

    const payload = await verifyAccessTokenUsecase.execute(accessToken);
    if (payload) {
      return { user: payload as UserPayload };
    }

    if (!refreshToken) {
      return { user: null };
    }

    const refreshPayload = await verifyRefreshTokenUsecase.execute(refreshToken);
    if (!refreshPayload) {
      return { user: null };
    }

    const id = Number(refreshPayload.id);
    const loginId = refreshPayload.loginId;
    if (!Number.isFinite(id) || typeof loginId !== "string") {
      return { user: null };
    }

    const authenticationRepository = new RdAuthenticationRepository();
    const storedRefreshToken = await authenticationRepository.getRefreshToken(loginId);
    if (storedRefreshToken !== refreshToken) {
      return { user: null };
    }

    const newAccessToken = await generateAccessTokenUsecase.execute({ id, loginId });

    const response = NextResponse.next();
    response.cookies.set({
      name: "accessToken",
      value: newAccessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: parseInt(process.env.ACCESS_TOKEN_EXPIRES || "3600", 10),
    });

    return { user: { ...refreshPayload, id, loginId } as UserPayload, response };
  } catch (error) {
    console.error("Failed to read user from auth cookies", error);
    return { user: null };
  }
}

export async function getUserFromRequest(req: NextRequest) {
  const { user } = await getUserFromCookie(req);
  return user?.id ?? null;
}
