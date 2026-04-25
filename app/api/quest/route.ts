import { NextRequest, NextResponse } from 'next/server';
import { CreateQuestUseCase } from '@/application/usecases/quest/CreateQuestUsecase';
import { PriQuestRepository, PriStatusRepository } from '@/infrastructure/repositories';
import { prisma } from '@/lib/prisma';
import { CreateQuestDTO } from '@/application/usecases/quest/dtos';
import { getUserFromCookie } from '@/utils/auth';
import { getTodayStart, getThisWeekStart } from '@/utils/date';

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

    // 🔹 요청 바디 파싱
    const body = await req.json();

    const { name, tagged, isWeekly, difficulty, expiredAt } = body;

    // 🔹 필수 값 검증
    if (!name || !tagged) {
      return NextResponse.json({ success: false, error: "필수 값이 누락되었습니다." }, { status: 400 });
    }

    // 🔹 DTO 생성 (캐릭터 ID를 정확히 사용)
    const dto: CreateQuestDTO = {
      characterId: character.id,
      name,
      tagged,
      isWeekly,
      difficulty: difficulty || "normal",
      expiredAt: expiredAt ? new Date(expiredAt) : undefined,
    };

    // 🔹 퀘스트 생성
    const questRepository = new PriQuestRepository(prisma);
    const statusRepository = new PriStatusRepository(prisma);
    const createQuestUseCase = new CreateQuestUseCase(questRepository, statusRepository);
    const newQuest = await createQuestUseCase.createQuest(dto);

    return NextResponse.json({ success: true, quest: newQuest }, { status: 201 });
  } catch (error) {
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

    const quests = await prisma.quest.findMany({
      where: { characterId: character.id },
      include: {
        successDays: {
          // 가장 넓은 범위(weekStart) 로 한 번에 가져온 뒤 isWeekly 별로 필터
          where: { createdAt: { gte: weekStart } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formattedQuests = quests.map((quest) => {
      const since = quest.isWeekly ? weekStart : todayStart;
      const completed = quest.successDays.some((s) => s.createdAt >= since);
      const { successDays: _omit, ...rest } = quest;
      void _omit;
      return { ...rest, completed };
    });

    return NextResponse.json({ success: true, quests: formattedQuests }, { status: 200 });
  } catch (error) {
    console.error("퀘스트 조회 중 오류 발생:", error);
    return NextResponse.json({ success: false, error: "퀘스트 조회 중 오류 발생" }, { status: 500 });
  }
}


