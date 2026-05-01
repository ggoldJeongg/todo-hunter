// 캐릭터 페이지 derived dashboard 헬퍼
// — 기존 데이터 (stats + 활동 기록) 만으로 컨디션·성격 등을 계산

export interface StatSnapshot {
  str: number;
  int: number;
  emo: number;
  fin: number;
  liv: number;
}

export interface ConditionResult {
  /** 0~100 점수 */
  value: number;
  /** 라벨 */
  label: "최상" | "좋음" | "보통" | "피곤" | "한계";
  /** 부가 메시지 */
  sub: string;
}

/**
 * 컨디션 — 의지력 60% + 오늘 활동량 40% 의 가중합 (+ 날씨 보정)
 * @param willpower 현재 의지력 (0 ~ maxWillpower)
 * @param maxWillpower 최대 의지력
 * @param todayCompletedRatio 오늘 완료 퀘스트 비율 (0 ~ 1)
 *                            예) 등록 4개 중 3개 완료 → 0.75
 * @param weatherMood 날씨 mood 보정값 (-5 ~ +5, 기본 0)
 *                    스탯 영향 없이 표시값만 보정
 */
export function deriveCondition(
  willpower: number,
  maxWillpower: number,
  todayCompletedRatio: number,
  weatherMood: number = 0
): ConditionResult {
  const wpPct = maxWillpower > 0 ? (willpower / maxWillpower) * 100 : 0;
  const activityPct = Math.min(Math.max(todayCompletedRatio, 0), 1) * 100;
  const raw = wpPct * 0.6 + activityPct * 0.4 + weatherMood;
  const value = Math.round(Math.min(100, Math.max(0, raw)));

  let label: ConditionResult["label"];
  let sub: string;
  if (value >= 85) {
    label = "최상";
    sub = "능력치 +5";
  } else if (value >= 70) {
    label = "좋음";
    sub = "쾌적함";
  } else if (value >= 40) {
    label = "보통";
    sub = "";
  } else if (value >= 15) {
    label = "피곤";
    sub = "휴식 필요";
  } else {
    label = "한계";
    sub = "퀘스트 불가";
  }
  return { value, label, sub };
}


// ==================== 성격 / 특성 derive ====================

const TOP_STAT_TRAITS: Record<keyof StatSnapshot, string> = {
  int: "학구파",
  str: "활동가",
  emo: "감수성 풍부",
  fin: "현실주의자",
  liv: "꼼꼼한",
};

/**
 * 성격·특성 derive
 * @param stats 5 스탯 스냅샷
 * @param completedCount 누적 또는 최근 완료 퀘스트 수
 * @param titlesCount 보유 칭호 수
 */
export function deriveTraits(
  stats: StatSnapshot,
  completedCount: number,
  titlesCount: number = 0
): string[] {
  const traits: string[] = [];

  // 1) 최고 스탯 기반 trait
  const entries = Object.entries(stats) as [keyof StatSnapshot, number][];
  const top = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (top[1] > 0) traits.push(TOP_STAT_TRAITS[top[0]]);

  // 2) 활동량 기반
  if (completedCount >= 10) traits.push("성실함");
  else if (completedCount >= 5) traits.push("꾸준함");

  // 3) 균형도 — 모든 스탯이 10 이상
  if (entries.every(([, v]) => v >= 10)) traits.push("균형잡힌");

  // 4) 다재다능 — 모든 스탯이 1 이상 (다양한 카테고리 활동)
  if (entries.every(([, v]) => v >= 1) && !traits.includes("균형잡힌")) {
    traits.push("다재다능");
  }

  // 5) 수집가 — 칭호 5+개
  if (titlesCount >= 5) traits.push("수집가");

  // 상위 3개만
  return traits.slice(0, 3);
}
