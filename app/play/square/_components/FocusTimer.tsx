"use client";

import { useEffect, useState } from "react";
import { useSquareStore } from "@/utils/stores/squareStore";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FocusTimer() {
  const { isRunning, startTimer, stopTimer, resetTimer, getElapsed } =
    useSquareStore();
  const [display, setDisplay] = useState("00:00:00");

  useEffect(() => {
    if (!isRunning) {
      setDisplay(formatTime(getElapsed()));
      return;
    }

    const interval = setInterval(() => {
      setDisplay(formatTime(getElapsed()));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, getElapsed]);

  const handleToggle = () => {
    if (isRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  };

  return (
    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2">
      <span className="text-white font-mono text-lg tracking-wider">
        {display}
      </span>
      <button
        onClick={handleToggle}
        className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors ${
          isRunning
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-green-500 hover:bg-green-600 text-white"
        }`}
      >
        {isRunning ? "정지" : "시작"}
      </button>
      <button
        onClick={resetTimer}
        className="px-3 py-1 rounded-lg text-sm font-bold bg-gray-600 hover:bg-gray-700 text-white transition-colors"
      >
        초기화
      </button>
    </div>
  );
}
