import { NextRequest, NextResponse } from "next/server";
import { DeleteQuestUseCase } from "@/application/usecases/quest/DeleteQuestUsecase";
import { PriQuestRepository, PriSuccessDayRepository } from "@/infrastructure/repositories";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/utils/auth";
import { ValidationError, validateQuestInput, parseId } from "@/utils/validation";

// PUT 요청 (퀘스트 수정)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // 퀘스트 소유자 검증
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest || quest.characterId !== character.id) {
      return NextResponse.json({ success: false, error: "퀘스트를 찾을 수 없습니다." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const data = validateQuestInput(body, { partial: true });

    const updated = await prisma.quest.update({
      where: { id: questId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.tagged !== undefined && { tagged: data.tagged }),
        ...(data.isWeekly !== undefined && { isWeekly: data.isWeekly }),
        ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
        ...("expiredAt" in data && { expiredAt: data.expiredAt ?? null }),
        ...(Array.isArray(data.days) && { days: data.days }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, quest: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    console.error("퀘스트 수정 중 오류 발생:", error);
    return NextResponse.json({ success: false, error: "퀘스트 수정 중 오류 발생" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const characterId = character.id;
    const questId = parseId(id, "퀘스트 ID");

    // 퀘스트 삭제 처리
    const questRepository = new PriQuestRepository(prisma);
    const successDayRepository = new PriSuccessDayRepository(prisma);
    const deleteQuestUseCase = new DeleteQuestUseCase(questRepository, successDayRepository);

    await deleteQuestUseCase.deleteQuest({ id: questId, characterId });

    return NextResponse.json({ success: true, message: "퀘스트가 삭제되었습니다." }, { status: 200 });
  } catch (error) {
    console.error("퀘스트 삭제 중 오류 발생:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류 발생";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
