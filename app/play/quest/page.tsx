"use client";

import React from "react";
import DailyQuest from "@/components/quest/DailyQuest";
import WeeklyQuest from "@/components/quest/WeeklyQuest";
import FightField from "@/components/quest/FightField";

const QuestPage = () => {

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* 경험치 진행 UI */}
      <div className="shrink-0">
        <div className="py-1 w-full bg-black text-white text-center font-bold text-sm">
          경험치 쌓는 중...
        </div>
        <FightField />
      </div>

      {/* 퀘스트 영역 */}
      <div className="flex-1 flex flex-col p-3 overflow-y-auto pb-20">
          <div className="mt-2"></div>
          <DailyQuest />
          <div className="mt-6"></div>
          <WeeklyQuest />
          <br />
      </div>
    </div>
  );
};

export default QuestPage;