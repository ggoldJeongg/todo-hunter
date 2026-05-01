// 게임 내 "세계 시간" 단일 진실 — cron, lazy fallback, dev trigger 모두 이 모듈을 통해 시간 결정
//
// 개발 환경에서 FAKE_NOW 환경변수로 시각 override 가능:
//   FAKE_NOW=2026-04-26T23:59:00
// 프로덕션에선 real time 사용.

/** 현재 시각 — 개발 모드에선 FAKE_NOW 환경변수 우선 */
export function getNow(): Date {
  if (process.env.NODE_ENV === "development" && process.env.FAKE_NOW) {
    const d = new Date(process.env.FAKE_NOW);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * ISO 8601 주차 키 — "YYYY-Www" (예: "2026-W18")
 * - 한 주의 시작은 월요일 (ISO 표준)
 * - 한 해의 첫 번째 목요일이 포함된 주가 W01
 *
 * 시간대 무관 (UTC 기반) — 모든 환경에서 동일한 weekKey 보장
 */
export function getISOWeek(date: Date = getNow()): string {
  // UTC 기준으로 복사
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  // 이 날짜의 ISO 요일 (월=1, ... 일=7)
  const dayNum = d.getUTCDay() || 7;

  // 가장 가까운 목요일로 이동 (ISO week 정의)
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  // 그 해의 1월 1일
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  // 주차 = (목요일 - 1월 1일) / 7 + 1
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
}

/** ISO 주차 시작일 (해당 주의 월요일 00:00 UTC) */
export function getWeekStart(date: Date = getNow()): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // 월=1, 일=7
  d.setUTCDate(d.getUTCDate() - (dayNum - 1));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** ISO 주차 종료일 (해당 주의 일요일 23:59:59.999 UTC) */
export function getWeekEnd(date: Date = getNow()): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);
  return end;
}

/** 일요일 여부 (lazy fallback이 일요일에만 발화하도록 게이팅) */
export function isSunday(date: Date = getNow()): boolean {
  return date.getDay() === 0;
}

/** 일요일 이후 (= 다음 주차로 넘어갔는지) — endingState 활성화 게이트 */
export function isSundayOrLater(date: Date = getNow()): boolean {
  // 이 함수 자체로는 의미가 없음. weekKey 기준 비교로 사용 권장.
  return date.getDay() === 0;
}
