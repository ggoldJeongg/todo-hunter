"use client";

import { useState, useEffect, useCallback } from "react";
import type { DialogueLine } from "@/constants";
import { useUserStore } from "@/utils/stores/userStore";
import EndingPortrait from "./EndingPortrait";

interface EndingScriptBoxProps {
  name: string;
  dialogue: DialogueLine[];
  /** NPC 외형 (엔딩별 다르게 지정 가능, 미지정 시 기본 NPC) */
  npcAppearance?: {
    outfitId?: string | null;
    hairId?: string | null;
    hatId?: string | null;
  };
}

const TYPING_SPEED = 40; // ms per character
const PORTRAIT_SIZE = 84;

// 화자별 UI 설정 — 어두운 씬 위 크림 pixel-card 대화창 (팔레트 통일)
const SPEAKER_CONFIG = {
  narrator: {
    label: "",
    align: "center" as const,
    bg: "pixel-card",
    text: "text-ink italic",
  },
  player: {
    label: "나",
    align: "right" as const,
    bg: "pixel-card",
    text: "text-ink",
  },
  npc: {
    label: "???",
    align: "left" as const,
    bg: "pixel-card",
    text: "text-ink",
  },
};

// 기본 NPC 외형 — 엔딩에서 npcAppearance 전달 안 했을 때 사용
const DEFAULT_NPC_APPEARANCE = {
  outfitId: "fstr_v05",
  hairId: "bob1_v04",
  hatId: null,
};

const EndingScriptBox = ({
  name,
  dialogue,
  npcAppearance,
}: EndingScriptBoxProps) => {
  const [nameVisible, setNameVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isAllDone, setIsAllDone] = useState(false);

  // 사용자 외형 — useUserStore 에서 직접
  const playerOutfitId = useUserStore((s) => s.outfitId);
  const playerHairId = useUserStore((s) => s.hairId);
  const playerHatId = useUserStore((s) => s.hatId);
  const playerNickname = useUserStore((s) => s.nickname);

  const currentLine = dialogue[currentIndex];
  const isLastLine = currentIndex >= dialogue.length - 1;

  const npc = npcAppearance ?? DEFAULT_NPC_APPEARANCE;

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
      setDisplayedText(currentLine.text);
      setCharIndex(currentLine.text.length);
      setIsTypingDone(true);
      return;
    }

    if (isLastLine) {
      setIsAllDone(true);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setDisplayedText("");
    setCharIndex(0);
    setIsTypingDone(false);
  }, [isTypingDone, isLastLine, currentLine]);

  if (!currentLine && !isAllDone) return null;

  const config = currentLine ? SPEAKER_CONFIG[currentLine.speaker] : null;
  const speaker = currentLine?.speaker;

  // speaker 별 화자 이름 (label 우선, 동적인 경우 nickname)
  const speakerLabel =
    speaker === "player"
      ? playerNickname ?? "나"
      : config?.label ?? "";

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
        <div className="relative">
          {/* 캐릭터 portrait — speaker 에 따라 좌/우 배치 */}
          {speaker === "player" && (
            <div className="absolute -top-2 left-2 z-10">
              <div className="bg-paper border-2 border-ink p-1">
                <EndingPortrait
                  outfitId={playerOutfitId}
                  hairId={playerHairId}
                  hatId={playerHatId}
                  size={PORTRAIT_SIZE}
                  flipX={false}
                />
              </div>
            </div>
          )}
          {speaker === "npc" && (
            <div className="absolute -top-2 right-2 z-10">
              <div className="bg-paper border-2 border-ink p-1">
                <EndingPortrait
                  outfitId={npc.outfitId}
                  hairId={npc.hairId}
                  hatId={npc.hatId}
                  size={PORTRAIT_SIZE}
                  flipX={true}
                />
              </div>
            </div>
          )}

          {/* 대사 박스 */}
          <div
            className={`relative ${config.bg} p-4 cursor-pointer ${
              speaker === "player"
                ? "pl-[112px] min-h-[110px]"
                : speaker === "npc"
                ? "pr-[112px] min-h-[110px]"
                : "min-h-[80px]"
            } flex flex-col justify-center`}
          >
            {/* 화자 이름 */}
            {speakerLabel && (
              <span
                className={`absolute -top-3 ${
                  speaker === "player"
                    ? "left-[112px]"
                    : speaker === "npc"
                    ? "right-[112px]"
                    : config.align === "right"
                    ? "right-3"
                    : "left-3"
                } text-[11px] font-bold px-2 py-0.5 bg-ink text-paper`}
              >
                {speakerLabel}
              </span>
            )}

            {/* 대사 */}
            <p
              className={`text-base ${config.text} ${
                speaker === "narrator" ? "text-center" : ""
              }`}
            >
              {displayedText}
              {!isTypingDone && <span className="animate-pulse">|</span>}
            </p>

            {/* 다음 표시 */}
            {isTypingDone && !isLastLine && (
              <span
                className={`absolute bottom-2 text-[10px] text-ink/50 animate-bounce ${
                  speaker === "npc" ? "left-3" : "right-3"
                }`}
              >
                ▼ 탭하여 계속
              </span>
            )}

            {isTypingDone && isLastLine && (
              <span
                className={`absolute bottom-2 text-[10px] text-brand animate-pulse ${
                  speaker === "npc" ? "left-3" : "right-3"
                }`}
              >
                ▼ 탭하여 종료
              </span>
            )}
          </div>
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
