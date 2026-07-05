/**
 * 성장 정원(아이소 잔디) — 순수 데이터 로직.
 *
 * 렌더러(Pixi/Canvas)와 분리되어 단위 테스트가 가능하다.
 * 완료(SuccessDay)를 "KST 날짜별"로 집계하고, 정원 격자 좌표·덤불 단계·
 * 대표 카테고리·연속일 등을 계산한다.
 */

export type Tag = "STR" | "INT" | "EMO" | "FIN" | "LIV";

/** 정원에 표시할 일 수 (최근 N일, 오늘이 끝) */
export const GARDEN_DAYS = 365;

/** 동점 시 대표 카테고리 우선순위 (체력 > 지력 > 매력 > 경제력 > 생활력) */
export const TAG_PRIORITY: Tag[] = ["STR", "INT", "EMO", "FIN", "LIV"];

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 한국 표준시(UTC+9, DST 없음)

export interface DayBucket {
  date: string; // 'YYYY-MM-DD' (KST 기준)
  count: number;
  byTag: Record<Tag, number>;
}

export interface CompletionRow {
  createdAtMs: number;
  tagged: string;
}

function emptyByTag(): Record<Tag, number> {
  return { STR: 0, INT: 0, EMO: 0, FIN: 0, LIV: 0 };
}

/** epoch ms → KST 기준 'YYYY-MM-DD' */
export function kstDateString(ms: number): string {
  const d = new Date(ms + KST_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 월요일=0 ... 일요일=6 (KST 기준 요일) */
export function mondayDow(ms: number): number {
  const d = new Date(ms + KST_OFFSET_MS);
  return (d.getUTCDay() + 6) % 7;
}

/** 완료 행들을 KST 날짜별로 집계 */
export function bucketCompletions(rows: CompletionRow[]): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>();
  for (const r of rows) {
    const date = kstDateString(r.createdAtMs);
    let b = map.get(date);
    if (!b) {
      b = { date, count: 0, byTag: emptyByTag() };
      map.set(date, b);
    }
    b.count += 1;
    if (r.tagged in b.byTag) b.byTag[r.tagged as Tag] += 1;
  }
  return map;
}

/**
 * 그날 대표 카테고리(최다). 동점이면 TAG_PRIORITY 순서가 이긴다.
 * 완료가 없으면 null.
 */
export function dominantCategory(byTag: Record<Tag, number>): Tag | null {
  let best: Tag | null = null;
  let max = 0;
  for (const t of TAG_PRIORITY) {
    if (byTag[t] > max) {
      max = byTag[t];
      best = t;
    }
  }
  return best;
}

/**
 * 완료수 → 덤불 단계.
 * 0 = 빈 흙 / 1 = 작은 포기(1~2) / 2 = 중간(3~4) / 3 = 큰 덤불(5+)
 */
export function bushStage(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  return 3;
}

/**
 * 완료수 → 농작물 성장 단계(스프라이트 시트 stage 1~5).
 * 0 = 빈 흙(심지 않음) / 1·2·3·4 = 완료 갯수 그대로 / 5 = 5개 이상(수확기).
 * "그날 완료한 갯수만큼 작물이 자란다"를 그대로 표현한다.
 */
export function cropStage(count: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (count <= 0) return 0;
  if (count >= 5) return 5;
  return count as 1 | 2 | 3 | 4;
}

/**
 * 오늘부터 거꾸로 연속으로 ≥1 완료한 날의 수(연속일).
 * todayMs 기준 KST 날짜로 하루씩 거슬러 올라가며 끊기면 종료.
 */
export function computeStreak(
  map: Map<string, DayBucket>,
  todayMs: number,
): number {
  let streak = 0;
  let cur = todayMs;
  // 무한 루프 방지(최대 GARDEN_DAYS)
  for (let i = 0; i < GARDEN_DAYS + 1; i++) {
    const b = map.get(kstDateString(cur));
    if (b && b.count > 0) {
      streak += 1;
      cur -= DAY_MS;
    } else {
      break;
    }
  }
  return streak;
}

export interface GardenCell {
  date: string;
  col: number; // 주(week) 인덱스 — 오래된 날이 0, 오늘이 최대
  row: number; // 요일 (월=0 ... 일=6)
}

/**
 * 최근 days일의 격자(요일×주) 좌표. 오늘이 가장 큰 col(맨 오른쪽).
 * 첫 주는 부분적으로 비어있을 수 있다(월요일 정렬).
 */
export function buildGardenGrid(
  todayMs: number,
  days: number = GARDEN_DAYS,
): GardenCell[] {
  const startMs = todayMs - (days - 1) * DAY_MS;
  const startRow = mondayDow(startMs); // 첫 날의 요일 → 첫 열 오프셋
  const cells: GardenCell[] = [];
  for (let i = 0; i < days; i++) {
    const ms = startMs + i * DAY_MS;
    cells.push({
      date: kstDateString(ms),
      row: mondayDow(ms),
      col: Math.floor((i + startRow) / 7),
    });
  }
  return cells;
}
