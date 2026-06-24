"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/common/Dialog";
import { useQuestStore } from "@/utils/stores/questStore";
import { STATUS } from "@/constants";
import {
  computeWeights,
  toRatios,
  pickWeightedIndex,
  type RouletteItem,
  type WeightMode,
} from "@/utils/roulette";

interface RouletteModalProps {
  open: boolean;
  onClose: () => void;
}

// 타이머/다른 모달과 동일한 부드러운 톤 픽셀 보더 (탠 컬러, 얇게)
const PIXEL_BORDER = `url('data:image/svg+xml;utf8,<?xml version="1.0" encoding="UTF-8" ?><svg version="1.1" width="8" height="8" xmlns="http://www.w3.org/2000/svg"><path d="M3 1 h1 v1 h-1 z M4 1 h1 v1 h-1 z M2 2 h1 v1 h-1 z M5 2 h1 v1 h-1 z M1 3 h1 v1 h-1 z M6 3 h1 v1 h-1 z M1 4 h1 v1 h-1 z M6 4 h1 v1 h-1 z M2 5 h1 v1 h-1 z M5 5 h1 v1 h-1 z M3 6 h1 v1 h-1 z M4 6 h1 v1 h-1 z" fill="rgb(168,152,104)" /></svg>')`;

const pixelBorder = {
  borderStyle: "solid" as const,
  borderWidth: "2px",
  borderImageSlice: 3,
  borderImageWidth: 2,
  borderImageSource: PIXEL_BORDER,
  borderImageRepeat: "stretch" as const,
  borderImageOutset: 1,
};

// 스탯 태그별 원판 색상 (퀘스트/공유 셀렉터와 동일 팔레트)
const TAG_FILL: Record<string, string> = {
  STR: "#C84B3A",
  INT: "#6B8FB8",
  EMO: "#C97B8E",
  FIN: "#B89A4E",
  LIV: "#9B7CB8",
};
// 같은 색이 인접할 때 대비용 보조 팔레트
const FALLBACK_FILL = ["#E07A5F", "#81B29A", "#F2CC8F", "#8AA8C9", "#C9ADA7"];

// SVG 좌표계 — 반응형(viewBox)이라 화면 크기와 무관하게 컨테이너에 꽉 맞춤
const VIEW = 200;
const CENTER = VIEW / 2;
const RADIUS = 92;
const LABEL_RADIUS = RADIUS * 0.6;
const FULL_SPINS = 6;

// 12시 방향(0deg) 기준, 시계방향 각도 → SVG 좌표
function polar(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + r * Math.sin(rad), y: CENTER - r * Math.cos(rad) };
}

function truncate(name: string, max: number) {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

export default function RouletteModal({ open, onClose }: RouletteModalProps) {
  const quests = useQuestStore((s) => s.quests);

  const [mode, setMode] = useState<WeightMode>("uniform");
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  // 회전 종료 시점에 결과로 확정할 인덱스 (애니메이션과 분리)
  const pendingIndex = useRef<number | null>(null);

  // 완료하지 않은 모든 퀘스트(일간 + 주간). "3개 중 선택"이 아닌 전체에서 할당.
  const segments = useMemo<RouletteItem[]>(
    () =>
      quests
        .filter((q) => !q.completed)
        .map((q) => ({
          id: q.id,
          name: q.name,
          tagged: q.tagged,
          isWeekly: q.isWeekly,
          difficulty: q.difficulty,
        })),
    [quests],
  );

  const n = segments.length;

  // 가중치 → 비율. 화면 슬라이스와 당첨 확률이 같은 weights 에서 나온다.
  const weights = useMemo(
    () => computeWeights(segments, mode),
    [segments, mode],
  );
  const ratios = useMemo(() => toRatios(weights), [weights]);

  // 각 조각의 시작/중심 각도(도) 누적 계산
  const arcs = useMemo(() => {
    let start = 0;
    return ratios.map((ratio) => {
      const sweep = ratio * 360;
      const arc = { start, end: start + sweep, center: start + sweep / 2 };
      start += sweep;
      return arc;
    });
  }, [ratios]);

  // 조각 색상 (앞 조각과 같으면 보조 팔레트로 교차)
  const fills = useMemo(() => {
    const arr: string[] = [];
    let prev: string | null = null;
    segments.forEach((s, i) => {
      let c = TAG_FILL[s.tagged] ?? FALLBACK_FILL[i % FALLBACK_FILL.length];
      if (c === prev) c = FALLBACK_FILL[i % FALLBACK_FILL.length];
      arr.push(c);
      prev = c;
    });
    return arr;
  }, [segments]);

  // 모달 열릴 때 상태 초기화
  useEffect(() => {
    if (open) {
      setRotation(0);
      setSpinning(false);
      setResultIndex(null);
      pendingIndex.current = null;
    }
  }, [open]);

  // 모드 전환 시 결과만 리셋 (슬라이스는 weights 변경으로 자동 갱신)
  const handleModeChange = (next: WeightMode) => {
    if (spinning || next === mode) return;
    setMode(next);
    setResultIndex(null);
  };

  const handleSpin = () => {
    if (spinning || n === 0) return;

    // 1) 당첨 인덱스를 먼저 결정 (화면 슬라이스와 동일한 weights 사용) → 애니메이션은 시각화일 뿐
    const target = pickWeightedIndex(weights, Math.random);
    if (target < 0) return;
    pendingIndex.current = target;

    // 2) 해당 조각의 중심이 12시(포인터)에 오도록 회전량 계산
    const center = arcs[target].center;
    const targetWithinCircle = (360 - center) % 360;
    const current = ((rotation % 360) + 360) % 360;
    const delta = (((targetWithinCircle - current) % 360) + 360) % 360;
    const next = rotation + FULL_SPINS * 360 + delta;

    setResultIndex(null);
    setSpinning(true);
    setRotation(next);
  };

  const handleSpinEnd = () => {
    if (!spinning) return;
    setSpinning(false);
    setResultIndex(pendingIndex.current);
  };

  const result = resultIndex !== null ? segments[resultIndex] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-[340px] p-0 border-0 shadow-none bg-transparent"
        style={{ imageRendering: "pixelated" }}
      >
        <div
          className="relative p-5"
          style={{
            background: "#FAF4E6",
            boxShadow: "0 6px 0 #B49A68",
            ...pixelBorder,
          }}
        >
          {/* 헤더 */}
          <div className="flex flex-col items-center gap-1 mb-3">
            <div
              className="w-12 h-12 flex items-center justify-center text-2xl"
              style={{
                background: "#C84B3A",
                boxShadow: "0 3px 0 #8E2F22",
                ...pixelBorder,
              }}
            >
              🎡
            </div>
            <DialogTitle
              className="text-base font-extrabold tracking-wide mt-2"
              style={{ color: "#4A3F2F" }}
            >
              할일 돌림판
            </DialogTitle>
            <p className="text-[11px] font-semibold" style={{ color: "#8A7D6B" }}>
              뭘 할지 고민될 땐, 운명에 맡겨보세요!
            </p>
          </div>

          {n === 0 ? (
            <div className="px-3 py-10 text-center" style={{ color: "#8A7D6B" }}>
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-xs font-extrabold mb-1">남은 할일이 없습니다</p>
              <p className="text-[10px] font-semibold">
                모든 퀘스트를 완료했어요. 잠시 쉬어가세요!
              </p>
            </div>
          ) : (
            <>
              {/* 모드 토글 — 난이도에 따라 슬라이스 크기(=당첨 확률)가 달라진다 */}
              <div className="flex gap-1.5 mb-3">
                {(
                  [
                    { key: "uniform", label: "🎲 공평" },
                    { key: "easy", label: "🌱 쉬운 것" },
                    { key: "hard", label: "🔥 어려운 것" },
                  ] as { key: WeightMode; label: string }[]
                ).map((m) => {
                  const active = mode === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => handleModeChange(m.key)}
                      disabled={spinning}
                      className="flex-1 py-1.5 text-[10px] font-extrabold disabled:opacity-60"
                      style={{
                        color: active ? "#fff" : "#4A3F2F",
                        background: active ? "#4A3F2F" : "#FAF4E6",
                        boxShadow: `0 2px 0 ${active ? "#1F1408" : "#B49A68"}`,
                        ...pixelBorder,
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {/* 원판 + 포인터 — 반응형 SVG(컨테이너에 100% 맞춤, 잘림 없음) */}
              <div className="relative w-full max-w-[240px] aspect-square mx-auto mb-3">
                {/* 상단 고정 포인터 (아래를 향하는 삼각형) */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 z-10"
                  style={{ top: -4 }}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "11px solid transparent",
                      borderRight: "11px solid transparent",
                      borderTop: "18px solid #4A3F2F",
                      filter: "drop-shadow(0 2px 0 #B49A68)",
                    }}
                  />
                </div>

                <svg
                  viewBox={`0 0 ${VIEW} ${VIEW}`}
                  className="w-full h-full block"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning
                      ? "transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 1)"
                      : "none",
                  }}
                  onTransitionEnd={handleSpinEnd}
                >
                  {n === 1 ? (
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={RADIUS}
                      fill={fills[0]}
                      stroke="#FAF4E6"
                      strokeWidth={2}
                    />
                  ) : (
                    segments.map((s, i) => {
                      const { start, end } = arcs[i];
                      const p0 = polar(start, RADIUS);
                      const p1 = polar(end, RADIUS);
                      const largeArc = end - start > 180 ? 1 : 0;
                      const d = `M ${CENTER} ${CENTER} L ${p0.x} ${p0.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${p1.x} ${p1.y} Z`;
                      return (
                        <path
                          key={s.id}
                          d={d}
                          fill={fills[i]}
                          stroke="#FAF4E6"
                          strokeWidth={1.5}
                        />
                      );
                    })
                  )}

                  {/* 중심 허브 */}
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={10}
                    fill="#4A3F2F"
                    stroke="#FAF4E6"
                    strokeWidth={3}
                  />
                </svg>

                {/* 라벨 오버레이 — 휠과 함께 회전하지 않아 항상 수평(가독성 유지).
                    위치만 휠의 현재 회전을 반영해 조각 위에 얹는다. 회전 중엔 숨김. */}
                <svg
                  viewBox={`0 0 ${VIEW} ${VIEW}`}
                  className="absolute inset-0 w-full h-full block pointer-events-none"
                  style={{
                    opacity: spinning ? 0 : 1,
                    transition: "opacity 0.25s ease",
                  }}
                >
                  {segments.map((s, i) => {
                    // 너무 좁은 조각은 라벨 생략
                    if (ratios[i] * 360 < 14) return null;
                    const pos = polar(arcs[i].center + rotation, LABEL_RADIUS);
                    return (
                      <text
                        key={`label-${s.id}`}
                        x={pos.x}
                        y={pos.y}
                        fill="#fff"
                        fontSize={n > 10 ? 7 : 9}
                        fontWeight={800}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          paintOrder: "stroke",
                          stroke: "rgba(0,0,0,0.45)",
                          strokeWidth: 2.5,
                        }}
                      >
                        {truncate(s.name, n > 8 ? 4 : 6)}
                      </text>
                    );
                  })}
                </svg>
              </div>

              {/* 결과 영역 (높이 고정으로 레이아웃 점프 방지) */}
              <div
                className="px-3 py-2 mb-3 min-h-[52px] flex items-center justify-center text-center"
                style={{
                  background: "#F2E9D0",
                  boxShadow: "0 4px 0 #B49A68",
                  ...pixelBorder,
                }}
              >
                {result ? (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span
                      className="text-[9px] px-1.5 py-0.5 font-extrabold flex-shrink-0"
                      style={{
                        color: "#fff",
                        background: TAG_FILL[result.tagged] ?? "#5B8C5A",
                        ...pixelBorder,
                      }}
                    >
                      {result.isWeekly ? "주간" : "일간"} ·{" "}
                      {STATUS[result.tagged as keyof typeof STATUS]}
                    </span>
                    <span
                      className="text-sm font-extrabold"
                      style={{ color: "#4A3F2F" }}
                    >
                      {result.name}
                    </span>
                  </div>
                ) : (
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: "#8A7D6B" }}
                  >
                    {spinning
                      ? "운명의 바늘이 돌아가는 중..."
                      : `완료하지 않은 할일 ${n}개`}
                  </span>
                )}
              </div>

              {/* 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 text-xs font-extrabold"
                  style={{
                    color: "#4A3F2F",
                    background: "#FAF4E6",
                    boxShadow: "0 3px 0 #B49A68",
                    ...pixelBorder,
                  }}
                >
                  닫기
                </button>
                <button
                  onClick={handleSpin}
                  disabled={spinning}
                  className="flex-1 py-2.5 text-xs font-extrabold disabled:opacity-60"
                  style={{
                    color: "#fff",
                    background: "#C84B3A",
                    boxShadow: "0 3px 0 #8E2F22",
                    ...pixelBorder,
                  }}
                >
                  {spinning ? "돌리는 중..." : result ? "🎯 다시 돌리기" : "🎯 돌리기"}
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
