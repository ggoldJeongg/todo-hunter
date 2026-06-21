"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/common/Dialog";
import { useQuestStore } from "@/utils/stores/questStore";

interface RouletteModalProps {
  open: boolean;
  onClose: () => void;
}

// 태그별 색상 (목업과 동일)
const TAG_COLOR: Record<string, string> = {
  STR: "#E07A82",
  INT: "#6B8FB8",
  EMO: "#E89BB5",
  FIN: "#6AAF6A",
  LIV: "#E0A04E",
};

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

const SIZE = 280;
const R = 130;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function RouletteModal({ open, onClose }: RouletteModalProps) {
  const quests = useQuestStore((s) => s.quests);

  // 안 끝난 퀘스트만 후보로
  const candidates = quests.filter((q) => !q.completed);
  const N = candidates.length;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(-Math.PI / 2);
  const animRef = useRef<number | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [pick, setPick] = useState<string | null>(null);

  // 그리기 — rotation은 ref로 관리해 매 프레임 직접 그림
  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const seg = N > 0 ? (Math.PI * 2) / N : 0;

    ctx.clearRect(0, 0, SIZE, SIZE);

    if (N === 0) {
      // 빈 상태 — 회색 링
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = "#E6DCC4";
      ctx.fill();
      ctx.strokeStyle = "#B49A68";
      ctx.lineWidth = 5;
      ctx.stroke();
      drawPointer(ctx, cx);
      return;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRef.current);
    for (let i = 0; i < N; i++) {
      const a0 = i * seg;
      const a1 = (i + 1) * seg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a1);
      ctx.closePath();
      ctx.fillStyle = TAG_COLOR[candidates[i].tagged] || "#ccc";
      ctx.fill();
      ctx.strokeStyle = "rgba(74,63,47,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
      // 라벨 — 칸이 좁아지면 글자 수 줄임
      ctx.save();
      ctx.rotate(a0 + seg / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${N > 11 ? 10 : 12}px Pretendard, sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 2;
      const maxLen = N > 11 ? 5 : N > 8 ? 6 : 8;
      const name = candidates[i].name;
      const label = name.length > maxLen ? name.slice(0, maxLen) + "…" : name;
      ctx.fillText(label, R - 14, 0);
      ctx.restore();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "#4A3F2F";
    ctx.lineWidth = 5;
    ctx.stroke();
    drawPointer(ctx, cx);
  };

  const drawPointer = (ctx: CanvasRenderingContext2D, cx: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - 12, 6);
    ctx.lineTo(cx + 12, 6);
    ctx.lineTo(cx, 30);
    ctx.closePath();
    ctx.fillStyle = "#C84B3A";
    ctx.strokeStyle = "#4A3F2F";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  };

  // DPR 대응 + 모달 열릴 때마다 초기 그리기
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = SIZE + "px";
    canvas.style.height = SIZE + "px";
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    setPick(null);
    rotationRef.current = -Math.PI / 2;
    draw();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, N]);

  const spin = () => {
    if (spinning || N === 0) return;
    setSpinning(true);
    setPick(null);

    const seg = (Math.PI * 2) / N;
    const winner = Math.floor(Math.random() * N); // 당첨 먼저 결정
    const centerAngle = winner * seg + seg / 2;
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const targetMod =
      ((((-Math.PI / 2) - centerAngle - jitter) % (Math.PI * 2)) +
        Math.PI * 2) %
      (Math.PI * 2);
    const startRot = rotationRef.current;
    const curMod = ((startRot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const delta =
      Math.PI * 2 * 5 +
      ((((targetMod - curMod) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));

    const duration = 4200;
    let startTime: number | null = null;
    const frame = (ts: number) => {
      if (startTime === null) startTime = ts;
      const t = Math.min((ts - startTime) / duration, 1);
      rotationRef.current = startRot + delta * easeOutCubic(t);
      draw();
      if (t < 1) {
        animRef.current = requestAnimationFrame(frame);
      } else {
        setSpinning(false);
        setPick(candidates[winner].name);
      }
    };
    animRef.current = requestAnimationFrame(frame);
  };

  const hint =
    N === 0
      ? "안 끝난 할 일이 없어 돌릴 수 없어요"
      : spinning
        ? "두구두구…"
        : pick
          ? "이걸로 정했다! (다시 누르면 재추첨)"
          : N === 1
            ? "할 일이 하나뿐! 그래도 돌려볼까요?"
            : "가운데 버튼을 눌러 돌려보세요";

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
            <DialogTitle
              className="text-lg font-extrabold tracking-wide"
              style={{ color: "#4A3F2F" }}
            >
              🎡 오늘 뭐하지?
            </DialogTitle>
            <div
              className="text-[11px] font-semibold px-2 py-0.5"
              style={{
                color: "#7A6A50",
                background: "#F2E9D0",
                ...pixelBorder,
              }}
            >
              안 끝난 할 일 {N}개 중에서 골라드려요
            </div>
          </div>

          {/* 휠 */}
          <div
            className="p-4 mb-3 flex flex-col items-center"
            style={{
              background: "#F2E9D0",
              boxShadow: "0 4px 0 #B49A68",
              ...pixelBorder,
            }}
          >
            <div
              className="relative"
              style={{ width: SIZE, height: SIZE }}
            >
              <canvas ref={canvasRef} className="block" />
              <button
                onClick={spin}
                disabled={spinning || N === 0}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-extrabold disabled:opacity-70 disabled:grayscale active:translate-y-[-48%]"
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 30%, #F0C24E, #C8A04E)",
                  border: "4px solid #4A3F2F",
                  color: "#4A3F2F",
                  fontSize: 14,
                  boxShadow: "0 3px 0 #8E7320",
                  cursor: spinning || N === 0 ? "default" : "pointer",
                  zIndex: 3,
                }}
              >
                SPIN
              </button>
            </div>

            {/* 결과 */}
            <div className="mt-4 w-full flex flex-col items-center gap-1 min-h-[54px] justify-center">
              {pick && (
                <div
                  className="text-base font-extrabold px-4 py-2 rounded-lg"
                  style={{
                    color: "#4A3F2F",
                    background: "#F2E6C8",
                    border: "2px solid #C8A04E",
                    boxShadow: "0 2px 0 #B49A68",
                  }}
                >
                  🎯 {pick}
                </div>
              )}
              <div
                className="text-[11px]"
                style={{ color: "#7A6A50" }}
              >
                {hint}
              </div>
            </div>
          </div>

          {/* 닫기 */}
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-extrabold"
            style={{
              color: "#fff",
              background: "#C84B3A",
              boxShadow: "0 3px 0 #8E3328",
              ...pixelBorder,
            }}
          >
            닫기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
