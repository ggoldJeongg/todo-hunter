import { NextRequest, NextResponse } from "next/server";
import { CompleteQuestUsecase } from "@/application/usecases/quest/CompleteQuestUsecase";
import { PriQuestRepository, PriSuccessDayRepository, PriCharacterRepository, PriStatusRepository } from "@/infrastructure/repositories";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/utils/auth";
import { parseId, ValidationError } from "@/utils/validation";

export async function POST(req: NextRequest) {
  try {
    const { user } = await getUserFromCookie(req);
    if (!user || !user.id) {
      return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
    }

    const character = await prisma.character.findFirst({ where: { userId: Number(user.id) } });
    if (!character) {
      return NextResponse.json({ success: false, error: "캐릭터를 찾을 수 없습니다." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const characterId = character.id;

    let questId: number;
    try {
      questId = parseId((body as { questId?: unknown } | null)?.questId, "퀘스트 ID");
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      throw error;
    }

    // UseCase 인스턴스 생성
    const questRepository = new PriQuestRepository(prisma);
    const successDayRepository = new PriSuccessDayRepository(prisma);
    const characterRepository = new PriCharacterRepository(prisma);
    const statusRepository = new PriStatusRepository(prisma);

    const completeQuestUsecase = new CompleteQuestUsecase(
      questRepository,
      successDayRepository,
      characterRepository,
      statusRepository
    );

    // UseCase 실행
    await completeQuestUsecase.completeQuest(characterId, questId);

    return NextResponse.json(
      { success: true, message: "퀘스트 완료 처리 성공!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("퀘스트 완료 중 오류 발생:", error);

    // 의지력 부족 에러는 400으로 반환
    if (error instanceof Error && error.name === "CompleteQuestError") {
      const questError = error as unknown as { type: string; message: string };
      if (questError.type === "WILLPOWER_DEPLETED") {
        return NextResponse.json(
          { success: false, error: questError.message, errorType: "WILLPOWER_DEPLETED" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "퀘스트 완료 중 오류 발생" },
      { status: 500 }
    );
  }
}