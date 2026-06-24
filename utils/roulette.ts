/**
 * 할일 돌림판(룰렛) 선택 로직 — 순수 함수 모음.
 *
 * UI/애니메이션과 완전히 분리되어 있어 단위 테스트가 가능하다.
 * (렌더러가 SVG든 Canvas든 Pixi든 이 모듈은 그대로 재사용된다.)
 *
 * 핵심 원칙: "원판에 보이는 슬라이스 비율 = 실제 당첨 확률".
 *   → toRatios() 로 그린 비율과 pickWeightedIndex() 의 확률이 동일한 weights 에서 나온다.
 */

export type Difficulty = "easy" | "normal" | "hard";

export interface RouletteItem {
  id: number;
  name: string;
  tagged: string;
  isWeekly: boolean;
  /** 난이도. 없으면 normal 로 취급. */
  difficulty?: string | null;
}

/**
 * 가중 모드.
 * - uniform: 모두 균등
 * - easy:    쉬운 할일에 가중 (빠른 성취감 / 워밍업)
 * - hard:    어려운 할일에 가중 (eat the frog)
 */
export type WeightMode = "uniform" | "easy" | "hard";

/** 난이도 랭크(1=쉬움 ~ 3=어려움). 알 수 없으면 normal=2. */
export const DIFFICULTY_RANK: Record<Difficulty, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
};

function rankOf(difficulty: string | null | undefined): number {
  return DIFFICULTY_RANK[(difficulty ?? "normal") as Difficulty] ?? 2;
}

/**
 * 단일 항목의 난이도 가중치 (항상 >= 1).
 * - uniform → 1
 * - easy    → 쉬울수록 큼 (easy=3, normal=2, hard=1)
 * - hard    → 어려울수록 큼 (easy=1, normal=2, hard=3)
 */
export function difficultyWeight(
  difficulty: string | null | undefined,
  mode: WeightMode,
): number {
  if (mode === "uniform") return 1;
  const rank = rankOf(difficulty);
  return mode === "hard" ? rank : 4 - rank; // 4 - rank: 랭크를 뒤집어 쉬운 쪽을 키움
}

/** 모드에 따른 항목별 가중치 배열. */
export function computeWeights(
  items: RouletteItem[],
  mode: WeightMode,
): number[] {
  return items.map((it) => difficultyWeight(it.difficulty, mode));
}

/**
 * 가중치 → 슬라이스 비율(합 = 1). 합이 0 이하이면 균등 분배로 폴백.
 * 빈 배열은 빈 배열 반환.
 */
export function toRatios(weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 1 / weights.length);
  return weights.map((w) => w / sum);
}

/**
 * 누적분포 기반 가중 랜덤 인덱스 선택.
 * rng 주입 가능(기본 Math.random) → 테스트에서 결정적으로 검증.
 * weights 합이 0 이하이면 균등 랜덤으로 폴백.
 */
export function pickWeightedIndex(
  weights: number[],
  rng: () => number = Math.random,
): number {
  const n = weights.length;
  if (n === 0) return -1;

  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return Math.min(n - 1, Math.floor(rng() * n));

  let r = rng() * sum;
  for (let i = 0; i < n; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return n - 1; // 부동소수 오차 보정
}

/**
 * 편의 함수: 항목 + 모드 + rng → 당첨 인덱스.
 * 화면의 슬라이스와 동일한 weights 를 쓰므로 "보이는 비율 = 확률" 이 보장된다.
 */
export function spinRoulette(
  items: RouletteItem[],
  mode: WeightMode,
  rng: () => number = Math.random,
): number {
  return pickWeightedIndex(computeWeights(items, mode), rng);
}
