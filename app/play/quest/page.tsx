"use client";

import React, { useEffect, useState } from "react";
import { Button, PixelTabs } from "@/components/common";
import DailyQuest from "@/components/quest/DailyQuest";
import WeeklyQuest from "@/components/quest/WeeklyQuest";
import FightField from "@/components/quest/FightField";
import { useRouter } from "next/navigation";
import { useQuestStore } from "@/utils/stores/questStore";

const QuestPage = () => {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const router = useRouter();
  const { quests } = useQuestStore();

  // 필드 배경 이미지(field_01.png)의 하단 5px 평균색을 추출해, 그 색으로 페이드/연장한다.
  // (몬스터·헌터는 별도 스프라이트라 이미지 하단부는 흙바닥 색만 담김)
  const [edgeColor, setEdgeColor] = useState<string>("#382623"); // 폴백: field_01.png 하단 실측 흙색
  useEffect(() => {
    const img = new Image();
    img.src = "/images/backgrounds/field_01.png"; // FightField 'field' 테마 배경 (동일 출처)
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const band = 5; // 하단 5px
      const y0 = Math.max(0, img.naturalHeight - band);
      const { data } = ctx.getImageData(0, y0, img.naturalWidth, band);
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
      setEdgeColor(`rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`);
    };
  }, []);

  const dailyCount = quests.filter((q) => !q.isWeekly);
  const weeklyCount = quests.filter((q) => q.isWeekly);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-paper">
      {/* 상단: 배틀 필드 — full-bleed. 바깥 div 배경을 흙색(edgeColor)으로 깔아
          아래 시트의 라운드 코너 뒤 + 필드-탭 사이 갭을 흙색으로 채운다(크림 삼각형 제거). */}
      <div className="relative shrink-0 overflow-hidden" style={{ backgroundColor: edgeColor }}>
        <div className="relative">
          <FightField theme="field"/>
          {/* 하단 스크림 — 이미지 하단 5px에서 추출한 색(edgeColor)으로 페이드 후 이어 붙여,
              이미지 흙바닥이 자연스럽게 연장되어 탭으로 이어지게 한다. */}
          <div
            className="pointer-events-none absolute inset-x-0 -bottom-[15px] h-12 z-10"
            style={{ background: `linear-gradient(to bottom, transparent 0%, ${edgeColor} 70%, ${edgeColor} 100%)` }}
          />
        </div>
        {/* 흙색 받침 — 시트 코너 뒷배경용 최소 높이(≈코너 반경).
            받침이 높으면 탭이 그만큼 아래로 밀리므로, 겹침(-mt-24)에 필요한 만큼만 둔다. */}
        <div className="h-4" />
      </div>

      {/* 탭 + 리스트 — 상단 라운드 시트. 코너 반경(24px)만큼 흙색 받침 위로 겹쳐 올려 삼각형 빈틈 제거 */}
      <div className="relative z-20 -mt-[24px] mb-24 flex flex-1 min-h-0 flex-col overflow-hidden rounded-t-[24px] bg-paper shadow-[0_-8px_20px_rgba(0,0,0,0.08)]">
        {/* 탭 버튼 */}
        <PixelTabs
          active={activeTab}
          onChange={(k) => setActiveTab(k as "daily" | "weekly")}
          tabs={[
            { key: "daily", label: `일간 퀘스트(${dailyCount.filter(q => q.completed).length}/${dailyCount.length})` },
            { key: "weekly", label: `주간 퀘스트(${weeklyCount.filter(q => q.completed).length}/${weeklyCount.length})` },
          ]}
        />

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
            <Button
              type="button"
              state="primary"
              onClick={() => router.push("/play/quest/add-quest")}
              className="w-auto m-0 px-4 py-2 text-sm font-galmuri11-bold"
            >
              + 할일 추가
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestPage;