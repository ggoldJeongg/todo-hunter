import { CompleteQuestError } from "@/application/usecases/quest/errors/CompleteQuestError";
import { IQuestRepository, ISubTaskRepository } from "@/domain/repositories";
import { SubTaskDTO } from "@/application/usecases/quest/dtos";
import { MAX_SUBTASKS_PER_QUEST } from "@/constants/game";

/**
 * 이미 등록된 퀘스트에 서브태스크를 N개 추가한다.
 * - 빈 문자열은 자동 필터링.
 * - order 는 기존 마지막 order + 1 부터 이어붙임.
 * - 이미 완료된 퀘스트도 추가 자체는 허용. 다음 사이클에 적용됨.
 * - 한 퀘스트당 서브태스크 총 개수 제한(MAX_SUBTASKS_PER_QUEST). 초과 시 에러.
 */
export class AddSubTasksUsecase {
  constructor(
    private readonly PriQuestRepository: IQuestRepository,
    private readonly PriSubTaskRepository: ISubTaskRepository
  ) {}

  async execute(
    characterId: number,
    questId: number,
    names: string[]
  ): Promise<SubTaskDTO[]> {
    const quest = await this.PriQuestRepository.findById(questId);
    if (!quest) {
      throw new CompleteQuestError("QUEST_NOT_FOUND", "퀘스트를 찾을 수 없습니다.");
    }
    if (quest.characterId !== characterId) {
      throw new CompleteQuestError("QUEST_NOT_FOUND", "퀘스트를 찾을 수 없습니다.");
    }

    const cleanNames = names.map((n) => n.trim()).filter((n) => n.length > 0);
    if (cleanNames.length === 0) return [];

    const existing = await this.PriSubTaskRepository.findByQuestId(questId);

    // 총 개수 제한
    if (existing.length + cleanNames.length > MAX_SUBTASKS_PER_QUEST) {
      throw new CompleteQuestError(
        "SUBTASK_LIMIT_EXCEEDED",
        `서브태스크는 한 퀘스트당 최대 ${MAX_SUBTASKS_PER_QUEST}개까지 추가할 수 있습니다.`
      );
    }

    const startOrder = existing.length > 0
      ? Math.max(...existing.map((s) => s.order)) + 1
      : 0;

    const created = await this.PriSubTaskRepository.createMany(questId, cleanNames, startOrder);

    return created.map((s) => ({
      id: s.id,
      name: s.name,
      order: s.order,
      completedAt: s.completedAt,
    }));
  }
}
