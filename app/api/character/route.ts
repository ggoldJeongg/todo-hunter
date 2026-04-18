import { prisma } from "@/lib/prisma";
import { ICharacterRepository, IQuestRepository, IStatusRepository, ISuccessDayRepository, IUserRepository } from "@/domain/repositories";
import { PriCharacterRepository, PriQuestRepository, PriStatusRepository, PriSuccessDayRepository, PriUserRepository } from "@/infrastructure/repositories";
import { NextRequest, NextResponse } from "next/server";
import { CharacterUsecase } from "@/application/usecases/character/CharacterUsecase";
import { CharacterDto } from "@/application/usecases/character/dtos";
import { getUserFromCookie } from "@/utils/auth";


export async function GET(req: NextRequest) {
    const { user } = await getUserFromCookie(req);
    if (!user || !user.id) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userId = Number(user.id);

    const characterRepository: ICharacterRepository = new PriCharacterRepository(prisma);
    const statusRepository:IStatusRepository= new PriStatusRepository(prisma);
    const userRepository:IUserRepository = new PriUserRepository(prisma);
    const questRepository:IQuestRepository = new PriQuestRepository(prisma);
    const successDayRepository: ISuccessDayRepository = new PriSuccessDayRepository(prisma);

    const character = await characterRepository.findByUserId(userId);
    if (!character) {
        return NextResponse.json({ error: "캐릭터를 찾을 수 없습니다." }, { status: 404 });
    }
    const characterId = Number(character.id);

    const characterUsecase = new CharacterUsecase(
        statusRepository,
        userRepository,
        characterRepository,
        questRepository,
        successDayRepository
    );

    const characterDto:CharacterDto = await characterUsecase.getStatusAndNickname(characterId, userId);

    return NextResponse.json(characterDto);
}