import { NextRequest, NextResponse } from "next/server";
import { EndingUsecase } from "@/application/usecases/ending/EndingUsecase";
import { ResolveWeeklyEndingUsecase } from "@/application/usecases/ending/ResolveWeeklyEndingUsecase";
import {
  PriTitleRepository,
  PriUserTitleRepository,
  PriCharacterRepository,
  PriStatusRepository,
  PriQuestRepository,
  PriSuccessDayRepository,
  PriEndingHistoryRepository,
} from "@/infrastructure/repositories";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/utils/auth";
import { getNow, getISOWeek, isSunday } from "@/utils/clock";

// 엔딩 페이지 랜딩 — 그 주 EndingHistory 조회 (없으면 lazy fallback 으로 생성)
export async function GET(request: NextRequest) {
  try {
    const { user } = await getUserFromCookie(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(user.id);

    const characterRepository = new PriCharacterRepository(prisma);
    const character = await characterRepository.findByUserId(userId);

    if (!character) {
      return NextResponse.json(
        { error: "캐릭터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const now = getNow();
    const weekKey = getISOWeek(now);

    // ===== Lazy fallback =====
    // 일요일에 cron이 안 돌았거나 신규 유저의 첫 일요일인 경우,
    // 페이지 진입 시 즉시 EndingHistory 생성 + endingState 활성화
    const endingHistoryRepository = new PriEndingHistoryRepository(prisma);
    const existing = await endingHistoryRepository.findByCharacterAndWeek(
      character.id,
      weekKey
    );

    if (!existing && isSunday(now)) {
      // 일요일인데 row 가 없음 → 지금 결정해서 저장
      const resolveUsecase = new ResolveWeeklyEndingUsecase(
        characterRepository,
        new PriStatusRepository(prisma),
        new PriQuestRepository(prisma),
        new PriSuccessDayRepository(prisma),
        endingHistoryRepository
      );
      await resolveUsecase.executeForCharacter(character.id, now);
    }

    // 다시 조회 — lazy fallback이 만들었거나 기존 row
    const ch = await characterRepository.findById(character.id);
    if (!ch) {
      return NextResponse.json(
        { error: "캐릭터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // endingState=2(ENABLED) 또는 3(CHECKED)일 때만 엔딩 조회 가능
    if (ch.endingState !== 2 && ch.endingState !== 3) {
      return NextResponse.json(
        {
          error: "엔딩을 확인할 수 없는 상태입니다.",
          endingState: ch.endingState,
        },
        { status: 403 }
      );
    }

    // 칭호 처리 + 컷신 데이터는 기존 EndingUsecase 가 character.endingCode 기반으로 처리
    // (ResolveWeeklyEndingUsecase 가 endingCode 를 character 에도 sync 했음)
    const endingUsecase = new EndingUsecase(
      new PriTitleRepository(prisma),
      new PriUserTitleRepository(prisma),
      characterRepository,
      new PriStatusRepository(prisma)
    );

    const result = await endingUsecase.execute(userId);

    // 추가 정보: 그 주 히스토리 메타 (completedCount, statsSnapshot)
    const history = await endingHistoryRepository.findByCharacterAndWeek(
      ch.id,
      weekKey
    );

    return NextResponse.json({
      ...result,
      weekKey,
      completedCount: history?.completedCount ?? 0,
      statsSnapshot: history?.statsSnapshot ?? null,
      checkedAt: history?.checkedAt ?? null,
    });
  } catch (error) {
    console.error("Ending API Error:", error);
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 엔딩 확인 완료 — endingState=3, endingCount+1, EndingHistory.checkedAt 마킹
export async function PATCH(request: NextRequest) {
  try {
    const { user } = await getUserFromCookie(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const characterRepository = new PriCharacterRepository(prisma);
    const character = await characterRepository.findByUserId(Number(user.id));

    if (!character) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    // 이미 CHECKED(3)이면 중복 처리 방지
    if (character.endingState === 3) {
      return NextResponse.json({
        success: true,
        message: "이미 확인된 엔딩입니다.",
      });
    }

    // endingState=2 (ENABLED)일 때만 CHECKED로 전환
    if (character.endingState !== 2) {
      return NextResponse.json(
        { error: "엔딩을 확인할 수 없는 상태입니다." },
        { status: 400 }
      );
    }

    const now = getNow();
    const weekKey = getISOWeek(now);

    // 트랜잭션으로 endingState/endingCount + EndingHistory.checkedAt 동기화
    await prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: {
          endingState: 3,
          endingCount: { increment: 1 },
        },
      });

      // 그 주 history row 가 있으면 checkedAt 마킹
      const history = await tx.endingHistory.findUnique({
        where: {
          characterId_weekKey: { characterId: character.id, weekKey },
        },
      });
      if (history && !history.checkedAt) {
        await tx.endingHistory.update({
          where: { id: history.id },
          data: { checkedAt: now },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ending PATCH Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
