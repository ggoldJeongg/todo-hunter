"use client";

import { useEffect, useRef, useState } from "react";
import type { DayBucket, Tag } from "@/utils/garden";
import type {
  GardenTapInfo,
  PixiGardenScene,
} from "@/utils/pixi/PixiGardenScene";
import styles from "./character.module.css";

const TAG_LABEL: Record<Tag, string> = {
  STR: "체력",
  INT: "지력",
  EMO: "매력",
  FIN: "경제력",
  LIV: "생활력",
};
const TAG_COLOR: Record<Tag, string> = {
  STR: "#C84B3A",
  INT: "#6B8FB8",
  EMO: "#C97B8E",
  FIN: "#B89A4E",
  LIV: "#9B7CB8",
};
const TAG_ORDER: Tag[] = ["STR", "INT", "EMO", "FIN", "LIV"];

interface GardenResponse {
  total: number;
  streak: number;
  today: string;
  days: DayBucket[];
}

// KST 정오 기준 ms (날짜 경계 오차 방지)
function kstNoonMs(dateStr: string): number {
  return Date.parse(`${dateStr}T12:00:00+09:00`);
}

function fmtDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

export default function GrowthGarden({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PixiGardenScene | null>(null);

  const [data, setData] = useState<GardenResponse | null>(null);
  const [tap, setTap] = useState<GardenTapInfo | null>(null);

  // 완료 집계 fetch (1회)
  useEffect(() => {
    let alive = true;
    fetch("/api/quest/garden", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.days) setData(d as GardenResponse);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 탭이 보이고 데이터가 준비되면 Pixi 초기화 (숨김 탭은 크기 0이라 미룸)
  useEffect(() => {
    if (!active || !data) return;
    let destroyed = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      const { PixiGardenScene } = await import("@/utils/pixi/PixiGardenScene");
      if (destroyed) return;
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return; // 아직 안 보임

      const dataMap = new Map<string, DayBucket>(
        data.days.map((d) => [d.date, d]),
      );
      const scene = new PixiGardenScene();
      await scene.init(canvas, w, h, {
        todayMs: kstNoonMs(data.today),
        data: dataMap,
        onTileTap: (info) => setTap(info),
      });
      if (destroyed) {
        scene.destroy();
        return;
      }
      sceneRef.current = scene;

      ro = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        scene.resize(width, height);
      });
      ro.observe(container);
    })();

    return () => {
      destroyed = true;
      ro?.disconnect();
      sceneRef.current?.destroy();
      sceneRef.current = null;
      setTap(null);
    };
  }, [active, data]);

  const isEmpty = data !== null && data.total === 0;

  return (
    <>
      <h3 className={styles["stats-section-title"]}>🌱 성장 정원</h3>
      <p className={styles["stats-section-sub"]}>
        완료한 날마다 덤불이 자라요 — 최근 365일. ← 드래그로 과거 보기 →
      </p>

      {/* KPI */}
      <div className={styles["grass-kpi-row"]}>
        <div className={styles["grass-kpi"]}>
          <div className={styles["grass-kpi-num"]}>{data?.total ?? 0}</div>
          <div className={styles["grass-kpi-label"]}>총 꽃</div>
        </div>
        <div className={styles["grass-kpi"]}>
          <div className={styles["grass-kpi-num"]}>{data?.streak ?? 0}</div>
          <div className={styles["grass-kpi-label"]}>연속일</div>
        </div>
      </div>

      {/* Pixi 캔버스 */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: 230,
          border: "2px solid #4A3F2F",
          overflow: "hidden",
          touchAction: "none",
          marginTop: 8,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            imageRendering: "pixelated",
            cursor: "grab",
          }}
        />

        {/* 빈 상태 안내 */}
        {isEmpty && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: "#4A3F2F",
              fontSize: 12,
              fontWeight: 500,
              pointerEvents: "none",
              padding: 16,
            }}
          >
            퀘스트를 완료하면 정원이 자라요 🌱
          </div>
        )}

        {/* 타일 탭 팝오버 */}
        {tap && (
          <div
            style={{
              position: "absolute",
              left: `${(tap.screenX / (containerRef.current?.clientWidth || 1)) * 100}%`,
              top: `${(tap.screenY / (containerRef.current?.clientHeight || 1)) * 100}%`,
              transform: "translate(-50%, -120%)",
              background: "rgba(74,63,47,.94)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 500,
              padding: "5px 8px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            <div style={{ marginBottom: tap.count > 0 ? 3 : 0 }}>
              {fmtDate(tap.date)} · 완료 {tap.count}개
            </div>
            {tap.count > 0 && (
              <div style={{ display: "flex", gap: 6 }}>
                {TAG_ORDER.filter((t) => tap.byTag[t] > 0).map((t) => (
                  <span
                    key={t}
                    style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        background: TAG_COLOR[t],
                        display: "inline-block",
                      }}
                    />
                    {TAG_LABEL[t]} {tap.byTag[t]}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 범례 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "5px 10px",
          justifyContent: "center",
          marginTop: 10,
          fontSize: 11,
          fontWeight: 700,
          color: "#6B5C42",
        }}
      >
        {TAG_ORDER.map((t) => (
          <span
            key={t}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                background: TAG_COLOR[t],
                display: "inline-block",
              }}
            />
            {TAG_LABEL[t]}
          </span>
        ))}
      </div>
      <p className={styles["stats-panel-desc"]}>
        덤불 크기 = 그날 완료량 · 색 = 카테고리 · 금색 테두리 = 오늘
      </p>
    </>
  );
}
