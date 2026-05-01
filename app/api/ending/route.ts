import { NextRequest, NextResponse } from "next/server";
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
import {
  ENDING_MAP,
  DEFAULT_ENDING_IMAGE,
  DEFAULT_ENDING_PROMPT,
} from "@/constants";

const DEFAULT_TITLE = {
  titleName: "방랑자",
  description: "아직 자신만의 길을 찾지 못한 여행자",
};

// 엔딩 페이지 랜딩 — read-only
// 칭호 부여 / EndingHistory row 생성은 모두 ResolveWeeklyEndingUsecase 가 담당.
// GET 자체는 lazy fallback (일요일에 row 없으면 한 번만 생성) 외엔 부수효과 없음.
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

    const endingHistoryRepository = new PriEndingHistoryRepository(prisma);
    let history = await endingHistoryRepository.findByCharacterAndWeek(
      character.id,
      weekKey
    );

    // ===== Lazy fallback (일요일에만) =====
    // cron 실패 또는 신규 유저 첫 일요일 대응
    if (!history && isSunday(now)) {
      const usecase = new ResolveWeeklyEndingUsecase(
        characterRepository,
        new PriStatusRepository(prisma),
        new PriQuestRepository(prisma),
        new PriSuccessDayRepository(prisma),
        endingHistoryRepository,
        new PriTitleRepository(prisma),
        new PriUserTitleRepository(prisma)
      );
      await usecase.executeForCharacter(character.id, now);
      history = await endingHistoryRepository.findByCharacterAndWeek(
        character.id,
        weekKey
      );
    }

    // 갱신된 character (lazy fallback이 endingState 바꿨을 수 있음)
    const ch = await characterRepository.findById(character.id);
    if (!ch) {
      return NextResponse.json(
        { error: "캐릭터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (ch.endingState !== 2 && ch.endingState !== 3) {
      return NextResponse.json(
        {
          error: "엔딩을 확인할 수 없는 상태입니다.",
          endingState: ch.endingState,
        },
        { status: 403 }
      );
    }

    if (!history) {
      // 평일이고 history도 없는데 endingState만 2/3 인 비정상 케이스
      return NextResponse.json(
        { error: "이번 주 엔딩 기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // EndingHistory 에서 결정된 endingCode 로 컷신 데이터 조회
    const endingInfo = ENDING_MAP[history.endingCode];

    // 부여된 칭호 조회 (없으면 default 방랑자)
    let achievableTitle = DEFAULT_TITLE;
    if (history.awardedTitleId) {
      const titleRepository = new PriTitleRepository(prisma);
      const title = await titleRepository.findById(history.awardedTitleId);
      if (title) {
        achievableTitle = {
          titleName: title.titleName,
          description: title.description,
        };
      }
    }

    // 토스트 게이팅 — 사용자가 아직 "확인" 안 누른 상태면 첫 view 로 간주
    const isFirstView = !history.checkedAt;

    if (endingInfo) {
      return NextResponse.json({
        endingState: ch.endingState,
        endingCode: history.endingCode,
        endingName: endingInfo.name,
        endingStory: endingInfo.story,
        endingDialogue: endingInfo.dialogue,
        endingImage: endingInfo.image,
        achievableTitle,
        weekKey,
        completedCount: history.completedCount,
        statsSnapshot: history.statsSnapshot,
        checkedAt: history.checkedAt,
        isFirstView,
      });
    }

    // ENDING_MAP 매칭 안 됨 → fallback (이론상 도달 불가)
    const fallback = ENDING_MAP["ORDINARY_DAY"];
    return NextResponse.json({
      endingState: ch.endingState,
      endingCode: "ORDINARY_DAY",
      endingName: "평범한 하루",
      endingStory: fallback?.story ?? [DEFAULT_ENDING_PROMPT],
      endingDialogue: fallback?.dialogue ?? [],
      endingImage: DEFAULT_ENDING_IMAGE,
      achievableTitle,
      weekKey,
      completedCount: history.completedCount,
      statsSnapshot: history.statsSnapshot,
      checkedAt: history.checkedAt,
      isFirstView,
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

    if (character.endingState === 3) {
      return NextResponse.json({
        success: true,
        message: "이미 확인된 엔딩입니다.",
      });
    }

    if (character.endingState !== 2) {
      return NextResponse.json(
        { error: "엔딩을 확인할 수 없는 상태입니다." },
        { status: 400 }
      );
    }

    const now = getNow();
    const weekKey = getISOWeek(now);

    await prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: {
          endingState: 3,
          endingCount: { increment: 1 },
        },
      });

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
