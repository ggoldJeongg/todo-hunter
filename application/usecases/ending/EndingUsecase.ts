import { Status } from "@prisma/client";
import {
  ITitleRepository,
  IUserTitleRepository,
  ICharacterRepository,
  IStatusRepository,
} from "@/domain/repositories";
import { EndingDTO } from "@/application/usecases/ending/dtos";
import {
  ENDING_MAP,
  DEFAULT_ENDING_IMAGE,
  DEFAULT_ENDING_PROMPT,
} from "@/constants";

interface StatInfo {
  statName: string;
  value: number;
}

export class EndingUsecase {
  constructor(
    private readonly titleRepository: ITitleRepository,
    private readonly userTitleRepository: IUserTitleRepository,
    private readonly characterRepository: ICharacterRepository,
    private readonly statusRepository: IStatusRepository
  ) {}

  private findHighestStat(status: Status): StatInfo {
    const stats: StatInfo[] = [
      { statName: "STR", value: status.str },
      { statName: "INT", value: status.int },
      { statName: "EMO", value: status.emo },
      { statName: "FIN", value: status.fin },
      { statName: "LIV", value: status.liv },
    ];

    return stats.reduce((highest, current) =>
      current.value > highest.value ? current : highest
    );
  }

  private async saveOrUpdateUserTitle(
    characterId: number,
    titleId: number
  ): Promise<void> {
    const existingUserTitle =
      await this.userTitleRepository.findOneByCharacterIdAndTitleId(
        characterId,
        titleId
      );

    if (existingUserTitle) {
      await this.userTitleRepository.addCount(characterId, titleId);
    } else {
      await this.userTitleRepository.create(characterId, titleId);
    }
  }

  async execute(userId: number): Promise<EndingDTO> {
    const character = await this.characterRepository.findByUserId(userId);
    if (!character) {
      throw new Error("Character not found");
    }

    const status = await this.statusRepository.findByCharacterId(character.id);
    if (!status) {
      throw new Error("Status not found");
    }

    // 크론잡이 저장한 endingCode로 엔딩 데이터 조회
    const endingCode = character.endingCode ?? "ORDINARY_DAY";
    const endingInfo = ENDING_MAP[endingCode];

    // 칭호 처리 (기존 로직 유지)
    const highestStat = this.findHighestStat(status);
    const availableTitles = await this.titleRepository.findByReqStat(
      highestStat.statName.toLowerCase()
    );

    const matchingTitle = availableTitles
      .filter((title) => title.reqValue <= highestStat.value)
      .sort((a, b) => b.reqValue - a.reqValue)[0];

    if (matchingTitle) {
      await this.saveOrUpdateUserTitle(character.id, matchingTitle.id);
    }

    const defaultTitle = {
      titleName: "방랑자",
      description: "아직 자신만의 길을 찾지 못한 여행자",
    };

    const title = matchingTitle
      ? { titleName: matchingTitle.titleName, description: matchingTitle.description }
      : defaultTitle;

    // endingCode 기반 응답
    if (endingInfo) {
      return {
        endingState: character.endingState,
        endingCode,
        endingName: endingInfo.name,
        endingStory: endingInfo.story,
        endingDialogue: endingInfo.dialogue,
        endingImage: endingInfo.image,
        achievableTitle: title,
      };
    }

    // endingCode에 매칭되는 엔딩이 없을 경우 기본값
    const fallback = ENDING_MAP["ORDINARY_DAY"];
    return {
      endingState: character.endingState,
      endingCode: "ORDINARY_DAY",
      endingName: "평범한 하루",
      endingStory: fallback?.story ?? [DEFAULT_ENDING_PROMPT],
      endingDialogue: fallback?.dialogue ?? [],
      endingImage: DEFAULT_ENDING_IMAGE,
      achievableTitle: defaultTitle,
    };
  }
}
