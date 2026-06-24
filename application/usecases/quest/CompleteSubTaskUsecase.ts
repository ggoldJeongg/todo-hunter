import { CompleteQuestError } from "@/application/usecases/quest/errors/CompleteQuestError";
import {
  ICharacterRepository,
  IQuestRepository,
  IStatusRepository,
  ISubTaskRepository,
  ISuccessDayRepository,
} from "@/domain/repositories";
import { CompleteQuestUsecase, CompleteQuestTransaction } from "@/application/usecases/quest/CompleteQuestUsecase";
import { WILLPOWER_COST } from "@/constants/game";

export interface CompleteSubTaskResult {
  /** 이 서브태스크 완료 후 누적 완료 수 */
  completedCount: number;
  /** 해당 퀘스트의 전체 서브태스크 수 */
  totalCount: number;
  /** 모든 서브태스크가 완료되어 퀘스트 자체가 끝났는지 여부 */
  questCompleted: boolean;
  /** 완료된 서브태스크 ID */
  subTaskId: number;
  /** 소속 퀘스트 ID */
  questId: number;
}

export class CompleteSubTaskUsecase {
  constructor(
    private PriQuestRepository: IQuestRepository,
    private PriSubTaskRepository: ISubTaskRepository,
    private PriSuccessDayRepository: ISuccessDayRepository,
    private PriCharacterRepository: ICharacterRepository,
    private PriStatusRepository: IStatusRepository,
    // 마지막 서브태스크 완료로 퀘스트가 끝날 때, 위임되는 퀘스트 완료 보상도 동일하게 원자 처리.
    private transaction?: CompleteQuestTransaction
  ) {}

  // 단일 서브태스크 완료 처리.
  // - 서브태스크 자체에 completedAt 마킹.
  // - 마지막 서브태스크였으면 CompleteQuestUsecase 로 위임하여 EXP/스탯/의지력 처리.
  // - 일부만 완료된 상태면 진행도만 반환 (애니메이션은 클라이언트에서 처리).
  async execute(characterId: number, subTaskId: number): Promise<CompleteSubTaskResult> {
    // 1. 서브태스크 + 소속 퀘스트 검증
    const subTask = await this.PriSubTaskRepository.findById(subTaskId);
    if (!subTask) {
      throw new CompleteQuestError("SUBTASK_NOT_FOUND", "서브태스크를 찾을 수 없습니다.");
    }

    const quest = await this.PriQuestRepository.findById(subTask.questId);
    if (!quest) {
      throw new CompleteQuestError("QUEST_NOT_FOUND", "퀘스트를 찾을 수 없습니다.");
    }
    if (quest.characterId !== characterId) {
      throw new CompleteQuestError("QUEST_NOT_FOUND", "퀘스트를 찾을 수 없습니다.");
    }

    // 2. 이미 완료된 서브태스크면 idempotent 처리: 진행도만 반환.
    if (subTask.completedAt !== null) {
      const totalCount = await this.PriSubTaskRepository.countByQuestId(quest.id);
      const completedCount = await this.PriSubTaskRepository.countCompletedByQuestId(quest.id);
      return {
        subTaskId,
        questId: quest.id,
        completedCount,
        totalCount,
        questCompleted: completedCount >= totalCount && totalCount > 0,
      };
    }

    // 3-pre. 마지막 서브태스크라면 markCompleted 하기 전에 의지력 체크.
    //        (markCompleted 후 의지력 부족으로 throw 되면 서브태스크만 마킹된 채 quest 가 완료 못 되는 막다른 상태가 생김)
    const totalBefore = await this.PriSubTaskRepository.countByQuestId(quest.id);
    const completedBefore = await this.PriSubTaskRepository.countCompletedByQuestId(quest.id);
    const isLast = totalBefore > 0 && completedBefore + 1 >= totalBefore;
    if (isLast) {
      const character = await this.PriCharacterRepository.findById(characterId);
      if (!character) {
        throw new CompleteQuestError("CHARACTER_NOT_FOUND", "캐릭터를 찾을 수 없습니다.");
      }
      if (character.willpower < WILLPOWER_COST) {
        throw new CompleteQuestError(
          "WILLPOWER_DEPLETED",
          "의지력이 부족하여 마지막 서브태스크를 완료할 수 없습니다."
        );
      }
    }

    // 3. 서브태스크 완료 마킹
    await this.PriSubTaskRepository.markCompleted(subTaskId, new Date());

    const totalCount = await this.PriSubTaskRepository.countByQuestId(quest.id);
    const completedCount = await this.PriSubTaskRepository.countCompletedByQuestId(quest.id);

    // 4. 모두 완료된 경우 퀘스트 완료 위임
    let questCompleted = false;
    if (completedCount >= totalCount && totalCount > 0) {
      const completeQuestUsecase = new CompleteQuestUsecase(
        this.PriQuestRepository,
        this.PriSuccessDayRepository,
        this.PriCharacterRepository,
        this.PriStatusRepository,
        this.PriSubTaskRepository,
        this.transaction
      );
      await completeQuestUsecase.completeQuest(characterId, quest.id);
      questCompleted = true;
    }

    return {
      subTaskId,
      questId: quest.id,
      completedCount,
      totalCount,
      questCompleted,
    };
  }
}
