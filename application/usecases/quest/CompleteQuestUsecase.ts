import { CompleteQuestError } from "@/application/usecases/quest/errors/CompleteQuestError";
import { ICharacterRepository, IQuestRepository, IStatusRepository, ISuccessDayRepository } from "@/domain/repositories";
import { EXP_PER_QUEST, WILLPOWER_COST, EXP_TO_LEVEL_UP, MAX_WILLPOWER, DIFFICULTY_MULTIPLIER } from "@/constants/game";
import { getTodayStart, getThisWeekStart, getNextDayStart } from "@/utils/date";

export class CompleteQuestUsecase {
  constructor(
  private PriQuestRepository: IQuestRepository,
  private PriSuccessDayRepository: ISuccessDayRepository,
  private PriCharacterRepository: ICharacterRepository,
  private PriStatusRepository: IStatusRepository,
) {}


  // 퀘스트 완료 처리 메서드
  async completeQuest(characterId: number, questId: number): Promise<void> {
    // 1. 해당 퀘스트를 찾아서 `characterId` 검증
    const quest = await this.PriQuestRepository.findById(questId);
    if (!quest) {
        throw new CompleteQuestError("QUEST_NOT_FOUND", "퀘스트를 찾을 수 없습니다.");
    }
    if (quest.characterId !== characterId) {
        throw new CompleteQuestError("QUEST_NOT_FOUND", "퀘스트를 찾을 수 없습니다.");
    }

    // 2. 캐릭터 의지력 확인
    const character = await this.PriCharacterRepository.findById(characterId);
    if (!character) {
        throw new CompleteQuestError("CHARACTER_NOT_FOUND", "캐릭터를 찾을 수 없습니다.");
    }
    if (character.willpower < WILLPOWER_COST) {
        throw new CompleteQuestError("WILLPOWER_DEPLETED", "의지력이 부족하여 퀘스트를 완료할 수 없습니다.");
    }

    // 3. 현재 주기(데일리=오늘, 주간=이번 주) 내 중복 완료 방지.
    //    SuccessDay 자체는 영구 보존하여 스트릭/통계 등 추후 활용 가능.
    const since = quest.isWeekly ? getThisWeekStart() : getTodayStart();
    const existingSuccess = await this.PriSuccessDayRepository.findByQuestIdSince(questId, since);
    if (existingSuccess.length > 0) {
        return;
    }

    // 3. SuccessDay에 퀘스트 완료 기록 추가
    await this.PriSuccessDayRepository.create(questId);

    // 3-1. 일간 퀘스트(일회성 할일)는 완료 즉시 expiredAt을 다음 날 0시로 세팅하여
    //      자정이 지나면 UI에서 자연스럽게 사라지게 한다. 주간 퀘스트(반복 습관)는 건너뜀.
    if (!quest.isWeekly && !quest.expiredAt) {
        await this.PriQuestRepository.update(questId, { expiredAt: getNextDayStart() });
    }

    // 4. 캐릭터 상태(Status) 가져오기
    const characterStatus = await this.PriStatusRepository.findByCharacterId(characterId);
    if (!characterStatus) {
        throw new CompleteQuestError("STATUS_NOT_FOUND", "캐릭터 상태 정보를 찾을 수 없습니다.");
    }

    // 5. 퀘스트의 태그 값을 기반으로 상태 업데이트
    const { tagged } = quest;

    switch (tagged) {
        case "STR":
            characterStatus.str += 1;
            break;
        case "INT":
            characterStatus.int += 1;
            break;
        case "EMO":
            characterStatus.emo += 1;
            break;
        case "FIN":
            characterStatus.fin += 1;
            break;
        case "LIV":
            characterStatus.liv += 1;
            break;
        default:
            throw new CompleteQuestError("INVALID_TAG", "유효하지 않은 태그입니다.");
    }

    // 6. 스탯 상태 업데이트
    await this.PriStatusRepository.update(characterStatus);

    // 7. 경험치 증가 (난이도 배율 적용) + 의지력 소모 + 레벨업 판정
    const expMultiplier = DIFFICULTY_MULTIPLIER[quest.difficulty] ?? DIFFICULTY_MULTIPLIER["normal"];
    let newExp = character.exp + EXP_PER_QUEST * expMultiplier;
    let newWillpower = Math.max(character.willpower - WILLPOWER_COST, 0);
    let newLevel = character.level;
    let newMaxWillpower = character.maxWillpower;

    if (newExp >= EXP_TO_LEVEL_UP(character.level)) {
        newLevel = character.level + 1;
        newExp = 0;
        newMaxWillpower = MAX_WILLPOWER(newLevel);
        newWillpower = newMaxWillpower; // 레벨업 시 의지력 완충
    }

    await this.PriCharacterRepository.updateCharacterStats(characterId, {
        level: newLevel,
        exp: newExp,
        willpower: newWillpower,
        maxWillpower: newMaxWillpower,
    });
}
}
