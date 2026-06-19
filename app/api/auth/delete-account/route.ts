import { NextRequest, NextResponse } from "next/server";
import { VerifyPasswordUsecase } from "@/application/usecases/auth/VerifyPasswordUsecase";
import { RdAuthenticationRepository } from "@/infrastructure/repositories/RdAuthenticationRepository";
import { prisma } from "@/lib/prisma";
import { deleteUserAccountData } from "@/utils/accountDeletion";
import { getUserFromCookie } from "@/utils/auth";

const SOCIAL_DELETE_CONFIRM_TEXT = "회원탈퇴";

type DeleteAccountBody = {
  password?: unknown;
  confirmText?: unknown;
};

function clearAuthCookies(response: NextResponse) {
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
}

export async function DELETE(req: NextRequest) {
  const { user } = await getUserFromCookie(req);
  if (!user) {
    return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, loginId: true, password: true, provider: true },
  });

  if (!account) {
    return NextResponse.json({ error: "이미 탈퇴했거나 존재하지 않는 사용자입니다." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as DeleteAccountBody;

  if (account.provider === "email") {
    if (typeof body.password !== "string" || body.password.trim().length === 0) {
      return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
    }

    if (!account.password) {
      return NextResponse.json({ error: "비밀번호 확인이 불가능한 계정입니다." }, { status: 400 });
    }

    const isPasswordValid = await new VerifyPasswordUsecase().execute(body.password, account.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
  } else if (body.confirmText !== SOCIAL_DELETE_CONFIRM_TEXT) {
    return NextResponse.json(
      { error: `소셜 계정 탈퇴를 확인하려면 '${SOCIAL_DELETE_CONFIRM_TEXT}'를 입력해주세요.` },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await deleteUserAccountData(tx, account.id);
  });

  try {
    await new RdAuthenticationRepository().deleteRefreshToken(account.loginId);
  } catch (error) {
    console.error("회원 탈퇴 후 refresh token 삭제 실패:", error);
  }

  const response = NextResponse.json({ message: "회원 탈퇴가 완료되었습니다." }, { status: 200 });
  clearAuthCookies(response);
  return response;
}
