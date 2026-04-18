"use client";

import React, { useState } from "react";
import DailyQuest from "@/components/quest/DailyQuest";
import WeeklyQuest from "@/components/quest/WeeklyQuest";
import FightField from "@/components/quest/FightField";
import { useRouter } from "next/navigation";
import { useQuestStore } from "@/utils/stores/questStore";

const QuestPage = () => {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const router = useRouter();
  const { quests } = useQuestStore();

  const dailyCount = quests.filter((q) => !q.isWeekly);
  const weeklyCount = quests.filter((q) => q.isWeekly);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50">
      {/* 상단: 배틀 필드 */}
      <div className="shrink-0">
        <FightField theme="volcano"/>
      </div>

      {/* 탭 버튼 */}
      <div className="flex shrink-0">
        <button
          className={`flex-1 py-3 text-center font-bold text-sm transition-colors cursor-pointer ${
            activeTab === "daily"
              ? "bg-[#C84B3A] text-white"
              : "bg-gray-200 text-gray-600"
          }`}
          onClick={() => setActiveTab("daily")}
        >
          일간 퀘스트({dailyCount.filter(q => q.completed).length}/{dailyCount.length})
        </button>
        <button
          className={`flex-1 py-3 text-center font-bold text-sm transition-colors cursor-pointer ${
            activeTab === "weekly"
              ? "bg-[#C84B3A] text-white"
              : "bg-gray-200 text-gray-600"
          }`}
          onClick={() => setActiveTab("weekly")}
        >
          주간 퀘스트({weeklyCount.filter(q => q.completed).length}/{weeklyCount.length})
        </button>
      </div>

      {/* 퀘스트 리스트 (내부 스크롤) */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 overflow-y-auto p-4 pb-28 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {activeTab === "daily" && dailyCount.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-center text-sm">할일 추가 버튼을 눌러<br/>퀘스트를 추가하세요</p>
            </div>
          )}
          {activeTab === "weekly" && weeklyCount.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-center text-sm">할일 추가 버튼을 눌러<br/>퀘스트를 추가하세요</p>
            </div>
          )}
          {activeTab === "daily" ? <DailyQuest hideHeader hideAddButton /> : <WeeklyQuest hideHeader hideAddButton />}
        </div>

        {/* 할일 추가 버튼 — 스크롤 영역 내 우측 하단 고정 */}
        <div className="absolute bottom-24 right-4 z-20">
          <button
            className="bg-[#C84B3A] text-white px-4 py-2 rounded-full shadow-lg active:bg-[#a33a2c] font-bold text-sm cursor-pointer"
            onClick={() => router.push("/play/quest/add-quest")}
          >
            + 할일 추가
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestPage;