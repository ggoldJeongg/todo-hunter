import { IUserTitleRepository } from "@/domain/repositories";

export class EquipTitleUsecase {
    constructor(
        private readonly userTitleRepository: IUserTitleRepository,
    ) {}

    /**
     * 칭호 장착 토글.
     * - titleId === null: 모든 칭호 해제
     * - titleId === number: 해당 칭호 외 전부 해제 후 그것만 장착
     *
     * 사용자가 보유하지 않은 칭호를 장착하려 하면 false 를 반환한다.
     */
    async setEquipped(characterId: number, titleId: number | null): Promise<boolean> {
        if (titleId === null) {
            await this.userTitleRepository.unselectAllByCharacterId(characterId);
            return true;
        }

        const owned = await this.userTitleRepository.findOneByCharacterIdAndTitleId(characterId, titleId);
        if (!owned) return false;

        await this.userTitleRepository.unselectAllByCharacterId(characterId);
        await this.userTitleRepository.setSelectTrue(characterId, titleId);
        return true;
    }
}
