"use client";

import React, { useEffect, useMemo } from "react";
import Image from "next/image";
import { useQuestStore } from "@/utils/stores/questStore";
import { Tag } from "@/components/common/Tag";
import { Button } from "@/components/common/Button";
import { useRouter } from "next/navigation";

// 한국어 요일 → 정렬 인덱스 (월=0, ..., 일=6)
const DAY_ORDER: Record<string, number> = {
  "월": 0, "화": 1, "수": 2, "목": 3, "금": 4, "토": 5, "일": 6,
};

const WeeklyQuest = ({ hideHeader, hideAddButton }: { hideHeader?: boolean; hideAddButton?: boolean }) => {
  const { quests, fetchQuests, completeQuest, deleteQuest, loading, error } = useQuestStore();
  const router = useRouter();

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const onAddQuestHandler = () => {
    router.push("quest/add-quest");
  };

  const formatDate = (dateString: string | number | Date) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split("T")[0];
  };

  // 주간 퀘스트 정렬: 오늘 해당 quest 우선 → 그 다음 가장 빠른 요일 기준
  const sortedWeeklyQuests = useMemo(() => {
    const todayKo = ["일", "월", "화", "수", "목", "금", "토"][new Date().getDay()];
    const earliestDayIdx = (days?: string[]) => {
      if (!days || days.length === 0) return 99;
      return Math.min(...days.map((d) => DAY_ORDER[d] ?? 99));
    };
    return quests
      .filter((q) => q.isWeekly)
      .slice()
      .sort((a, b) => {
        const aHasToday = a.days?.includes(todayKo) ? 0 : 1;
        const bHasToday = b.days?.includes(todayKo) ? 0 : 1;
        if (aHasToday !== bHasToday) return aHasToday - bHasToday;
        return earliestDayIdx(a.days) - earliestDayIdx(b.days);
      });
  }, [quests]);

  return (
    <div className="pt-0">
      {!hideHeader && (
        <h2 className="p-3 w-fit bg-black text-white font-bold">
          주간 퀘스트 ({quests.filter((q) => q.isWeekly && q.completed).length}/
          {quests.filter((q) => q.isWeekly).length})
        </h2>
      )}

      {loading ? (
        <p className="text-center text-gray-500">로딩 중...</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        <div className="space-y-3">
          {sortedWeeklyQuests.map(({ id, name, tagged, completed, expiredAt, days, streak }) => (
              <div
                key={id}
                className={`flex items-center gap-3 is-rounded p-2.5 ${completed ? "opacity-50 bg-gray-100" : "bg-white"}`}
              >
                <button
                  className="shrink-0 cursor-pointer"
                  disabled={completed}
                  onClick={() => { if (!completed) completeQuest(id); }}
                >
                  <Image
                    src={completed ? "/icons/check_on.svg" : "/icons/check_off.svg"}
                    width={20}
                    height={20}
                    alt={completed ? "완료" : "미완료"}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <span className="text-sm truncate block">{name}</span>
                  {days && days.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {days.join("·")}
                      {streak && streak > 0 ? (
                        <span className="ml-1.5 text-orange-500 font-bold">🔥 {streak}주 연속</span>
                      ) : null}
                    </p>
                  )}
                  {expiredAt && (
                    <p className="text-xs text-gray-400">{formatDate(expiredAt)}</p>
                  )}
                </div>
                <Tag variant={tagged}>{tagged}</Tag>
                {!completed && (
                  <button
                    className="shrink-0 cursor-pointer"
                    onClick={() => router.push(`/play/quest/edit-quest/${id}`)}
                  >
                    <Image src="/icons/pencil.png" width={20} height={20} alt="수정" />
                  </button>
                )}
                {!completed && (
                  <button className="shrink-0 cursor-pointer" onClick={() => deleteQuest(id)}>
                    <Image src="/icons/circle-x.svg" width={20} height={20} alt="삭제" />
                  </button>
                )}
              </div>
            ))}
        </div>
      )}
      {!hideAddButton && (
        <div className="flex justify-center">
          <Button size="L" className="mt-2" onClick={onAddQuestHandler}>
            ⚡ 할 일 추가
          </Button>
        </div>
      )}
    </div>
  );
};

export default WeeklyQuest;
