import { NextRequest, NextResponse } from "next/server";
import { DeleteQuestUseCase } from "@/application/usecases/quest/DeleteQuestUsecase";
import { PriQuestRepository, PriSuccessDayRepository } from "@/infrastructure/repositories";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/utils/auth";

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

    const questId = Number(id);
    if (isNaN(questId)) {
      return NextResponse.json({ success: false, error: "유효하지 않은 퀘스트 ID입니다." }, { status: 400 });
    }

    // 퀘스트 소유자 검증
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest || quest.characterId !== character.id) {
      return NextResponse.json({ success: false, error: "퀘스트를 찾을 수 없습니다." }, { status: 404 });
    }

    const body = await req.json();
    const { name, tagged, isWeekly, difficulty, expiredAt } = body;

    const updated = await prisma.quest.update({
      where: { id: questId },
      data: {
        ...(name !== undefined && { name }),
        ...(tagged !== undefined && { tagged }),
        ...(isWeekly !== undefined && { isWeekly }),
        ...(difficulty !== undefined && { difficulty }),
        ...(expiredAt !== undefined && { expiredAt: expiredAt ? new Date(expiredAt) : null }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, quest: updated }, { status: 200 });
  } catch (error) {
    console.error("퀘스트 수정 중 오류 발생:", error);
    return NextResponse.json({ success: false, error: "퀘스트 수정 중 오류 발생" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

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
    const questId = Number(id);
    if (isNaN(questId)) {
      return NextResponse.json({ success: false, error: "유효하지 않은 퀘스트 ID입니다." }, { status: 400 });
    }

    // 퀘스트 삭제 처리
    const questRepository = new PriQuestRepository(prisma);
    const successDayRepository = new PriSuccessDayRepository(prisma);
    const deleteQuestUseCase = new DeleteQuestUseCase(questRepository, successDayRepository);

    await deleteQuestUseCase.deleteQuest({ id: questId, characterId });

    return NextResponse.json({ success: true, message: "퀘스트가 삭제되었습니다." }, { status: 200 });
  } catch (error) {
    console.error("퀘스트 삭제 중 오류 발생:", error);
    return NextResponse.json({ success: false, error: "알 수 없는 오류 발생" }, { status: 500 });
  }
}
