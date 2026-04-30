import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/utils/auth";
import { PriCharacterRepository } from "@/infrastructure/repositories";
import { getStatGain } from "@/constants/game";

// 최근 완료 퀘스트 N개 조회 (성장 기록 표시용)
// SuccessDay 를 createdAt desc 로 정렬 → quest join → 최신 N개
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

  // limit 파싱 (기본 5)
  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitRaw) || 5, 1), 50);

  // SuccessDay 조회 — quest 가 해당 character 의 것일 때만
  const rows = await prisma.successDay.findMany({
    where: {
      quest: { characterId: character.id },
    },
    include: { quest: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      successDayId: r.id,
      questName: r.quest.name,
      tagged: r.quest.tagged,
      difficulty: r.quest.difficulty,
      statGain: getStatGain(r.quest.difficulty),
      completedAt: r.createdAt,
    })),
  });
}
