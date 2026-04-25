import { TITLE_FALLBACK_IMAGE, TITLE_IMAGES } from "@/constants/title";
import { ITitleRepository, IUserTitleRepository, IStatusRepository } from "@/domain/repositories";
import { TitleDexDTO } from "./dtos/RenderTitleDTO";

export class UserTitleUsecase {
    constructor(
        private readonly IUserTitleRepository: IUserTitleRepository,
        private readonly ITitleRepository: ITitleRepository,
        private readonly IStatusRepository?: IStatusRepository,
    ) {}

    /** 스탯 조건을 충족한 칭호를 자동 해금 */
    async unlockEligibleTitles(characterId: number) {
        if (!this.IStatusRepository) return;

        const status = await this.IStatusRepository.findByCharacterId(characterId);
        if (!status) return;

        const allTitles = await this.ITitleRepository.findAll();
        const statMap: Record<string, number> = {
            str: status.str,
            int: status.int,
            emo: status.emo,
            fin: status.fin,
            liv: status.liv,
        };

        for (const title of allTitles) {
            const currentValue = statMap[title.reqStat] ?? 0;
            if (currentValue >= title.reqValue) {
                const existing = await this.IUserTitleRepository.findOneByCharacterIdAndTitleId(
                    characterId, title.id
                );
                if (!existing) {
                    await this.IUserTitleRepository.create(characterId, title.id);
                }
            }
        }
    }

    /**
     * 칭호 도감 전체를 반환한다.
     * - 모든 Title 카탈로그 + 사용자 보유 여부/카운트/장착 상태를 머지
     * - 잠금 칭호도 포함하므로 클라이언트가 도감을 한 번에 그릴 수 있다
     */
    async getTitleDex(characterId: number): Promise<TitleDexDTO> {
        await this.unlockEligibleTitles(characterId);

        const allTitles = await this.ITitleRepository.findAll();
        const userTitles = await this.IUserTitleRepository.findAllByCharacterIdNoPaging(characterId);

        const userTitleByTitleId = new Map<number, { count: number; isSelected: boolean }>();
        for (const ut of userTitles) {
            userTitleByTitleId.set(ut.titleId, { count: ut.count, isSelected: ut.isSelected });
        }

        const equipped = userTitles.find(ut => ut.isSelected);

        const titles = allTitles
            .sort((a, b) => a.id - b.id)
            .map(title => {
                const owned = userTitleByTitleId.get(title.id);
                return {
                    titleId: title.id,
                    name: title.titleName,
                    description: title.description,
                    reqStat: title.reqStat,
                    reqValue: title.reqValue,
                    img: TITLE_IMAGES[title.id] ?? TITLE_FALLBACK_IMAGE,
                    count: owned?.count ?? 0,
                    unlocked: !!owned,
                    equipped: !!owned?.isSelected,
                };
            });

        return {
            titles,
            equippedTitleId: equipped?.titleId ?? null,
        };
    }
}
