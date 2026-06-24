import { CompleteQuestError } from "@/application/usecases/quest/errors/CompleteQuestError";
import {
  ICharacterRepository,
  IQuestRepository,
  IStatusRepository,
  ISubTaskRepository,
  ISuccessDayRepository,
} from "@/domain/repositories";
import { EXP_PER_QUEST, WILLPOWER_COST, EXP_TO_LEVEL_UP, MAX_WILLPOWER, DIFFICULTY_MULTIPLIER, getStatGain } from "@/constants/game";
import { getTodayStart, getThisWeekStart, getNextDayStart } from "@/utils/date";
import { Character, Status } from "@prisma/client";

// 트랜잭션 내부에서 쓰기에 사용할 레포지토리 묶음.
// Route 에서 prisma.$transaction((tx) => ...) 로 tx 바인딩된 구현체를 넘겨준다.
export type CompleteQuestRepositories = {
  questRepository: IQuestRepository;
  successDayRepository: ISuccessDayRepository;
  characterRepository: ICharacterRepository;
  statusRepository: IStatusRepository;
};

export type CompleteQuestTransaction = <T>(
  operation: (repositories: CompleteQuestRepositories) => Promise<T>
) => Promise<T>;

// 같은 주기에 이미 완료된 경우(동시 요청 경쟁 포함)를 쓰기 단계에서 안전하게 중단하기 위한 내부 신호.
// 트랜잭션 안에서 throw 되면 전체가 롤백되고, 바깥에서 멱등 no-op 으로 흡수된다.
class AlreadyCompletedSignal extends Error {
  constructor() {
    super("QUEST_ALREADY_COMPLETED");
    this.name = "AlreadyCompletedSignal";
  }
}

export class CompleteQuestUsecase {
  constructor(
    private PriQuestRepository: IQuestRepository,
    private PriSuccessDayRepository: ISuccessDayRepository,
    private PriCharacterRepository: ICharacterRepository,
    private PriStatusRepository: IStatusRepository,
    private PriSubTaskRepository?: ISubTaskRepository,
    // 주입 시: SuccessDay 생성·Quest 만료·Status·Character 보상을 하나의 트랜잭션으로 원자 처리.
    // 미주입 시(테스트 등): 기존처럼 주입된 레포지토리로 직접 실행.
    private transaction?: CompleteQuestTransaction
  ) {}


  // 퀘스트 완료 처리 메서드.
  // - 서브태스크가 0개인 경우: 기존대로 한 번에 완료.
  // - 서브태스크가 N개인 경우: 모든 서브태스크가 완료된 상태에서만 호출되어야 함.
  //   (CompleteSubTaskUsecase 가 마지막 서브태스크 완료 시 자동 위임)
  //   직접 호출돼서 서브태스크가 미완료면 SUBTASKS_PENDING 에러.
  //
  // 구조: [읽기 단계] 검증·보상 계산(쓰기 없음) → [쓰기 단계] 4개 쓰기를 하나의 트랜잭션으로 원자 처리.
  async completeQuest(characterId: number, questId: number): Promise<void> {
    // ===== 읽기 단계: 검증과 계산만 수행, DB 쓰기 없음 =====

    // 1. 해당 퀘스트를 찾아서 `characterId` 검증
    const quest = await this.PriQuestRepository.findById(questId);
    if (!quest) {
        throw new CompleteQuestError("QUEST_NOT_FOUND", "퀘스트를 찾을 수 없습니다.");
    }
    if (quest.characterId !== characterId) {
        throw new CompleteQuestError("QUEST_NOT_FOUND", "퀘스트를 찾을 수 없습니다.");
    }

    // 1-1. 서브태스크 가드: 서브태스크가 1개 이상인 경우, 모두 완료돼야 진짜 완료 처리.
    if (this.PriSubTaskRepository) {
      const total = await this.PriSubTaskRepository.countByQuestId(questId);
      if (total > 0) {
        const done = await this.PriSubTaskRepository.countCompletedByQuestId(questId);
        if (done < total) {
          throw new CompleteQuestError(
            "SUBTASKS_PENDING",
            `서브태스크 ${done}/${total} 완료. 남은 서브태스크를 모두 완료해야 합니다.`
          );
        }
      }
    }

    // 2. 캐릭터 의지력 확인
    const character = await this.PriCharacterRepository.findById(characterId);
    if (!character) {
        throw new CompleteQuestError("CHARACTER_NOT_FOUND", "캐릭터를 찾을 수 없습니다.");
    }
    if (character.willpower < WILLPOWER_COST) {
        throw new CompleteQuestError("WILLPOWER_DEPLETED", "의지력이 부족하여 퀘스트를 완료할 수 없습니다.");
    }

    // 3. 현재 주기(데일리=오늘, 주간=이번 주) 내 중복 완료 사전 차단(정상 케이스).
    //    동시 요청 경쟁은 쓰기 단계의 SuccessDay unique 제약이 최종 방어한다.
    const since = quest.isWeekly ? getThisWeekStart() : getTodayStart();
    const existingSuccess = await this.PriSuccessDayRepository.findByQuestIdSince(questId, since);
    if (existingSuccess.length > 0) {
        return;
    }

    // 4. 캐릭터 상태(Status) 가져오기
    const characterStatus = await this.PriStatusRepository.findByCharacterId(characterId);
    if (!characterStatus) {
        throw new CompleteQuestError("STATUS_NOT_FOUND", "캐릭터 상태 정보를 찾을 수 없습니다.");
    }

    // 5. 보상 계산 (쓰기 전에 모두 계산해 둔다 → 트랜잭션 구간을 최소화)
    const statGain = getStatGain(quest.difficulty);
    const updatedStatus = this.applyStatGain(characterStatus, quest.tagged, statGain);
    const characterStats = this.computeCharacterStats(character, quest.difficulty);
    const cycleKey = this.getCompletionCycleKey(quest.isWeekly);
    const shouldSetExpiry = !quest.isWeekly && !quest.expiredAt;

    // ===== 쓰기 단계: 하나의 트랜잭션으로 원자 처리 =====
    const persist = (repositories: CompleteQuestRepositories) =>
      this.persistCompletion(repositories, {
        questId,
        cycleKey,
        shouldSetExpiry,
        updatedStatus,
        characterId,
        characterStats,
      });

    try {
      if (this.transaction) {
        await this.transaction(persist);
      } else {
        await persist({
          questRepository: this.PriQuestRepository,
          successDayRepository: this.PriSuccessDayRepository,
          characterRepository: this.PriCharacterRepository,
          statusRepository: this.PriStatusRepository,
        });
      }
    } catch (error) {
      // 동시 완료 경쟁에서 진 경우: 트랜잭션은 이미 롤백됐고, 보상 없이 멱등 종료.
      if (error instanceof AlreadyCompletedSignal) {
        return;
      }
      throw error;
    }
  }

  // 실제 쓰기 4종. 트랜잭션 콜백(또는 직접 실행)에서 호출되며, 어느 한 단계라도 실패하면
  // 전체가 롤백되어 "완료 기록만 남고 보상은 안 들어가는" 불일치가 생기지 않는다.
  private async persistCompletion(
    repositories: CompleteQuestRepositories,
    data: {
      questId: number;
      cycleKey: string;
      shouldSetExpiry: boolean;
      updatedStatus: Status;
      characterId: number;
      characterStats: { level: number; exp: number; willpower: number; maxWillpower: number };
    }
  ): Promise<void> {
    // 1. SuccessDay 완료 기록. unique(questId, cycleKey) 위반 시 null → 동시 완료 경쟁 → 롤백 신호.
    const successDay = await repositories.successDayRepository.createForCycle(data.questId, data.cycleKey);
    if (!successDay) {
      throw new AlreadyCompletedSignal();
    }

    // 2. 일간 퀘스트(일회성 할일)는 완료 즉시 expiredAt을 다음 날 0시로 세팅하여
    //    자정이 지나면 UI에서 자연스럽게 사라지게 한다. 주간 퀘스트(반복 습관)는 건너뜀.
    if (data.shouldSetExpiry) {
      await repositories.questRepository.update(data.questId, { expiredAt: getNextDayStart() });
    }

    // 3. 스탯 갱신
    await repositories.statusRepository.update(data.updatedStatus);

    // 4. 경험치/의지력/레벨업 갱신
    await repositories.characterRepository.updateCharacterStats(data.characterId, data.characterStats);
  }

  // 퀘스트 태그에 해당하는 스탯에 증가량을 더한 새 Status 객체를 반환 (원본 불변).
  private applyStatGain(status: Status, tagged: string, statGain: number): Status {
    const next: Status = { ...status };
    switch (tagged) {
      case "STR":
        next.str += statGain;
        break;
      case "INT":
        next.int += statGain;
        break;
      case "EMO":
        next.emo += statGain;
        break;
      case "FIN":
        next.fin += statGain;
        break;
      case "LIV":
        next.liv += statGain;
        break;
      default:
        throw new CompleteQuestError("INVALID_TAG", "유효하지 않은 태그입니다.");
    }
    return next;
  }

  // 경험치 증가(난이도 배율) + 의지력 소모 + 레벨업 판정을 계산.
  private computeCharacterStats(
    character: Character,
    difficulty: string
  ): { level: number; exp: number; willpower: number; maxWillpower: number } {
    const expMultiplier = DIFFICULTY_MULTIPLIER[difficulty] ?? DIFFICULTY_MULTIPLIER["normal"];
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

    return { level: newLevel, exp: newExp, willpower: newWillpower, maxWillpower: newMaxWillpower };
  }

  private getCompletionCycleKey(isWeekly: boolean, now: Date = new Date()): string {
    const start = isWeekly ? getThisWeekStart(now) : getTodayStart(now);
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, "0");
    const day = String(start.getDate()).padStart(2, "0");

    return `${isWeekly ? "weekly" : "daily"}:${year}-${month}-${day}`;
  }
}
