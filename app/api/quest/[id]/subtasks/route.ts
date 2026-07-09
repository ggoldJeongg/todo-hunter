import { NextRequest, NextResponse } from "next/server";
import { AddSubTasksUsecase } from "@/application/usecases/quest/AddSubTasksUsecase";
import { PriQuestRepository, PriSubTaskRepository } from "@/infrastructure/repositories";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/utils/auth";
import { parseId, ValidationError } from "@/utils/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { user } = await getUserFromCookie(req);
    if (!user || !user.id) {
      return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
    }

    const character = await prisma.character.findFirst({ where: { userId: Number(user.id) } });
    if (!character) {
      return NextResponse.json({ success: false, error: "캐릭터를 찾을 수 없습니다." }, { status: 404 });
    }

    const questId = parseId(id, "퀘스트 ID");

    const body = await req.json();
    const { names } = body;
    if (!Array.isArray(names)) {
      return NextResponse.json(
        { success: false, error: "names 배열이 필요합니다." },
        { status: 400 }
      );
    }

    const safeNames = (names as unknown[]).filter((n): n is string => typeof n === "string");

    const usecase = new AddSubTasksUsecase(
      new PriQuestRepository(prisma),
      new PriSubTaskRepository(prisma)
    );
    const created = await usecase.execute(character.id, questId, safeNames);

    return NextResponse.json({ success: true, subTasks: created }, { status: 201 });
  } catch (error) {
    console.error("서브태스크 추가 중 오류 발생:", error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.name === "CompleteQuestError") {
      const e = error as unknown as { type: string; message: string };
      if (e.type === "QUEST_NOT_FOUND") {
        return NextResponse.json(
          { success: false, error: e.message, errorType: e.type },
          { status: 404 }
        );
      }
      if (e.type === "SUBTASK_LIMIT_EXCEEDED") {
        return NextResponse.json(
          { success: false, error: e.message, errorType: e.type },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "서브태스크 추가 중 오류 발생" },
      { status: 500 }
    );
  }
}
