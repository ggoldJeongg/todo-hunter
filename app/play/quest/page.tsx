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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-paper">
      {/* 상단: 배틀 필드 (프레임 패널로 감쌈) */}
      <div className="mx-3 mt-3 shrink-0 overflow-hidden pixel-card">
        <FightField theme="field"/>
      </div>

      {/* 탭 + 리스트를 프레임 패널(pixel-card)로 감쌈 — mb-24 로 하단 네비바 위로 */}
      <div className="mx-3 mt-3 mb-24 flex flex-1 min-h-0 flex-col overflow-hidden pixel-card">
        {/* 탭 버튼 */}
        <div className="flex shrink-0 border-b-2 border-ink">
          <button
            className={`flex-1 py-3 text-center font-galmuri11-bold text-sm transition-colors cursor-pointer ${
              activeTab === "daily"
                ? "bg-ink text-paper"
                : "bg-paper text-stone"
            }`}
            onClick={() => setActiveTab("daily")}
          >
            일간 퀘스트({dailyCount.filter(q => q.completed).length}/{dailyCount.length})
          </button>
          <button
            className={`flex-1 py-3 text-center font-galmuri11-bold text-sm transition-colors cursor-pointer ${
              activeTab === "weekly"
                ? "bg-ink text-paper"
                : "bg-paper text-stone"
            }`}
            onClick={() => setActiveTab("weekly")}
          >
            주간 퀘스트({weeklyCount.filter(q => q.completed).length}/{weeklyCount.length})
          </button>
        </div>

        {/* 퀘스트 리스트 (프레임 내부 스크롤) */}
        <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0 overflow-y-auto p-4 pb-20 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {activeTab === "daily" && dailyCount.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-stone text-center text-sm">할일 추가 버튼을 눌러<br/>퀘스트를 추가하세요</p>
              </div>
            )}
            {activeTab === "weekly" && weeklyCount.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-stone text-center text-sm">할일 추가 버튼을 눌러<br/>퀘스트를 추가하세요</p>
              </div>
            )}
            {activeTab === "daily" ? <DailyQuest hideHeader hideAddButton /> : <WeeklyQuest hideHeader hideAddButton />}
          </div>

          {/* 할일 추가 버튼 — 프레임 내 우측 하단 고정 */}
          <div className="absolute bottom-4 right-4 z-20">
            <button
              className="bg-brand text-white px-4 py-2 border-[3px] border-ink font-galmuri11-bold text-sm cursor-pointer shadow-[3px_3px_0_0_theme(colors.ink)] transition-all active:bg-brand-active active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_theme(colors.ink)]"
              onClick={() => router.push("/play/quest/add-quest")}
            >
              + 할일 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestPage;