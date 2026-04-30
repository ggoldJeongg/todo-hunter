// 단일 캐릭터의 그 주 엔딩을 결정해서 EndingHistory 에 확정 저장
// — cron, lazy fallback, dev trigger 가 모두 이 Usecase 를 호출 (단일 진실)
//
// 주요 책임:
//  1. 주차 결정 (getISOWeek)
//  2. 그 주 완료 퀘스트 카운트 집계
//  3. 현재 스탯 스냅샷 캡처
//  4. resolveEnding 으로 endingCode 결정
//  5. EndingHistory.upsertIfAbsent (이미 있으면 안 덮음)
//  6. Character.endingState 활성화 (2: ENABLED)

import {
  ICharacterRepository,
  IStatusRepository,
  IQuestRepository,
  ISuccessDayRepository,
  IEndingHistoryRepository,
} from "@/domain/repositories";
import { resolveEnding } from "@/constants/endingResolver";
import { getISOWeek, getWeekStart, getNow } from "@/utils/clock";

export interface ResolveWeeklyEndingResult {
  characterId: number;
  weekKey: string;
  endingCode: string;
  completedCount: number;
  isNewlyResolved: boolean; // 이번 호출에서 새로 만들었는지 (lazy fallback 통계용)
}

export class ResolveWeeklyEndingUsecase {
  constructor(
    private readonly characterRepository: ICharacterRepository,
    private readonly statusRepository: IStatusRepository,
    private readonly questRepository: IQuestRepository,
    private readonly successDayRepository: ISuccessDayRepository,
    private readonly endingHistoryRepository: IEndingHistoryRepository
  ) {}

  /**
   * 단일 캐릭터의 그 주 엔딩 처리
   * @param characterId
   * @param now 시각 — 테스트/cron 에서 명시 가능. 기본은 clock.getNow()
   */
  async executeForCharacter(
    characterId: number,
    now: Date = getNow()
  ): Promise<ResolveWeeklyEndingResult | null> {
    const character = await this.characterRepository.findById(characterId);
    if (!character) return null;

    const status = await this.statusRepository.findByCharacterId(characterId);
    if (!status) return null;

    const weekKey = getISOWeek(now);

    // 이미 이 주 row 가 있으면 그대로 반환 (확정 저장 — 덮어쓰지 않음)
    const existing = await this.endingHistoryRepository.findByCharacterAndWeek(
      characterId,
      weekKey
    );
    if (existing) {
      return {
        characterId,
        weekKey,
        endingCode: existing.endingCode,
        completedCount: existing.completedCount,
        isNewlyResolved: false,
      };
    }

    // 그 주 완료 퀘스트 카운트
    const weekStart = getWeekStart(now);
    const allQuests = await this.questRepository.findByCreatedAt(characterId);
    const questIds = allQuests.map((q) => q.id);
    const completedThisWeek =
      questIds.length > 0
        ? await this.successDayRepository.findByQuestIdsSince(
            questIds,
            weekStart
          )
        : [];
    const completedCount = completedThisWeek.length;

    // 스탯 스냅샷
    const statsSnapshot = {
      str: status.str,
      int: status.int,
      emo: status.emo,
      fin: status.fin,
      liv: status.liv,
    };

    // 엔딩 결정
    const endingCode = resolveEnding(statsSnapshot, completedCount);

    // 확정 저장
    await this.endingHistoryRepository.upsertIfAbsent({
      characterId,
      weekKey,
      endingCode,
      completedCount,
      statsSnapshot,
    });

    // Character 메타 동기화 — 빠른 조회용 캐시 + endingState=ENABLED(2) 로 활성화
    await this.characterRepository.updateEndingMeta(characterId, {
      endingState: 2,
      endingCode,
    });

    return {
      characterId,
      weekKey,
      endingCode,
      completedCount,
      isNewlyResolved: true,
    };
  }

  /**
   * 모든 캐릭터에 대해 주간 엔딩 처리 (cron 용)
   * @param now 시각
   */
  async executeForAllCharacters(
    now: Date = getNow()
  ): Promise<{
    total: number;
    newlyResolved: number;
    alreadyResolved: number;
    results: ResolveWeeklyEndingResult[];
  }> {
    const characterIds = await this.characterRepository.findAllIds();
    const results: ResolveWeeklyEndingResult[] = [];
    let newlyResolved = 0;
    let alreadyResolved = 0;

    for (const characterId of characterIds) {
      try {
        const result = await this.executeForCharacter(characterId, now);
        if (result) {
          results.push(result);
          if (result.isNewlyResolved) newlyResolved++;
          else alreadyResolved++;
        }
      } catch (err) {
        // 한 캐릭터 처리 실패해도 다음으로 진행 (cron resilience)
        console.error(
          `[ResolveWeeklyEnding] character ${characterId} 처리 실패:`,
          err
        );
      }
    }

    return {
      total: characterIds.length,
      newlyResolved,
      alreadyResolved,
      results,
    };
  }
}
