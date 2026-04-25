import { UserTitleUsecase } from "@/application/usecases/title/UserTitleUsecase";
import { ITitleRepository, IUserTitleRepository, IStatusRepository } from "@/domain/repositories";
import { PriCharacterRepository, PriTitleRepository, PriUserTitleRepository, PriStatusRepository } from "@/infrastructure/repositories";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookie } from "@/utils/auth";

export async function GET(req: NextRequest) {
    const { user } = await getUserFromCookie(req);
    if (!user || !user.id) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const characterRepository = new PriCharacterRepository(prisma);
    const character = await characterRepository.findByUserId(Number(user.id));
    if (!character) {
        return NextResponse.json({ error: "캐릭터를 찾을 수 없습니다." }, { status: 404 });
    }
    const characterId = Number(character.id);

    const userTitleRepository: IUserTitleRepository = new PriUserTitleRepository(prisma);
    const titleRepository: ITitleRepository = new PriTitleRepository(prisma);
    const statusRepository: IStatusRepository = new PriStatusRepository(prisma);

    const userTitleUsecase = new UserTitleUsecase(
        userTitleRepository,
        titleRepository,
        statusRepository,
    );

    try {
        const dex = await userTitleUsecase.getTitleDex(characterId);
        return NextResponse.json(dex);
    } catch (error) {
        console.error("Error fetching title dex:", error);
        return NextResponse.json({ error: "Failed to fetch title dex" }, { status: 500 });
    }
}
