"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/common/Dialog";
import {
  REST_ACTIVITIES,
  getRandomRestActivity,
  type RestActivity,
} from "@/constants/restActivities";

interface RestActivityModalProps {
  open: boolean;
  onClose: () => void;
}

// 타이머와 동일한 부드러운 톤 픽셀 보더 (탠 컬러, 얇게)
const PIXEL_BORDER_SOFT = `url('data:image/svg+xml;utf8,<?xml version="1.0" encoding="UTF-8" ?><svg version="1.1" width="8" height="8" xmlns="http://www.w3.org/2000/svg"><path d="M3 1 h1 v1 h-1 z M4 1 h1 v1 h-1 z M2 2 h1 v1 h-1 z M5 2 h1 v1 h-1 z M1 3 h1 v1 h-1 z M6 3 h1 v1 h-1 z M1 4 h1 v1 h-1 z M6 4 h1 v1 h-1 z M2 5 h1 v1 h-1 z M5 5 h1 v1 h-1 z M3 6 h1 v1 h-1 z M4 6 h1 v1 h-1 z" fill="rgb(168,152,104)" /></svg>')`;

const PIXEL_BORDER_PURPLE = `url('data:image/svg+xml;utf8,<?xml version="1.0" encoding="UTF-8" ?><svg version="1.1" width="8" height="8" xmlns="http://www.w3.org/2000/svg"><path d="M3 1 h1 v1 h-1 z M4 1 h1 v1 h-1 z M2 2 h1 v1 h-1 z M5 2 h1 v1 h-1 z M1 3 h1 v1 h-1 z M6 3 h1 v1 h-1 z M1 4 h1 v1 h-1 z M6 4 h1 v1 h-1 z M2 5 h1 v1 h-1 z M5 5 h1 v1 h-1 z M3 6 h1 v1 h-1 z M4 6 h1 v1 h-1 z" fill="rgb(155,135,180)" /></svg>')`;

// 별칭 유지 (기존 호출 지점들 그대로 작동)
const PIXEL_BORDER_BROWN = PIXEL_BORDER_SOFT;

const pixelBorder = (src: string) => ({
  borderStyle: "solid",
  borderWidth: "2px",
  borderImageSlice: 3,
  borderImageWidth: 2,
  borderImageSource: src,
  borderImageRepeat: "stretch" as const,
  borderImageOutset: 1,
});

export default function RestActivityModal({
  open,
  onClose,
}: RestActivityModalProps) {
  const [activity, setActivity] = useState<RestActivity | null>(null);
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      const { activity, index } = getRandomRestActivity();
      setActivity(activity);
      setIndex(index);
    }
  }, [open]);

  const handleReroll = () => {
    const { activity: newAct, index: newIdx } = getRandomRestActivity(index);
    setActivity(newAct);
    setIndex(newIdx);
  };

  if (!activity) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-[340px] p-0 border-0 shadow-none bg-transparent"
        style={{ imageRendering: "pixelated" }}
      >
        {/* 양피지 패널 */}
        <div
          className="relative p-5"
          style={{
            background: "#FAF4E6",
            boxShadow: "0 6px 0 #B49A68",
            ...pixelBorder(PIXEL_BORDER_PURPLE),
          }}
        >
          {/* 헤더 */}
          <div className="flex flex-col items-center gap-1 mb-3">
            {/* 마법사 배지 */}
            <div
              className="w-12 h-12 flex items-center justify-center text-2xl"
              style={{
                background: "#6A4C8E",
                boxShadow: "0 3px 0 #4A3370",
                ...pixelBorder(PIXEL_BORDER_BROWN),
              }}
            >
              🔮
            </div>
            <h2
              className="text-base font-extrabold tracking-wide mt-2"
              style={{ color: "#4A3F2F" }}
            >
              의문의 마법사의 처방
            </h2>
            <div
              className="text-[11px] font-semibold px-2 py-0.5"
              style={{
                color: "#6A4C8E",
                background: "#F2E9D0",
                ...pixelBorder(PIXEL_BORDER_PURPLE),
              }}
            >
              &ldquo;그대에게 잠시 휴식이 필요해 보이는군...&rdquo;
            </div>
          </div>

          {/* 처방 카드 */}
          <div
            className="p-4 mb-4"
            style={{
              background: "#F2E9D0",
              boxShadow: "0 4px 0 #B49A68",
              ...pixelBorder(PIXEL_BORDER_BROWN),
            }}
          >
            <div className="text-center">
              <div className="text-5xl mb-2 leading-none">{activity.emoji}</div>
              <h3
                className="text-lg font-extrabold mb-2"
                style={{ color: "#4A3F2F" }}
              >
                {activity.name}
              </h3>

              {/* 카테고리 + 시간 배지 */}
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <span
                  className="text-[10px] font-bold px-2 py-0.5"
                  style={{
                    color: "#fff",
                    background: "#6A4C8E",
                    boxShadow: "0 2px 0 #4A3370",
                    ...pixelBorder(PIXEL_BORDER_BROWN),
                  }}
                >
                  {activity.category}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5"
                  style={{
                    color: "#6B4E1C",
                    background: "#F5D76E",
                    boxShadow: "0 2px 0 #B8923E",
                    ...pixelBorder(PIXEL_BORDER_BROWN),
                  }}
                >
                  약 {activity.durationMin}분
                </span>
              </div>

              <p
                className="text-xs leading-relaxed mb-3"
                style={{ color: "#6B5C42" }}
              >
                {activity.description}
              </p>
            </div>

            {/* 마법사 멘트 — 픽셀 가로선으로 구분 */}
            <div
              className="pt-3 mt-3"
              style={{ borderTop: "3px solid #C8B88A" }}
            >
              <p
                className="text-xs font-semibold text-center leading-relaxed"
                style={{ color: "#6A4C8E" }}
              >
                &ldquo;{activity.wizardLine}&rdquo;
              </p>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={handleReroll}
              className="flex-1 py-2.5 text-xs font-extrabold"
              style={{
                color: "#4A3F2F",
                background: "#FAF4E6",
                boxShadow: "0 3px 0 #B49A68",
                ...pixelBorder(PIXEL_BORDER_BROWN),
              }}
            >
              🎲 다른 처방
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-extrabold"
              style={{
                color: "#fff",
                background: "#6A4C8E",
                boxShadow: "0 3px 0 #4A3370",
                ...pixelBorder(PIXEL_BORDER_BROWN),
              }}
            >
              ✨ 받겠습니다
            </button>
          </div>

          <p
            className="text-[10px] text-center mt-3 font-semibold"
            style={{ color: "#B0A082" }}
          >
            처방 풀: {REST_ACTIVITIES.length}개
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
