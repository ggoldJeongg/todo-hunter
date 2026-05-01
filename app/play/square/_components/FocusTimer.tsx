"use client";

import { useEffect, useState } from "react";
import { useSquareStore } from "@/utils/stores/squareStore";

// 부드러운 톤의 픽셀 보더 (탠 컬러, 얇게)
const PIXEL_BORDER_SOFT = `url('data:image/svg+xml;utf8,<?xml version="1.0" encoding="UTF-8" ?><svg version="1.1" width="8" height="8" xmlns="http://www.w3.org/2000/svg"><path d="M3 1 h1 v1 h-1 z M4 1 h1 v1 h-1 z M2 2 h1 v1 h-1 z M5 2 h1 v1 h-1 z M1 3 h1 v1 h-1 z M6 3 h1 v1 h-1 z M1 4 h1 v1 h-1 z M6 4 h1 v1 h-1 z M2 5 h1 v1 h-1 z M5 5 h1 v1 h-1 z M3 6 h1 v1 h-1 z M4 6 h1 v1 h-1 z" fill="rgb(168,152,104)" /></svg>')`;

const pixelBorder = {
  borderStyle: "solid" as const,
  borderWidth: "2px",
  borderImageSlice: 3,
  borderImageWidth: 2,
  borderImageSource: PIXEL_BORDER_SOFT,
  borderImageRepeat: "stretch" as const,
  borderImageOutset: 1,
};


function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FocusTimer() {
  const { isRunning, startTimer, stopTimer, resetTimer, getElapsed } =
    useSquareStore();
  const [display, setDisplay] = useState("00:00:00");

  useEffect(() => {
    setDisplay(formatTime(getElapsed()));
    if (!isRunning) return;
    const interval = setInterval(() => {
      setDisplay(formatTime(getElapsed()));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, getElapsed]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) setDisplay(formatTime(getElapsed()));
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [getElapsed]);

  const handleToggle = () => {
    if (isRunning) stopTimer();
    else startTimer();
  };

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 whitespace-nowrap"
      style={{
        background: "#FAF4E6",
        boxShadow: "0 4px 0 #B49A68",
        imageRendering: "pixelated",
        width: "max-content",
        ...pixelBorder,
      }}
    >
      {/* 좌측: 아이콘 + 실행 인디케이터 */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs font-extrabold leading-none whitespace-nowrap" style={{ color: "#4A3F2F" }}>
          집중 타이머
        </span>
        <span
          className="inline-block w-1.5 h-1.5"
          style={{
            background: isRunning ? "#5B8C5A" : "#B0A082",
            transition: "background 0.2s",
            animation: isRunning
              ? "focus-pulse 1.4s ease-in-out infinite"
              : "none",
          }}
        />
      </div>

      {/* 타이머 숫자 — LCD 효과 없이 깔끔하게 */}
      <span
        className="font-mono text-sm font-extrabold tracking-widest tabular-nums"
        style={{ color: "#4A3F2F", minWidth: "70px" }}
      >
        {display}
      </span>

      {/* 시작/정지 — 컴팩트 픽셀 칩 */}
      <button
        onClick={handleToggle}
        className="text-[10px] font-extrabold px-2 py-1 leading-none"
        style={{
          color: "#fff",
          background: isRunning ? "#C84B3A" : "#5B8C5A",
          boxShadow: `0 2px 0 ${isRunning ? "#8E2F22" : "#3D5C3C"}`,
          ...pixelBorder,
        }}
      >
        {isRunning ? "정지" : "시작"}
      </button>

      {/* 초기화 — 더 미묘하게 */}
      <button
        onClick={resetTimer}
        title="초기화"
        className="text-[10px] font-extrabold px-2 py-1 leading-none"
        style={{
          color: "#4A3F2F",
          background: "#F2E9D0",
          boxShadow: "0 2px 0 #B49A68",
          ...pixelBorder,
        }}
      >
        ↺
      </button>

      <style jsx>{`
        @keyframes focus-pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.3);
          }
        }
      `}</style>
    </div>
  );
}
