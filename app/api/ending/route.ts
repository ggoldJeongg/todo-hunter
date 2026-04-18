import { NextRequest, NextResponse } from "next/server";
import { EndingUsecase } from "@/application/usecases/ending/EndingUsecase";
import {
  PriTitleRepository,
  PriUserTitleRepository,
  PriCharacterRepository,
  PriStatusRepository,
} from "@/infrastructure/repositories";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/utils/auth";

// 엔딩 페이지 랜딩시 호출되는 API
export async function GET(request: NextRequest) {
  try {
    const { user } = await getUserFromCookie(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(user.id);

    // 캐릭터 endingState 검증
    const characterRepository = new PriCharacterRepository(prisma);
    const character = await characterRepository.findByUserId(userId);

    if (!character) {
      return NextResponse.json({ error: "캐릭터를 찾을 수 없습니다." }, { status: 404 });
    }

    // endingState=2(ENABLED) 또는 3(CHECKED)일 때만 엔딩 조회 가능
    if (character.endingState !== 2 && character.endingState !== 3) {
      return NextResponse.json(
        { error: "엔딩을 확인할 수 없는 상태입니다.", endingState: character.endingState },
        { status: 403 }
      );
    }

    const titleRepository = new PriTitleRepository(prisma);
    const userTitleRepository = new PriUserTitleRepository(prisma);
    const statusRepository = new PriStatusRepository(prisma);

    const endingUsecase = new EndingUsecase(
      titleRepository,
      userTitleRepository,
      characterRepository,
      statusRepository
    );

    const result = await endingUsecase.execute(userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Ending API Error:", error);

    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// 엔딩 확인 완료 처리 (endingState=3, endingCount+1)
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

    // 이미 CHECKED(3)이면 endingCount 중복 증가 방지
    if (character.endingState === 3) {
      return NextResponse.json({ success: true, message: "이미 확인된 엔딩입니다." });
    }

    // endingState=2 (ENABLED)일 때만 CHECKED로 전환 + endingCount+1
    if (character.endingState !== 2) {
      return NextResponse.json(
        { error: "엔딩을 확인할 수 없는 상태입니다." },
        { status: 400 }
      );
    }

    await prisma.character.update({
      where: { id: character.id },
      data: {
        endingState: 3,
        endingCount: { increment: 1 },
      },
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
