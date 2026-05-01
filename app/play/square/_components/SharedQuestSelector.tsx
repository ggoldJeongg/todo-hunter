"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuestStore } from "@/utils/stores/questStore";
import { useSquareStore } from "@/utils/stores/squareStore";
import { STATUS } from "@/constants";
import { FEATURES } from "@/constants/features";

// 타이머와 동일한 부드러운 톤 픽셀 보더 (탠 컬러, 얇게)
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

const TAG_COLOR: Record<string, { bg: string; shadow: string }> = {
  STR: { bg: "#C84B3A", shadow: "#8E2F22" },
  INT: { bg: "#6B8FB8", shadow: "#4A6B8E" },
  EMO: { bg: "#C97B8E", shadow: "#8E5566" },
  FIN: { bg: "#B89A4E", shadow: "#8E7536" },
  LIV: { bg: "#9B7CB8", shadow: "#6E5489" },
};

const TAG_ORDER = ["STR", "INT", "EMO", "FIN", "LIV"];

interface SharedQuestSelectorProps {
  open: boolean;
  onClose: () => void;
}

export default function SharedQuestSelector({
  open,
  onClose,
}: SharedQuestSelectorProps) {
  const { quests } = useQuestStore();
  const { sharedQuest, setSharedQuest } = useSquareStore();
  const [selectedId, setSelectedId] = useState<number | null>(
    sharedQuest?.id ?? null
  );

  useEffect(() => {
    if (open) setSelectedId(sharedQuest?.id ?? null);
  }, [open, sharedQuest]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const availableQuests = useMemo(() => {
    return [...quests]
      .filter((q) => !q.completed)
      .sort((a, b) => {
        const ta = TAG_ORDER.indexOf(a.tagged);
        const tb = TAG_ORDER.indexOf(b.tagged);
        if (ta !== tb) return ta - tb;
        return a.name.localeCompare(b.name);
      });
  }, [quests]);

  if (!FEATURES.SHARED_QUEST) return null;
  if (!open) return null;

  const handleConfirm = () => {
    if (selectedId === null) {
      setSharedQuest(null);
    } else {
      const quest = quests.find((q) => q.id === selectedId);
      if (quest) {
        setSharedQuest({
          id: quest.id,
          name: quest.name,
          tagged: quest.tagged,
        });
      }
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", imageRendering: "pixelated" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[340px] p-4"
        style={{
          background: "#FAF4E6",
          boxShadow: "0 6px 0 #B49A68",
          ...pixelBorder,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex flex-col items-center gap-1 mb-3">
          <div
            className="w-11 h-11 flex items-center justify-center text-xl"
            style={{
              background: "#5B8C5A",
              boxShadow: "0 3px 0 #3D5C3C",
              ...pixelBorder,
            }}
          >
            📋
          </div>
          <h2
            className="text-base font-extrabold tracking-wide mt-1"
            style={{ color: "#4A3F2F" }}
          >
            공유할 퀘스트 선택
          </h2>
          <p
            className="text-[11px] font-semibold"
            style={{ color: "#8A7D6B" }}
          >
            선택한 퀘스트가 닉네임 위에 표시됩니다
          </p>
        </div>

        {/* 리스트 영역 */}
        <div
          className="p-2 mb-3"
          style={{
            background: "#F2E9D0",
            boxShadow: "0 4px 0 #B49A68",
            ...pixelBorder,
          }}
        >
          <div className="overflow-y-auto max-h-[280px] space-y-1.5 pr-1">
            <button
              onClick={() => setSelectedId(null)}
              className="w-full text-left px-3 py-2 text-[11px] font-extrabold flex items-center gap-2"
              style={{
                color: selectedId === null ? "#fff" : "#4A3F2F",
                background: selectedId === null ? "#4A3F2F" : "#FAF4E6",
                boxShadow: `0 3px 0 ${
                  selectedId === null ? "#1F1408" : "#B49A68"
                }`,
                ...pixelBorder,
              }}
            >
              <span>🚫</span>
              <span>공유 안 함</span>
            </button>

            {availableQuests.length === 0 ? (
              <div
                className="px-3 py-6 text-center"
                style={{ color: "#8A7D6B" }}
              >
                <div className="text-3xl mb-2">📭</div>
                <p className="text-xs font-extrabold mb-1">
                  공유할 퀘스트가 없습니다
                </p>
                <p className="text-[10px] font-semibold">
                  퀘스트 페이지에서 새 퀘스트를 등록해보세요
                </p>
              </div>
            ) : (
              availableQuests.map((quest) => {
                const tagColor = TAG_COLOR[quest.tagged] ?? {
                  bg: "#5B8C5A",
                  shadow: "#3D5C3C",
                };
                const isSel = selectedId === quest.id;
                return (
                  <button
                    key={quest.id}
                    onClick={() => setSelectedId(quest.id)}
                    className="w-full text-left px-3 py-2 text-[11px] font-extrabold flex items-center gap-2"
                    style={{
                      color: isSel ? "#fff" : "#4A3F2F",
                      background: isSel ? "#4A3F2F" : "#FAF4E6",
                      boxShadow: `0 3px 0 ${
                        isSel ? "#1F1408" : "#B49A68"
                      }`,
                      ...pixelBorder,
                    }}
                  >
                    <span
                      className="text-[9px] px-1.5 py-0.5 font-extrabold flex-shrink-0"
                      style={{
                        color: "#fff",
                        background: tagColor.bg,
                        boxShadow: `0 2px 0 ${tagColor.shadow}`,
                        ...pixelBorder,
                      }}
                    >
                      {STATUS[quest.tagged]}
                    </span>
                    <span className="truncate">{quest.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
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
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 text-xs font-extrabold"
            style={{
              color: "#fff",
              background: "#5B8C5A",
              boxShadow: "0 3px 0 #3D5C3C",
              ...pixelBorder,
            }}
          >
            ✨ 확인
          </button>
        </div>
      </div>
    </div>
  );
}
