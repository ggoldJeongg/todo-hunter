import { NextRequest, NextResponse } from "next/server";
import { CompleteSubTaskUsecase } from "@/application/usecases/quest/CompleteSubTaskUsecase";
import {
  PriQuestRepository,
  PriSubTaskRepository,
  PriSuccessDayRepository,
  PriCharacterRepository,
  PriStatusRepository,
} from "@/infrastructure/repositories";
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

    let subTaskId: number;
    try {
      subTaskId = parseId((body as { subTaskId?: unknown } | null)?.subTaskId, "서브태스크 ID");
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      throw error;
    }

    const usecase = new CompleteSubTaskUsecase(
      new PriQuestRepository(prisma),
      new PriSubTaskRepository(prisma),
      new PriSuccessDayRepository(prisma),
      new PriCharacterRepository(prisma),
      new PriStatusRepository(prisma),
      // 마지막 서브태스크로 퀘스트가 완료될 때, 보상 쓰기를 하나의 트랜잭션으로 원자 처리
      (operation) =>
        prisma.$transaction((tx) =>
          operation({
            questRepository: new PriQuestRepository(tx),
            successDayRepository: new PriSuccessDayRepository(tx),
            characterRepository: new PriCharacterRepository(tx),
            statusRepository: new PriStatusRepository(tx),
          })
        )
    );

    const result = await usecase.execute(character.id, subTaskId);

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("서브태스크 완료 중 오류 발생:", error);

    if (error instanceof Error && error.name === "CompleteQuestError") {
      const e = error as unknown as { type: string; message: string };
      if (e.type === "WILLPOWER_DEPLETED") {
        return NextResponse.json(
          { success: false, error: e.message, errorType: "WILLPOWER_DEPLETED" },
          { status: 400 }
        );
      }
      if (e.type === "SUBTASK_NOT_FOUND" || e.type === "QUEST_NOT_FOUND") {
        return NextResponse.json(
          { success: false, error: e.message, errorType: e.type },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "서브태스크 완료 중 오류 발생" },
      { status: 500 }
    );
  }
}
