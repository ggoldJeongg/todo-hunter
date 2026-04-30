// 스탯 분포 + 완료 카운트 → endingCode 결정 함수
// ENDING_MAP 의 19개 키와 매칭
//
// 결정 우선순위:
//   1. 게임 참여 자체가 부족 → LAZY_ADVENTURER
//   2. 모든 스탯이 매우 높고 활동량 많음 → LEGENDARY
//   3. 모든 스탯이 균형 있게 높음 → TRUE_HERO
//   4. 두 스탯 조합 (특정 직업) → MAGIC_SWORDSMAN, SAGE_PATH 등
//   5. 단일 스탯 강자 → STEEL_WARRIOR, EMPATHY_POET 등
//   6. 매칭 안 됨 → ORDINARY_DAY (기본)

export interface StatSnapshot {
  str: number;
  int: number;
  emo: number;
  fin: number;
  liv: number;
}

const LAZY_THRESHOLD = 3;        // 미만 = 게임 참여 부족
const LEGEND_COUNT = 30;         // 이상 + 모든 스탯 30+ = 전설
const HERO_STAT_MIN = 20;        // 모든 스탯 이상 = 영웅
const SINGLE_STAT_HIGH = 25;     // 단일 스탯 강자 임계
const DUAL_STAT_HIGH = 18;       // 듀얼 스탯 직업 임계
const OTHER_STATS_LOW = 8;       // 단일 강자에서 "다른 스탯이 낮다"는 기준

/**
 * 스탯 + 완료 카운트로 그 주의 endingCode 결정
 * 단위 테스트 가능한 순수 함수 (시간/DB 의존성 없음)
 */
export function resolveEnding(stats: StatSnapshot, completedCount: number): string {
  // ===== 1. 게임 참여 부족 — 무조건 LAZY =====
  if (completedCount < LAZY_THRESHOLD) {
    return "LAZY_ADVENTURER";
  }

  const { str, int, emo, fin, liv } = stats;
  const allStats = [str, int, emo, fin, liv];
  const minStat = Math.min(...allStats);

  // ===== 2. 전설 (모든 스탯 30+, 활동 많음) =====
  if (completedCount >= LEGEND_COUNT && minStat >= 30) {
    return "LEGENDARY";
  }

  // ===== 3. 진정한 용사 (모든 스탯 균형 있게 높음) =====
  if (minStat >= HERO_STAT_MIN) {
    return "TRUE_HERO";
  }

  // ===== 4. 듀얼 스탯 직업 (특정 두 스탯 조합) =====
  // 마법검사: STR + INT
  if (str >= DUAL_STAT_HIGH && int >= DUAL_STAT_HIGH) {
    return "MAGIC_SWORDSMAN";
  }
  // 현자의 길: INT + EMO
  if (int >= DUAL_STAT_HIGH && emo >= DUAL_STAT_HIGH) {
    return "SAGE_PATH";
  }
  // 수호 기사: STR + LIV
  if (str >= DUAL_STAT_HIGH && liv >= DUAL_STAT_HIGH) {
    return "GUARDIAN_KNIGHT";
  }
  // 길드 마스터: FIN + LIV
  if (fin >= DUAL_STAT_HIGH && liv >= DUAL_STAT_HIGH) {
    return "GUILD_MASTER";
  }
  // 야생 사냥꾼: STR + EMO
  if (str >= DUAL_STAT_HIGH && emo >= DUAL_STAT_HIGH) {
    return "WILD_HUNTER";
  }
  // 치유 마법사: INT + LIV
  if (int >= DUAL_STAT_HIGH && liv >= DUAL_STAT_HIGH) {
    return "HEALING_MAGE";
  }
  // 연금술사: INT + FIN
  if (int >= DUAL_STAT_HIGH && fin >= DUAL_STAT_HIGH) {
    return "ALCHEMIST";
  }
  // 발명가: STR + FIN
  if (str >= DUAL_STAT_HIGH && fin >= DUAL_STAT_HIGH) {
    return "INVENTOR";
  }
  // 음유시인: EMO + FIN
  if (emo >= DUAL_STAT_HIGH && fin >= DUAL_STAT_HIGH) {
    return "BARD";
  }
  // 드루이드: EMO + LIV
  if (emo >= DUAL_STAT_HIGH && liv >= DUAL_STAT_HIGH) {
    return "DRUID";
  }
  // 마을의 수호자: LIV 위주 + 균형
  if (liv >= DUAL_STAT_HIGH && str >= 10 && int >= 10) {
    return "VILLAGE_GUARDIAN";
  }

  // ===== 5. 단일 스탯 강자 (다른 스탯은 낮음) =====
  const isStrFocused =
    str >= SINGLE_STAT_HIGH &&
    int < OTHER_STATS_LOW &&
    emo < OTHER_STATS_LOW &&
    fin < OTHER_STATS_LOW &&
    liv < OTHER_STATS_LOW;
  if (isStrFocused) return "STEEL_WARRIOR";

  const isIntFocused =
    int >= SINGLE_STAT_HIGH &&
    str < OTHER_STATS_LOW &&
    emo < OTHER_STATS_LOW &&
    fin < OTHER_STATS_LOW &&
    liv < OTHER_STATS_LOW;
  if (isIntFocused) return "SAGE_PATH";

  const isEmoFocused =
    emo >= SINGLE_STAT_HIGH &&
    str < OTHER_STATS_LOW &&
    int < OTHER_STATS_LOW &&
    fin < OTHER_STATS_LOW &&
    liv < OTHER_STATS_LOW;
  if (isEmoFocused) return "EMPATHY_POET";

  const isFinFocused =
    fin >= SINGLE_STAT_HIGH &&
    str < OTHER_STATS_LOW &&
    int < OTHER_STATS_LOW &&
    emo < OTHER_STATS_LOW &&
    liv < OTHER_STATS_LOW;
  if (isFinFocused) return "GOLDEN_MERCHANT";

  const isLivFocused =
    liv >= SINGLE_STAT_HIGH &&
    str < OTHER_STATS_LOW &&
    int < OTHER_STATS_LOW &&
    emo < OTHER_STATS_LOW &&
    fin < OTHER_STATS_LOW;
  if (isLivFocused) return "VILLAGE_GUARDIAN";

  // ===== 6. 한 스탯이 매우 높지만 다른 것도 어느 정도 — 챔피언 류 =====
  if (str >= SINGLE_STAT_HIGH) return "ARENA_CHAMPION";

  // ===== 7. fallback =====
  return "ORDINARY_DAY";
}
