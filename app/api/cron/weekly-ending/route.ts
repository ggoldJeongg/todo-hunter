// 주간 엔딩 cron 엔드포인트
//
// 호출 주체:
//   1. Vercel Cron Jobs (vercel.json schedule) — 일요일 23:59
//   2. 외부 node-cron 호스트 — 같은 일정으로 HTTP POST
//
// 보안:
//   - CRON_SECRET 환경변수와 매칭되는 Authorization 헤더 필요
//   - Vercel Cron 은 자동으로 헤더 첨부 (Authorization: Bearer <CRON_SECRET>)

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

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // CRON_SECRET 미설정 = 차단 (실수로 공개되는 것 방지)
    return false;
  }
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const usecase = buildUsecase();
    const result = await usecase.executeForAllCharacters(getNow());
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[cron/weekly-ending] 실행 실패:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Error" },
      { status: 500 }
    );
  }
}

// GET 도 허용 (Vercel Cron 의 기본 호출 방식이 GET 일 수 있어서)
export async function GET(req: NextRequest) {
  return POST(req);
}
