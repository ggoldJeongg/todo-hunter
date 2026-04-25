// 주간 퀘스트의 "연속 주(streak)" 계산.
//
// 정의: 주간 퀘스트가 days = ["월", "수", "금"] 처럼 요일을 지정했을 때,
// "어떤 한 주(월~일)에 그 days의 모든 요일에 SuccessDay 가 존재"하면 그 주를 성공으로 간주.
// 가장 최근(이번 주 또는 직전 주) 부터 과거로 역순 추적해 끊기지 않은 연속 주 수를 반환.
//
// 이번 주가 아직 진행 중일 수 있으므로:
// - 이번 주가 성공이면 streak 에 포함 (현재 진행 중인 streak)
// - 이번 주가 실패이면 직전 주부터 역순 카운트 (이번 주는 아직 시간이 남았을 수 있어 streak 깨졌다고 판정 안 함)

import { getThisWeekStart } from "./date";

const DAY_OF_WEEK_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**
 * 단일 주간 퀘스트의 연속 주(streak) 계산.
 * @param days   퀘스트의 반복 요일 (예: ["월", "수", "금"])
 * @param successDays  해당 퀘스트의 모든 SuccessDay createdAt
 * @param now  기준 시각 (테스트용, 기본 현재)
 */
export function calculateWeeklyStreak(
  days: string[],
  successDays: Date[],
  now: Date = new Date()
): number {
  if (days.length === 0 || successDays.length === 0) return 0;

  // 주 시작(월요일 0시) 기준으로 SuccessDay 를 그룹핑
  // 키: 주 시작일 timestamp, 값: 해당 주에 존재하는 요일 set
  const weekMap = new Map<number, Set<string>>();
  for (const d of successDays) {
    const weekStart = getThisWeekStart(d).getTime();
    const dayName = DAY_OF_WEEK_KO[d.getDay()];
    if (!weekMap.has(weekStart)) weekMap.set(weekStart, new Set());
    weekMap.get(weekStart)!.add(dayName);
  }

  const required = new Set(days);
  const isWeekSuccess = (weekStart: number): boolean => {
    const set = weekMap.get(weekStart);
    if (!set) return false;
    for (const d of required) if (!set.has(d)) return false;
    return true;
  };

  // 이번 주부터 역순으로 카운트
  let streak = 0;
  let cursor = getThisWeekStart(now).getTime();
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

  // 이번 주가 실패하면 streak 깨졌다고 보지 않고 직전 주부터 시작
  // (이번 주는 아직 진행 중일 수 있음)
  if (!isWeekSuccess(cursor)) {
    cursor -= ONE_WEEK;
  }

  while (isWeekSuccess(cursor)) {
    streak++;
    cursor -= ONE_WEEK;
  }

  return streak;
}
