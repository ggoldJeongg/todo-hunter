import { TITLE_IMAGES } from "@/constants/title";
import { ITitleRepository, IUserTitleRepository, IStatusRepository } from "@/domain/repositories";
import { Status } from "@prisma/client";

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

    async getUserTitles(characterId: number, page: number) {
        // 자동 해금 체크
        await this.unlockEligibleTitles(characterId);

        // 1. 사용자가 가지고 있는 타이틀 ID 목록을 조회
        const userTitles = await this.IUserTitleRepository.findAllByCharacterId(characterId, page);

        // 2. 타이틀 ID 목록을 사용하여 타이틀 정보 조회
        const titleIds = userTitles.map(userTitle => userTitle.titleId);
        const titles = await this.ITitleRepository.findManyByIds(titleIds);

        // 3. 필요한 데이터를 반환
        return titles.map(title => ({
            name: title.titleName,
            count: userTitles.find(userTitle => userTitle.titleId === title.id)?.count || 0,
            description: title.description,
            reqStat: title.reqStat,
            reqValue: title.reqValue,
            img: TITLE_IMAGES[title.id],
        }));
    }

}
