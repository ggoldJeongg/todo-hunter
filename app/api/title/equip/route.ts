import { EquipTitleUsecase } from "@/application/usecases/title/EquipTitleUsecase";
import { IUserTitleRepository } from "@/domain/repositories";
import { PriCharacterRepository, PriUserTitleRepository } from "@/infrastructure/repositories";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookie } from "@/utils/auth";

export async function POST(req: NextRequest) {
    const { user } = await getUserFromCookie(req);
    if (!user || !user.id) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
    }

    const titleId = (body as { titleId?: number | null } | null)?.titleId ?? null;
    if (titleId !== null && (typeof titleId !== "number" || !Number.isInteger(titleId))) {
        return NextResponse.json({ error: "titleId 는 정수 또는 null 이어야 합니다." }, { status: 400 });
    }

    const characterRepository = new PriCharacterRepository(prisma);
    const character = await characterRepository.findByUserId(Number(user.id));
    if (!character) {
        return NextResponse.json({ error: "캐릭터를 찾을 수 없습니다." }, { status: 404 });
    }

    const userTitleRepository: IUserTitleRepository = new PriUserTitleRepository(prisma);
    const usecase = new EquipTitleUsecase(userTitleRepository);

    const ok = await usecase.setEquipped(Number(character.id), titleId);
    if (!ok) {
        return NextResponse.json({ error: "보유하지 않은 칭호입니다." }, { status: 409 });
    }

    return NextResponse.json({ equippedTitleId: titleId });
}
