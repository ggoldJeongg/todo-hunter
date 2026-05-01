import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/utils/auth";
import { ICharacterRepository } from "@/domain/repositories";
import { PriCharacterRepository } from "@/infrastructure/repositories";
import {
  AppearanceUsecase,
  CharacterNotFoundError,
  InvalidAppearanceIdError,
  EmptyAppearanceUpdateError,
} from "@/application/usecases/character/AppearanceUsecase";

function buildUsecase(): AppearanceUsecase {
  const characterRepository: ICharacterRepository = new PriCharacterRepository(
    prisma
  );
  return new AppearanceUsecase(characterRepository);
}

// GET /api/character/appearance — 현재 외형 조회
export async function GET(req: NextRequest) {
  const { user } = await getUserFromCookie(req);
  if (!user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const appearance = await buildUsecase().getAppearance(Number(user.id));
    return NextResponse.json(appearance);
  } catch (err) {
    if (err instanceof CharacterNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[GET /api/character/appearance] 외형 조회 실패:", err);
    return NextResponse.json(
      { error: "외형 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PATCH /api/character/appearance — 외형 부분 업데이트
// body: { outfitId?, hairId?, hatId?: string | null }
export async function PATCH(req: NextRequest) {
  const { user } = await getUserFromCookie(req);
  if (!user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "유효하지 않은 JSON 입니다." },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "유효하지 않은 요청 본문 입니다." },
      { status: 400 }
    );
  }

  try {
    const appearance = await buildUsecase().updateAppearance(
      Number(user.id),
      body as Record<string, unknown>
    );
    return NextResponse.json(appearance);
  } catch (err) {
    if (
      err instanceof InvalidAppearanceIdError ||
      err instanceof EmptyAppearanceUpdateError
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof CharacterNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[PATCH /api/character/appearance] 외형 변경 실패:", err);
    return NextResponse.json(
      { error: "외형 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
