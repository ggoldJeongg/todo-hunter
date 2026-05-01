// 단일 캐릭터의 그 주 엔딩 + 칭호를 결정해서 EndingHistory 에 확정 저장
// — cron, lazy fallback, dev trigger 가 모두 이 Usecase 를 호출 (단일 진실)
//
// 주요 책임:
//  1. 주차 결정 (getISOWeek)
//  2. 그 주 완료 퀘스트 카운트 집계
//  3. 현재 스탯 스냅샷 캡처
//  4. resolveEnding 으로 endingCode 결정
//  5. 가장 높은 스탯 기반 칭호 매칭 + UserTitle 갱신 (한 주에 한 번만)
//  6. EndingHistory.upsertIfAbsent (이미 있으면 안 덮음)
//  7. Character.endingState 활성화 (2: ENABLED)

import { Status, Title } from "@prisma/client";
import {
  ICharacterRepository,
  IStatusRepository,
  IQuestRepository,
  ISuccessDayRepository,
  IEndingHistoryRepository,
  ITitleRepository,
  IUserTitleRepository,
} from "@/domain/repositories";
import { resolveEnding } from "@/constants/endingResolver";
import { getISOWeek, getWeekStart, getNow } from "@/utils/clock";

export interface ResolveWeeklyEndingResult {
  characterId: number;
  weekKey: string;
  endingCode: string;
  completedCount: number;
  awardedTitleId: number | null;
  isNewlyResolved: boolean; // 이번 호출에서 새로 만들었는지
}

interface StatInfo {
  statName: string;
  value: number;
}

export class ResolveWeeklyEndingUsecase {
  constructor(
    private readonly characterRepository: ICharacterRepository,
    private readonly statusRepository: IStatusRepository,
    private readonly questRepository: IQuestRepository,
    private readonly successDayRepository: ISuccessDayRepository,
    private readonly endingHistoryRepository: IEndingHistoryRepository,
    private readonly titleRepository: ITitleRepository,
    private readonly userTitleRepository: IUserTitleRepository
  ) {}

  /** 가장 높은 스탯 결정 */
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

  /** 가장 높은 스탯에 해당하는 매칭 칭호 찾기 (없으면 null) */
  private async findMatchingTitle(status: Status): Promise<Title | null> {
    const highestStat = this.findHighestStat(status);
    if (highestStat.value <= 0) return null;

    const availableTitles = await this.titleRepository.findByReqStat(
      highestStat.statName.toLowerCase()
    );

    const matching = availableTitles
      .filter((title) => title.reqValue <= highestStat.value)
      .sort((a, b) => b.reqValue - a.reqValue)[0];

    return matching ?? null;
  }

  /** UserTitle 부여 — 이미 있으면 addCount, 없으면 create */
  private async awardTitle(
    characterId: number,
    titleId: number
  ): Promise<void> {
    const existing =
      await this.userTitleRepository.findOneByCharacterIdAndTitleId(
        characterId,
        titleId
      );
    if (existing) {
      await this.userTitleRepository.addCount(characterId, titleId);
    } else {
      await this.userTitleRepository.create(characterId, titleId);
    }
  }

  /**
   * 단일 캐릭터의 그 주 엔딩 + 칭호 처리
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
        awardedTitleId: existing.awardedTitleId ?? null,
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

    // 칭호 매칭 + 부여 (한 번만)
    const matchingTitle = await this.findMatchingTitle(status);
    if (matchingTitle) {
      await this.awardTitle(characterId, matchingTitle.id);
    }

    // 확정 저장 (엔딩 + 칭호 한 번에)
    await this.endingHistoryRepository.upsertIfAbsent({
      characterId,
      weekKey,
      endingCode,
      completedCount,
      statsSnapshot,
      awardedTitleId: matchingTitle?.id ?? null,
    });

    // Character 메타 동기화 — 빠른 조회용 캐시 + endingState=ENABLED(2) 활성화
    await this.characterRepository.updateEndingMeta(characterId, {
      endingState: 2,
      endingCode,
    });

    return {
      characterId,
      weekKey,
      endingCode,
      completedCount,
      awardedTitleId: matchingTitle?.id ?? null,
      isNewlyResolved: true,
    };
  }

  /**
   * 모든 캐릭터에 대해 주간 엔딩 처리 (cron 용)
   */
  async executeForAllCharacters(now: Date = getNow()): Promise<{
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
