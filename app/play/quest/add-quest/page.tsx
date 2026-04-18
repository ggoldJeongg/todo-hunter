"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuestStore } from "@/utils/stores/questStore";
import { useQuestFormStore } from "@/utils/stores/useQuestFormStore";
import { STATUS } from "@/constants/status";
import DateSelector from "@/components/common/DateSelector";
import { Button, Input } from "@/components/common";

const DAYS = ["월", "화", "수", "목", "금", "토"] as const;
const STATUS_KEYS = Object.keys(STATUS) as (keyof typeof STATUS)[];

const AddDailyQuest = () => {
  const router = useRouter();
  const { addQuest } = useQuestStore();
  const {
    questName,
    tagged,
    selectedDate,
    isWeekly,
    setQuestName,
    setTagged,
    setSelectedDate,
    setIsWeekly,
    resetForm,
  } = useQuestFormStore();

  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    if (!isWeekly) setIsWeekly(true);
  };

  const onSaveQuestHandler = async () => {
    if (!questName.trim()) {
      alert("퀘스트 이름을 입력하세요!");
      return;
    }

    const user = { characterId: 1 }; // 추후 실제 로그인된 유저 정보로 대체

    if (!user?.characterId) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      await addQuest({
        characterId: user.characterId, 
        name: questName,
        tagged,
        isWeekly,
        expiredAt: selectedDate || null,
        completed: false,
      });

      resetForm(); // 폼 초기화
      router.push("/play/quest");
    } catch (err) {
      console.error("퀘스트 추가 중 오류 발생", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#2a2a2a] text-white">
      {/* 헤더 */}
      <div className="flex items-center px-4 pt-4 pb-3 shrink-0">
        <button onClick={() => { resetForm(); router.push("/play/quest"); }} className="text-white text-2xl cursor-pointer">←</button>
        <h1 className="flex-1 text-center text-lg font-galmuri11-bold mr-6">퀘스트 생성</h1>
      </div>

      {/* 폼 영역 */}
      <div className="overflow-y-auto px-5 py-4">
        {/* Q. 무슨 일을 하나요? */}
        <h2 className="text-center font-bold text-base mb-4">Q. 무슨 일을 하나요?</h2>

        {/* 카테고리 - 화살표 전환 */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            className="text-white text-2xl cursor-pointer px-2"
            onClick={() => {
              const idx = STATUS_KEYS.indexOf(tagged as keyof typeof STATUS);
              const prev = idx <= 0 ? STATUS_KEYS.length - 1 : idx - 1;
              setTagged(STATUS_KEYS[prev]);
            }}
          >
            ◀
          </button>
          <span className={`is-rounded px-6 py-2 text-base font-bold text-white ${
            { STR: "bg-red-500", INT: "bg-blue-500", EMO: "bg-purple-500", FIN: "bg-green-500", LIV: "bg-yellow-500" }[tagged] || "bg-gray-600"
          }`}>
            {STATUS[tagged as keyof typeof STATUS] || "선택"}
          </span>
          <button
            className="text-white text-2xl cursor-pointer px-2"
            onClick={() => {
              const idx = STATUS_KEYS.indexOf(tagged as keyof typeof STATUS);
              const next = idx >= STATUS_KEYS.length - 1 ? 0 : idx + 1;
              setTagged(STATUS_KEYS[next]);
            }}
          >
            ▶
          </button>
        </div>

        <Input
          type="text"
          placeholder="자세한 할일을 입력하세요"
          value={questName}
          onChange={(e) => setQuestName(e.target.value)}
          className="is-rounded-form w-full shadow-none text-black"
        />

        {/* Q. 언제부터, 얼마나 하나요? */}
        <h2 className="text-center font-bold text-base mt-8 mb-4">Q. 언제부터, 얼마나 하나요?</h2>

        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm font-bold shrink-0">시작일</span>
          <div className="flex-1">
            <DateSelector onUpdate={setSelectedDate} />
          </div>
        </div>

        <div className="mb-4">
          <span className="text-sm font-bold block mb-3">반복 요일</span>
          <div className="grid grid-cols-6 gap-3 overflow-hidden px-1">
            {DAYS.map((day) => (
              <button
                key={day}
                className={`is-rounded py-2 text-sm font-bold cursor-pointer transition-colors flex items-center justify-center ${
                  selectedDays.includes(day)
                    ? "bg-[#C84B3A] text-white"
                    : "bg-gray-700 text-gray-300"
                }`}
                onClick={() => toggleDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex gap-3 px-5 py-4 shrink-0">
        <Button className="flex-1" state="outline" size="M" onClick={() => { resetForm(); router.push("/play/quest"); }}>
          취소
        </Button>
        <Button className="flex-1" state="primary" size="M" onClick={onSaveQuestHandler}>
          할일 추가
        </Button>
      </div>
    </div>
  );
};

export default AddDailyQuest;
