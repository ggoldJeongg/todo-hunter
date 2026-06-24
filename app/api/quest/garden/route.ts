import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/utils/auth";
import { PriCharacterRepository } from "@/infrastructure/repositories";
import {
  GARDEN_DAYS,
  bucketCompletions,
  computeStreak,
  kstDateString,
} from "@/utils/garden";

// 성장 정원 — 최근 365일 완료를 KST 날짜별로 집계.
// 응답: 완료가 있는 날만 days 로 반환(payload 절약), 격자는 클라이언트가 구성.
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
      { status: 404 },
    );
  }

  const todayMs = Date.now();
  const since = new Date(todayMs - GARDEN_DAYS * 24 * 60 * 60 * 1000);

  const rows = await prisma.successDay.findMany({
    where: {
      quest: { characterId: character.id },
      createdAt: { gte: since },
    },
    select: {
      createdAt: true,
      quest: { select: { tagged: true } },
    },
  });

  const map = bucketCompletions(
    rows.map((r) => ({
      createdAtMs: r.createdAt.getTime(),
      tagged: r.quest.tagged,
    })),
  );

  return NextResponse.json({
    total: rows.length,
    streak: computeStreak(map, todayMs),
    today: kstDateString(todayMs),
    days: Array.from(map.values()),
  });
}
