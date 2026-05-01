// 개발용 주간 엔딩 수동 트리거
//
// 사용법:
//   curl -X POST http://localhost:3050/api/dev/trigger-weekly-ending
//
// 안전장치:
//   1. NODE_ENV !== "development" 면 차단 (프로덕션 비활성화)
//   2. 옵션: query param ?characterId=1 로 단일 캐릭터만 처리 가능
//   3. 옵션: body { fakeNow: "2026-04-26T23:59" } 로 시각 override (clock.getNow 의 FAKE_NOW 와 별개)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PriCharacterRepository,
  PriStatusRepository,
  PriQuestRepository,
  PriSuccessDayRepository,
  PriEndingHistoryRepository,
  PriTitleRepository,
  PriUserTitleRepository,
} from "@/infrastructure/repositories";
import { ResolveWeeklyEndingUsecase } from "@/application/usecases/ending/ResolveWeeklyEndingUsecase";
import { getNow } from "@/utils/clock";

function buildUsecase(): ResolveWeeklyEndingUsecase {
  return new ResolveWeeklyEndingUsecase(
    new PriCharacterRepository(prisma),
    new PriStatusRepository(prisma),
    new PriQuestRepository(prisma),
    new PriSuccessDayRepository(prisma),
    new PriEndingHistoryRepository(prisma),
    new PriTitleRepository(prisma),
    new PriUserTitleRepository(prisma)
  );
}

export async function POST(req: NextRequest) {
  // 프로덕션 차단
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "dev only — NODE_ENV !== development" },
      { status: 403 }
    );
  }

  // body 파싱 (선택 옵션)
  let body: { fakeNow?: string; characterId?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* body 없으면 빈 객체로 진행 */
  }

  // 시각 결정
  const now =
    body.fakeNow && !isNaN(new Date(body.fakeNow).getTime())
      ? new Date(body.fakeNow)
      : getNow();

  const usecase = buildUsecase();

  try {
    if (body.characterId) {
      // 단일 캐릭터 처리
      const result = await usecase.executeForCharacter(body.characterId, now);
      return NextResponse.json({ mode: "single", now: now.toISOString(), result });
    }

    // 전체 캐릭터 처리
    const result = await usecase.executeForAllCharacters(now);
    return NextResponse.json({ mode: "all", now: now.toISOString(), ...result });
  } catch (err) {
    console.error("[dev/trigger-weekly-ending] 실패:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
