import { UserTitleUsecase } from "@/application/usecases/title/UserTitleUsecase";
import { ITitleRepository, IUserTitleRepository, IStatusRepository } from "@/domain/repositories";
import { PriCharacterRepository, PriTitleRepository, PriUserTitleRepository, PriStatusRepository } from "@/infrastructure/repositories";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromCookie } from "@/utils/auth";

export async function GET(req: NextRequest){
    const { user } = await getUserFromCookie(req);
    if (!user || !user.id) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");

    const characterRepository = new PriCharacterRepository(prisma);
    const character = await characterRepository.findByUserId(Number(user.id));
    if (!character) {
        return NextResponse.json({ error: "캐릭터를 찾을 수 없습니다." }, { status: 404 });
    }
    const characterId = Number(character.id);

    // 리포지토리 인스턴스 생성
    const userTitleRepository: IUserTitleRepository = new PriUserTitleRepository(prisma);
    const titleRepository: ITitleRepository = new PriTitleRepository(prisma);
    const statusRepository: IStatusRepository = new PriStatusRepository(prisma);

    // UserTitleUsecase 인스턴스 생성
    const userTitleUsecase = new UserTitleUsecase(
        userTitleRepository,
        titleRepository,
        statusRepository
    );

    try {
        // 사용자의 타이틀 목록 가져오기
        const userTitles = await userTitleUsecase.getUserTitles(characterId, page);
        return NextResponse.json(userTitles);
    } catch (error) {
        console.error("Error fetching user titles:", error);
        return NextResponse.json({ error: "Failed to fetch user titles" }, { status: 500 });
    }
}