import { describe, expect, it } from "vitest";
import {
  GARDEN_DAYS,
  bucketCompletions,
  buildGardenGrid,
  bushStage,
  computeStreak,
  cropStage,
  dominantCategory,
  kstDateString,
  mondayDow,
  type CompletionRow,
} from "@/utils/garden";

const DAY = 24 * 60 * 60 * 1000;
// KST 기준 2026-06-22(월) 12:00 → UTC 03:00
const TODAY = Date.parse("2026-06-22T03:00:00.000Z");

function row(dateMs: number, tagged: string): CompletionRow {
  return { createdAtMs: dateMs, tagged };
}

describe("kstDateString", () => {
  it("UTC 자정 직전도 KST 날짜로 보정", () => {
    // UTC 15:00 = KST 익일 00:00
    expect(kstDateString(Date.parse("2026-06-22T15:00:00.000Z"))).toBe("2026-06-23");
    expect(kstDateString(Date.parse("2026-06-22T14:59:00.000Z"))).toBe("2026-06-22");
  });
});

describe("mondayDow", () => {
  it("월요일=0 ... 일요일=6", () => {
    expect(mondayDow(Date.parse("2026-06-22T03:00:00.000Z"))).toBe(0); // 월
    expect(mondayDow(Date.parse("2026-06-24T03:00:00.000Z"))).toBe(2); // 수
    expect(mondayDow(Date.parse("2026-06-28T03:00:00.000Z"))).toBe(6); // 일
  });
});

describe("bucketCompletions", () => {
  it("KST 날짜별로 count·byTag 집계", () => {
    const rows = [
      row(TODAY, "STR"),
      row(TODAY, "STR"),
      row(TODAY, "INT"),
      row(TODAY - DAY, "FIN"),
    ];
    const map = bucketCompletions(rows);
    expect(map.get("2026-06-22")!.count).toBe(3);
    expect(map.get("2026-06-22")!.byTag.STR).toBe(2);
    expect(map.get("2026-06-22")!.byTag.INT).toBe(1);
    expect(map.get("2026-06-21")!.count).toBe(1);
  });

  it("알 수 없는 태그는 count만 올리고 byTag엔 반영 안 함", () => {
    const map = bucketCompletions([row(TODAY, "WAT")]);
    const b = map.get("2026-06-22")!;
    expect(b.count).toBe(1);
    expect(b.byTag.STR + b.byTag.INT + b.byTag.EMO + b.byTag.FIN + b.byTag.LIV).toBe(0);
  });
});

describe("dominantCategory", () => {
  it("최다 카테고리를 고른다", () => {
    expect(dominantCategory({ STR: 1, INT: 3, EMO: 0, FIN: 0, LIV: 0 })).toBe("INT");
  });
  it("동점이면 우선순위(STR>INT>...)가 이긴다", () => {
    expect(dominantCategory({ STR: 2, INT: 2, EMO: 0, FIN: 0, LIV: 0 })).toBe("STR");
    expect(dominantCategory({ STR: 0, INT: 2, EMO: 0, FIN: 2, LIV: 0 })).toBe("INT");
  });
  it("완료 없으면 null", () => {
    expect(dominantCategory({ STR: 0, INT: 0, EMO: 0, FIN: 0, LIV: 0 })).toBeNull();
  });
});

describe("bushStage", () => {
  it("완료수 → 단계 (0 / 1~2 / 3~4 / 5+)", () => {
    expect(bushStage(0)).toBe(0);
    expect(bushStage(1)).toBe(1);
    expect(bushStage(2)).toBe(1);
    expect(bushStage(3)).toBe(2);
    expect(bushStage(4)).toBe(2);
    expect(bushStage(5)).toBe(3);
    expect(bushStage(20)).toBe(3);
  });
});

describe("cropStage", () => {
  it("완료수 → 성장 단계 (0 / 1 / 2 / 3 / 4 / 5+)", () => {
    expect(cropStage(0)).toBe(0);
    expect(cropStage(1)).toBe(1);
    expect(cropStage(2)).toBe(2);
    expect(cropStage(3)).toBe(3);
    expect(cropStage(4)).toBe(4);
    expect(cropStage(5)).toBe(5);
    expect(cropStage(20)).toBe(5);
  });
});

describe("computeStreak", () => {
  it("오늘부터 연속 완료 일수", () => {
    const map = bucketCompletions([
      row(TODAY, "STR"),
      row(TODAY - DAY, "STR"),
      row(TODAY - 2 * DAY, "STR"),
      // 3일 전은 비어있음 → 끊김
      row(TODAY - 4 * DAY, "STR"),
    ]);
    expect(computeStreak(map, TODAY)).toBe(3);
  });

  it("오늘 완료 없으면 0", () => {
    const map = bucketCompletions([row(TODAY - DAY, "STR")]);
    expect(computeStreak(map, TODAY)).toBe(0);
  });
});

describe("buildGardenGrid", () => {
  it("정확히 365칸, 마지막이 오늘", () => {
    const cells = buildGardenGrid(TODAY);
    expect(cells.length).toBe(GARDEN_DAYS);
    expect(cells[cells.length - 1].date).toBe("2026-06-22");
  });

  it("오늘(월요일)은 row 0, 가장 큰 col", () => {
    const cells = buildGardenGrid(TODAY);
    const last = cells[cells.length - 1];
    expect(last.row).toBe(0); // 월요일
    const maxCol = Math.max(...cells.map((c) => c.col));
    expect(last.col).toBe(maxCol);
  });

  it("row는 0~6, col은 단조 증가(같거나 큼)", () => {
    const cells = buildGardenGrid(TODAY);
    for (const c of cells) {
      expect(c.row).toBeGreaterThanOrEqual(0);
      expect(c.row).toBeLessThanOrEqual(6);
    }
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i].col).toBeGreaterThanOrEqual(cells[i - 1].col);
    }
  });
});
