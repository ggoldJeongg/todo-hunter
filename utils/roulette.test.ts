import { describe, expect, it } from "vitest";
import {
  computeWeights,
  difficultyWeight,
  pickWeightedIndex,
  spinRoulette,
  toRatios,
  type RouletteItem,
} from "@/utils/roulette";

function item(id: number, difficulty?: string | null): RouletteItem {
  return { id, name: `quest-${id}`, tagged: "STR", isWeekly: false, difficulty };
}

describe("difficultyWeight", () => {
  it("uniform 모드는 난이도와 무관하게 1", () => {
    expect(difficultyWeight("easy", "uniform")).toBe(1);
    expect(difficultyWeight("hard", "uniform")).toBe(1);
    expect(difficultyWeight(null, "uniform")).toBe(1);
  });

  it("easy 모드는 쉬울수록 가중치가 크다", () => {
    expect(difficultyWeight("easy", "easy")).toBe(3);
    expect(difficultyWeight("normal", "easy")).toBe(2);
    expect(difficultyWeight("hard", "easy")).toBe(1);
  });

  it("hard 모드는 어려울수록 가중치가 크다", () => {
    expect(difficultyWeight("easy", "hard")).toBe(1);
    expect(difficultyWeight("normal", "hard")).toBe(2);
    expect(difficultyWeight("hard", "hard")).toBe(3);
  });

  it("난이도가 없거나 알 수 없으면 normal(2 기준)로 취급", () => {
    expect(difficultyWeight(null, "hard")).toBe(2);
    expect(difficultyWeight(undefined, "easy")).toBe(2);
    expect(difficultyWeight("weird", "hard")).toBe(2);
  });
});

describe("computeWeights", () => {
  const items = [item(1, "easy"), item(2, "normal"), item(3, "hard")];

  it("uniform 모드는 모두 동일", () => {
    expect(computeWeights(items, "uniform")).toEqual([1, 1, 1]);
  });

  it("easy 모드는 쉬운 쪽이 크다", () => {
    expect(computeWeights(items, "easy")).toEqual([3, 2, 1]);
  });

  it("hard 모드는 어려운 쪽이 크다", () => {
    expect(computeWeights(items, "hard")).toEqual([1, 2, 3]);
  });
});

describe("toRatios", () => {
  it("합이 1이 된다", () => {
    const r = toRatios([1, 2, 1]);
    expect(r.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(r).toEqual([0.25, 0.5, 0.25]);
  });

  it("합이 0이면 균등 분배로 폴백", () => {
    expect(toRatios([0, 0])).toEqual([0.5, 0.5]);
  });

  it("빈 배열은 빈 배열", () => {
    expect(toRatios([])).toEqual([]);
  });
});

describe("pickWeightedIndex", () => {
  it("rng=0 이면 첫 번째 항목", () => {
    expect(pickWeightedIndex([1, 1, 1], () => 0)).toBe(0);
  });

  it("rng 이 거의 1이면 마지막 항목", () => {
    expect(pickWeightedIndex([1, 1, 1], () => 0.999999)).toBe(2);
  });

  it("가중치 경계에서 올바른 구간을 선택한다", () => {
    // weights=[1,3] → 누적 [0~1), [1~4). sum=4
    expect(pickWeightedIndex([1, 3], () => 0.125)).toBe(0); // 0.5
    expect(pickWeightedIndex([1, 3], () => 0.5)).toBe(1); // 2.0
  });

  it("가중치 0인 항목은 절대 선택되지 않는다", () => {
    for (const v of [0, 0.3, 0.7, 0.999]) {
      expect(pickWeightedIndex([0, 1, 0], () => v)).toBe(1);
    }
  });

  it("모든 가중치가 0이면 균등 랜덤으로 폴백", () => {
    expect(pickWeightedIndex([0, 0, 0], () => 0.5)).toBe(1);
  });

  it("빈 배열은 -1", () => {
    expect(pickWeightedIndex([], () => 0.5)).toBe(-1);
  });

  it("분포가 가중치에 비례한다 (몬테카를로)", () => {
    // weights=[1,3] → 약 25% / 75%
    // mulberry32 — 결정적이면서 잘 분포된 PRNG
    let a = 0x9e3779b9;
    const rng = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const counts = [0, 0];
    const N = 20000;
    for (let i = 0; i < N; i++) counts[pickWeightedIndex([1, 3], rng)]++;
    const ratio0 = counts[0] / N;
    expect(ratio0).toBeGreaterThan(0.2);
    expect(ratio0).toBeLessThan(0.3);
  });
});

describe("spinRoulette", () => {
  it("uniform 모드에서 rng 로 인덱스를 결정한다", () => {
    const items = [item(1), item(2), item(3), item(4)];
    expect(spinRoulette(items, "uniform", () => 0)).toBe(0);
    expect(spinRoulette(items, "uniform", () => 0.999999)).toBe(3);
  });

  it("hard 모드에서 어려운 할일이 더 자주 뽑힌다", () => {
    const items = [item(1, "easy"), item(2, "hard")];
    // weights=[1,3], 누적 [0~1),[1~4), sum=4. rng*4: 0.5→idx0, 2.0→idx1
    expect(spinRoulette(items, "hard", () => 0.125)).toBe(0); // 0.5
    expect(spinRoulette(items, "hard", () => 0.5)).toBe(1); // 2.0
  });

  it("easy 모드에서 쉬운 할일이 더 자주 뽑힌다", () => {
    const items = [item(1, "easy"), item(2, "hard")];
    // weights=[3,1], 누적 [0~3),[3~4), sum=4. rng*4: 2.0→idx0, 3.5→idx1
    expect(spinRoulette(items, "easy", () => 0.5)).toBe(0); // 2.0
    expect(spinRoulette(items, "easy", () => 0.875)).toBe(1); // 3.5
  });
});
