import { NextRequest, NextResponse } from 'next/server';
import { CreateQuestUseCase } from '@/application/usecases/quest/CreateQuestUsecase';
import { PriQuestRepository, PriStatusRepository, PriSubTaskRepository } from '@/infrastructure/repositories';
import { prisma } from '@/lib/prisma';
import { CreateQuestDTO } from '@/application/usecases/quest/dtos';
import { getUserFromCookie } from '@/utils/auth';
import { getTodayStart, getThisWeekStart } from '@/utils/date';
import { calculateWeeklyStreak } from '@/utils/questStreak';
import { ValidationError, validateQuestInput } from '@/utils/validation';

// POST 요청 (새 퀘스트 생성)
export async function POST(req: NextRequest) {
  try {
    // 🔹 유저 정보 가져오기
    const { user } = await getUserFromCookie(req);
    if (!user || !user.id) {
      return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
    }

    // 🔹 유저의 캐릭터 조회
    const character = await prisma.character.findFirst({ where: { userId: Number(user.id) } });
    if (!character) {
      return NextResponse.json({ success: false, error: "캐릭터를 찾을 수 없습니다." }, { status: 404 });
    }

    // 🔹 요청 바디 파싱 및 검증
    const body = await req.json().catch(() => null);
    const questInput = validateQuestInput(body);

    // 🔹 DTO 생성 (캐릭터 ID를 정확히 사용)
    const dto: CreateQuestDTO = {
      characterId: character.id,
      name: questInput.name,
      tagged: questInput.tagged,
      isWeekly: questInput.isWeekly,
      difficulty: questInput.difficulty,
      expiredAt: questInput.expiredAt,
      days: questInput.days,
      subTasks: questInput.subTasks,
    };

    // 🔹 퀘스트 생성
    const questRepository = new PriQuestRepository(prisma);
    const statusRepository = new PriStatusRepository(prisma);
    const subTaskRepository = new PriSubTaskRepository(prisma);
    const createQuestUseCase = new CreateQuestUseCase(questRepository, statusRepository, subTaskRepository);
    const newQuest = await createQuestUseCase.createQuest(dto);

    return NextResponse.json({ success: true, quest: newQuest }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    console.error("퀘스트 생성 중 오류 발생:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "알 수 없는 오류 발생" },
      { status: 500 }
    );
  }
}

// GET 요청
export async function GET(req: NextRequest) {
  try {
    const { user } = await getUserFromCookie(req);
    if (!user || !user.id) {
      return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
    }

    const character = await prisma.character.findFirst({ where: { userId: Number(user.id) } });
    if (!character) {
      return NextResponse.json({ success: false, error: "캐릭터를 찾을 수 없습니다." }, { status: 404 });
    }

    // 데일리는 "오늘 0시 이후", 주간은 "이번 주 월요일 0시 이후" SuccessDay 만 보고 완료 여부 판정.
    // 영구 히스토리는 보존하여 스트릭/통계 등 추후 활용 가능.
    const todayStart = getTodayStart();
    const weekStart = getThisWeekStart();

    // 만료된 퀘스트는 UI에서 제외 (일간 퀘스트는 완료 시 expiredAt = 다음 날 0시 로 세팅됨).
    // expiredAt 이 null 이면 만료 없음으로 간주.
    const now = new Date();
    // streak 계산을 위해 SuccessDay 전체를 가져옴.
    // 데이터량 부담 우려 시 quest 별 limit 적용 또는 별도 endpoint 분리 고려.
    const quests = await prisma.quest.findMany({
      where: {
        characterId: character.id,
        OR: [
          { expiredAt: null },
          { expiredAt: { gt: now } },
        ],
      },
      include: {
        successDays: true,
        subTasks: { orderBy: [{ order: "asc" }, { id: "asc" }] },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formattedQuests = quests.map((quest) => {
      const since = quest.isWeekly ? weekStart : todayStart;
      const completed = quest.successDays.some((s) => s.createdAt >= since);
      // 주간 퀘스트면서 days 가 지정된 경우에만 streak 계산
      const streak =
        quest.isWeekly && quest.days.length > 0
          ? calculateWeeklyStreak(
              quest.days,
              quest.successDays.map((s) => s.createdAt),
              now
            )
          : 0;
      const { successDays: _omit, subTasks, ...rest } = quest;
      void _omit;
      return {
        ...rest,
        completed,
        streak,
        subTasks: subTasks.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          completedAt: s.completedAt,
        })),
      };
    });

    return NextResponse.json({ success: true, quests: formattedQuests }, { status: 200 });
  } catch (error) {
    console.error("퀘스트 조회 중 오류 발생:", error);
    return NextResponse.json({ success: false, error: "퀘스트 조회 중 오류 발생" }, { status: 500 });
  }
}
