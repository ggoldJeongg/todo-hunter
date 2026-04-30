import { EndingHistory, Prisma } from "@prisma/client";

export interface IEndingHistoryRepository {
  /** (characterId, weekKey) 로 단일 row 조회 */
  findByCharacterAndWeek(
    characterId: number,
    weekKey: string
  ): Promise<EndingHistory | null>;

  /**
   * Upsert — 이미 있으면 그대로 두고(덮어쓰지 않음), 없으면 새 row 생성.
   * 확정 저장 구조: 한 번 결정된 엔딩은 변경되지 않음.
   */
  upsertIfAbsent(input: {
    characterId: number;
    weekKey: string;
    endingCode: string;
    completedCount: number;
    statsSnapshot: Prisma.InputJsonValue;
  }): Promise<EndingHistory>;

  /** 캐릭터의 모든 히스토리 (최신순) — 도감/통계용 */
  findAllByCharacter(characterId: number): Promise<EndingHistory[]>;

  /** 특정 row를 "확인됨" 상태로 마킹 */
  markChecked(id: number, checkedAt: Date): Promise<EndingHistory>;
}
