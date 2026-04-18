/** 퀘스트 완료 시 획득 경험치 */
export const EXP_PER_QUEST = 10;

/** 퀘스트 완료 시 소모 의지력 */
export const WILLPOWER_COST = 5;

/** 레벨업에 필요한 경험치 (레벨별) */
export const EXP_TO_LEVEL_UP = (level: number) => level * 100;

/** 최대 의지력 공식 (레벨별) */
export const MAX_WILLPOWER = (level: number) => 100 + level * 10;

/** 난이도별 경험치 배율 */
export const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
};
