import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/utils/auth";
import {
  PriCharacterRepository,
  PriUserTitleRepository,
  PriTitleRepository,
} from "@/infrastructure/repositories";

// 현재 장착된 칭호 조회 — 없으면 null 반환
export async function GET(req: NextRequest) {
  const { user } = await getUserFromCookie(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const characterRepository = new PriCharacterRepository(prisma);
  const character = await characterRepository.findByUserId(Number(user.id));
  if (!character) {
    return NextResponse.json(
      { error: "캐릭터를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const userTitleRepository = new PriUserTitleRepository(prisma);
  const selected = await userTitleRepository.findSelectedByCharacterId(
    character.id
  );

  if (!selected) {
    return NextResponse.json({ titleName: null, description: null, reqStat: null });
  }

  const titleRepository = new PriTitleRepository(prisma);
  const title = await titleRepository.findById(selected.titleId);
  if (!title) {
    return NextResponse.json({ titleName: null, description: null, reqStat: null });
  }

  return NextResponse.json({
    titleId: title.id,
    titleName: title.titleName,
    description: title.description,
    reqStat: title.reqStat,
  });
}
