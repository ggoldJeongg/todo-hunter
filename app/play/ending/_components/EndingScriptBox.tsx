"use client";

import { useState, useEffect, useCallback } from "react";
import type { DialogueLine } from "@/constants";

interface EndingScriptBoxProps {
  name: string;
  dialogue: DialogueLine[];
}

const TYPING_SPEED = 40; // ms per character

const SPEAKER_CONFIG = {
  narrator: { label: "", align: "center" as const, bg: "bg-black/60", text: "text-white/80 italic" },
  player: { label: "나", align: "right" as const, bg: "bg-blue-900/60", text: "text-blue-100" },
  npc: { label: "???", align: "left" as const, bg: "bg-amber-900/60", text: "text-amber-100" },
};

const EndingScriptBox = ({ name, dialogue }: EndingScriptBoxProps) => {
  const [nameVisible, setNameVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isAllDone, setIsAllDone] = useState(false);

  const currentLine = dialogue[currentIndex];
  const isLastLine = currentIndex >= dialogue.length - 1;

  // 엔딩명 슬라이드인
  useEffect(() => {
    const timer = setTimeout(() => setNameVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // 타이핑 애니메이션
  useEffect(() => {
    if (!currentLine || isAllDone) return;

    if (charIndex < currentLine.text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(currentLine.text.slice(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }, TYPING_SPEED);
      return () => clearTimeout(timer);
    } else {
      setIsTypingDone(true);
    }
  }, [charIndex, currentLine, isAllDone]);

  // 다음 대사로 넘기기
  const handleNext = useCallback(() => {
    if (!isTypingDone) {
      // 타이핑 중이면 즉시 완성
      setDisplayedText(currentLine.text);
      setCharIndex(currentLine.text.length);
      setIsTypingDone(true);
      return;
    }

    if (isLastLine) {
      setIsAllDone(true);
      return;
    }

    // 다음 대사
    setCurrentIndex((prev) => prev + 1);
    setDisplayedText("");
    setCharIndex(0);
    setIsTypingDone(false);
  }, [isTypingDone, isLastLine, currentLine]);

  if (!currentLine && !isAllDone) return null;

  const config = currentLine ? SPEAKER_CONFIG[currentLine.speaker] : null;

  return (
    <div className="w-full p-4 space-y-4" onClick={handleNext}>
      {/* 엔딩명 */}
      <h2
        className={`text-xl font-bold text-center text-amber-400 transition-all duration-700 ${
          nameVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {name}
      </h2>

      {/* 대화 박스 */}
      {!isAllDone && config && (
        <div
          className={`relative ${config.bg} rounded-lg p-4 min-h-[80px] flex flex-col justify-center cursor-pointer`}
        >
          {/* 화자 이름 */}
          {config.label && (
            <span
              className={`absolute -top-3 ${
                config.align === "right" ? "right-3" : "left-3"
              } text-[11px] font-bold px-2 py-0.5 rounded bg-black/70 text-white`}
            >
              {config.label}
            </span>
          )}

          {/* 대사 */}
          <p className={`text-base ${config.text} ${config.align === "center" ? "text-center" : ""}`}>
            {displayedText}
            {!isTypingDone && <span className="animate-pulse">|</span>}
          </p>

          {/* 다음 표시 */}
          {isTypingDone && !isLastLine && (
            <span className="absolute bottom-2 right-3 text-[10px] text-white/50 animate-bounce">
              ▼ 탭하여 계속
            </span>
          )}

          {isTypingDone && isLastLine && (
            <span className="absolute bottom-2 right-3 text-[10px] text-amber-400/70 animate-pulse">
              ▼ 탭하여 종료
            </span>
          )}
        </div>
      )}

      {/* 모든 대화 종료 */}
      {isAllDone && (
        <div className="text-center text-white/50 text-sm animate-pulse">
          — {name} —
        </div>
      )}
    </div>
  );
};

export default EndingScriptBox;
