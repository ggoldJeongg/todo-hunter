"use client";

import { useState, useEffect } from "react";

interface EndingScriptBoxProps {
  name: string;
  story: string[];
}

const TYPING_SPEED = 50; // ms per character
const LINE_DELAY = 500; // ms between lines

const EndingScriptBox = ({ name, story }: EndingScriptBoxProps) => {
  const [nameVisible, setNameVisible] = useState(false);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTypingDone, setIsTypingDone] = useState(false);

  // 엔딩명 슬라이드인
  useEffect(() => {
    const timer = setTimeout(() => setNameVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // 타이핑 애니메이션
  useEffect(() => {
    if (currentLineIndex >= story.length) {
      setIsTypingDone(true);
      return;
    }

    const currentLine = story[currentLineIndex];

    if (currentCharIndex < currentLine.length) {
      // 한 글자씩 타이핑
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const newLines = [...prev];
          newLines[currentLineIndex] = currentLine.slice(0, currentCharIndex + 1);
          return newLines;
        });
        setCurrentCharIndex((prev) => prev + 1);
      }, TYPING_SPEED);

      return () => clearTimeout(timer);
    } else {
      // 현재 줄 완료, 다음 줄로
      const timer = setTimeout(() => {
        setCurrentLineIndex((prev) => prev + 1);
        setCurrentCharIndex(0);
        setDisplayedLines((prev) => [...prev, ""]);
      }, LINE_DELAY);

      return () => clearTimeout(timer);
    }
  }, [currentLineIndex, currentCharIndex, story]);

  return (
    <div className="is-rounded bg-black/70 w-full p-6 space-y-4">
      {/* 엔딩명 슬라이드인 */}
      <h2
        className={`text-xl font-bold text-center text-amber-400 transition-all duration-700 ${
          nameVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        }`}
      >
        {name}
      </h2>

      {/* 스토리 타이핑 */}
      <div className="space-y-2 min-h-[80px]">
        {displayedLines.map((line, index) => (
          <p key={index} className="text-base text-center text-white/90">
            {line}
            {/* 현재 타이핑 중인 줄에 커서 표시 */}
            {index === currentLineIndex && !isTypingDone && (
              <span className="animate-pulse">|</span>
            )}
          </p>
        ))}
      </div>
    </div>
  );
};

export default EndingScriptBox;
