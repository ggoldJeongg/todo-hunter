"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuestFormStore } from "@/utils/stores/useQuestFormStore";
import { STATUS } from "@/constants/status";
import { EXP_PER_QUEST } from "@/constants/game";
import { Button, Input, Calendar } from "@/components/common";
import { Tag } from "@/components/common/Tag";
import { format } from "date-fns";

const QUEST_NAME_MAX = 40;
const DAYS = ["월", "화", "수", "목", "금", "토"] as const;
const STATUS_KEYS = Object.keys(STATUS) as (keyof typeof STATUS)[];

const DIFFICULTY_CONFIG = {
  easy:   { label: "쉬움",  stars: 1, expMult: 1 },
  normal: { label: "보통",  stars: 2, expMult: 2 },
  hard:   { label: "어려움", stars: 3, expMult: 3 },
} as const;

interface QuestFormProps {
  title: string;
  submitLabel: string;
  onSubmit: () => Promise<void>;
}

const QuestForm = ({ title, submitLabel, onSubmit }: QuestFormProps) => {
  const router = useRouter();
  const {
    questName, tagged, selectedDate, isWeekly,
    selectedDays, difficulty,
    setQuestName, setTagged, setSelectedDate,
    setIsWeekly, setSelectedDays, setDifficulty,
    resetForm,
  } = useQuestFormStore();

  const [calendarOpen, setCalendarOpen] = useState(false);

  const toggleDay = (day: string) => {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    setSelectedDays(next);
    if (!isWeekly) setIsWeekly(true);
  };

  const goBack = () => { resetForm(); router.push("/play/quest"); };

  const handleSubmit = async () => {
    if (!questName.trim()) return;
    await onSubmit();
  };

  return (
    <div className="flex flex-col bg-[#2a2a2a] text-white h-screen overflow-hidden">
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <button onClick={goBack} className="text-white text-2xl cursor-pointer">
          &larr;
        </button>
        <h1 className="text-lg font-bold">{title}</h1>
        <Button
          state="primary"
          size="S"
          onClick={handleSubmit}
          disabled={!questName.trim()}
          className={!questName.trim() ? "opacity-40" : ""}
        >
          {submitLabel}
        </Button>
      </div>

      {/* ── 폼 스크롤 영역 ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-28 space-y-7 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>

        {/* 1. 할일 입력 */}
        <div>
          <Input
            type="text"
            placeholder="할일을 입력하세요"
            value={questName}
            maxLength={QUEST_NAME_MAX}
            onChange={(e) => setQuestName(e.target.value)}
            className="is-rounded-form w-full shadow-none text-black"
          />
          <p className="text-right text-xs text-gray-500 mt-1">
            {questName.length} / {QUEST_NAME_MAX}
          </p>
        </div>

        {/* 2. 스탯 태그 */}
        <section>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
            <span className="text-yellow-400"></span> Q. 어떤 스탯을 성장시키나요?
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {STATUS_KEYS.map((key) => (
              <button key={key} onClick={() => setTagged(key)} className="cursor-pointer">
                <Tag
                  variant={key}
                  className={`w-full justify-center py-2 text-xs transition-all ${
                    tagged === key
                      ? "ring-2 ring-white scale-105"
                      : "opacity-60"
                  }`}
                >
                  <span className="flex flex-col items-center leading-tight">
                    <span className="font-bold">{key}</span>
                    <span className="text-[10px]">{STATUS[key]}</span>
                  </span>
                </Tag>
              </button>
            ))}
          </div>
        </section>

        {/* 3. 퀘스트 유형 */}
        <section>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
            <span className="text-blue-400"></span> Q. 일주일 몇번 반복하나요?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`is-rounded py-2.5 text-sm font-bold cursor-pointer transition-all text-center ${
                !isWeekly
                  ? "bg-[#C84B3A] text-white ring-2 ring-white"
                  : "bg-gray-700 text-gray-400"
              }`}
              onClick={() => { setIsWeekly(false); setSelectedDays([]); }}
            >
              일간 퀘스트
            </button>
            <button
              className={`is-rounded py-2.5 text-sm font-bold cursor-pointer transition-all text-center ${
                isWeekly
                  ? "bg-[#C84B3A] text-white ring-2 ring-white"
                  : "bg-gray-700 text-gray-400"
              }`}
              onClick={() => setIsWeekly(true)}
            >
              주간 퀘스트
            </button>
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">
            {isWeekly ? "특정 요일에 반복되는 퀘스트" : "특정 요일에 반복되는 할일"}
          </p>
        </section>

        {/* 4. 반복 요일 (주간 선택 시 표시) */}
        {isWeekly && (
          <section>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
              <span className="text-green-400"></span> 반복 요일
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  className={`is-rounded py-2.5 text-sm font-bold cursor-pointer transition-all flex items-center justify-center ${
                    selectedDays.includes(day)
                      ? "bg-[#C84B3A] text-white ring-2 ring-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 5. 난이도 */}
        <section>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
            <span className="text-yellow-300"></span> Q. 지금 내 체력으로는 어느정도로?
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(DIFFICULTY_CONFIG) as Array<keyof typeof DIFFICULTY_CONFIG>).map((key) => {
              const cfg = DIFFICULTY_CONFIG[key];
              const isActive = difficulty === key;
              return (
                <button
                  key={key}
                  className={`is-rounded py-3 cursor-pointer transition-all text-center ${
                    isActive
                      ? "bg-[#C84B3A] text-white ring-2 ring-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                  onClick={() => setDifficulty(key)}
                >
                  <div className="text-sm">
                    {"★".repeat(cfg.stars)}{"☆".repeat(3 - cfg.stars)}
                  </div>
                  <div className="text-xs font-bold mt-0.5">{cfg.label}</div>
                </button>
              );
            })}
          </div>
          <p className="text-right text-[11px] text-gray-500 mt-1.5">
            획득 EXP: +{EXP_PER_QUEST * DIFFICULTY_CONFIG[difficulty].expMult}
          </p>
        </section>

        {/* 6. 시작일 */}
        <section>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
            <span className="text-purple-400"></span> Q. 언제부터 하나요?
          </h3>
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="is-rounded-form w-full bg-gray-800 text-white px-4 py-3 text-sm text-left cursor-pointer flex items-center justify-between"
          >
            <span>{selectedDate || format(new Date(), "yyyy-MM-dd")}</span>
            <span className="text-gray-400">&#128197;</span>
          </button>
        </section>

        {/* 캘린더 모달 */}
        {calendarOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setCalendarOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60" />
            <div
              className="relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Calendar
                mode="single"
                disabled={{ before: new Date() }}
                selected={selectedDate ? new Date(selectedDate + "T00:00:00") : new Date()}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(format(date, "yyyy-MM-dd"));
                    setCalendarOpen(false);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestForm;
