import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/utils/auth";
import { PriCharacterRepository } from "@/infrastructure/repositories";

// 생활 리듬 — 완료(SuccessDay)를 "완료 시각의 시(0~23) × 카테고리"로 집계.
// 분포도가 의미를 가지도록 최근 N일 창으로 제한(기본 180일).
const DEFAULT_WINDOW_DAYS = 180;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 한국 표준시(UTC+9, DST 없음)
const TAGS = ["STR", "INT", "EMO", "FIN", "LIV"] as const;
type Tag = (typeof TAGS)[number];

function emptyByTag(): Record<Tag, number> {
  return { STR: 0, INT: 0, EMO: 0, FIN: 0, LIV: 0 };
}

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

  const url = new URL(req.url);
  const daysRaw = Number(url.searchParams.get("days"));
  const windowDays = Math.min(
    Math.max(Number.isFinite(daysRaw) ? daysRaw : DEFAULT_WINDOW_DAYS, 1),
    365
  );
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // 완료 시각(createdAt)과 카테고리(quest.tagged)만 조회
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

  // 24시간 × 카테고리 집계 (시각은 KST 기준)
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    total: 0,
    byTag: emptyByTag(),
  }));

  for (const r of rows) {
    const kstHour = new Date(r.createdAt.getTime() + KST_OFFSET_MS).getUTCHours();
    const tag = r.quest.tagged as Tag;
    hours[kstHour].total += 1;
    if (TAGS.includes(tag)) hours[kstHour].byTag[tag] += 1;
  }

  return NextResponse.json({
    total: rows.length,
    windowDays,
    hours,
  });
}
