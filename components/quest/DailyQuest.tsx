"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useQuestStore } from "@/utils/stores/questStore";
import { Tag } from "@/components/common/Tag";
import { Button } from "@/components/common/Button";
import { useRouter } from "next/navigation";
import SubTaskSplitModal from "@/components/quest/SubTaskSplitModal";

const DailyQuest = ({ hideHeader, hideAddButton }: { hideHeader?: boolean; hideAddButton?: boolean }) => {
  const { quests, fetchQuests, completeQuest, completeSubTask, deleteQuest, loading, error } = useQuestStore();
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [splitTarget, setSplitTarget] = useState<number | null>(null);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const onAddQuestHandler = () => {
    router.push("quest/add-quest");
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="pt-0">
      {!hideHeader && (
        <h2 className="p-3 w-fit bg-black text-white font-bold">
          일간 퀘스트 ({quests.filter((q) => !q.isWeekly && q.completed).length}/
          {quests.filter((q) => !q.isWeekly).length})
        </h2>
      )}

      {loading ? (
        <p className="text-center text-gray-500">로딩 중...</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        <div className="space-y-3">
          {quests
            .filter((q) => !q.isWeekly)
            .map(({ id, name, tagged, completed }) => (
              <div
                key={id}
                className={`relative flex items-center gap-3 is-rounded p-2.5 ${completed ? "opacity-60 bg-gray-100" : "bg-white"}`}
              >
                {/* 완료 시 DEFEATED 띠 (카드 가운데 가로로, 살짝 회전) */}
                {completed && (
                  <div
                    className="absolute pointer-events-none select-none z-10 text-center"
                    style={{
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%) rotate(-4deg)",
                      width: "55%",
                      background: "#86a48b",
                      color: "#ffffff",
                      fontFamily: "Galmuri11Bold, monospace",
                      fontSize: "13px",
                      letterSpacing: "5px",
                      padding: "2px 0",
                      borderTop: "2px solid rgba(255,255,255,0.5)",
                      borderBottom: "2px solid rgba(255,255,255,0.5)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                      textShadow: "1px 1px 0 rgba(0,0,0,0.3)",
                    }}
                  >
                    DEFEATED
                  </div>
                )}
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
                <span className="flex-1 text-sm truncate">{name}</span>
                <Tag variant={tagged}>{tagged}</Tag>
                {!completed && (
                  <button
                    className="shrink-0 cursor-pointer"
                    onClick={() => router.push(`/play/quest/edit-quest/${id}`)}
                  >
                    <Image src="/icons/Pencil.png" width={20} height={20} alt="수정" />
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

      {/* 할일 쪼개기 모달 */}
      {splitTarget !== null && (() => {
        const target = quests.find((q) => q.id === splitTarget);
        if (!target) return null;
        return (
          <SubTaskSplitModal
            questId={target.id}
            questName={target.name}
            questTagged={target.tagged}
            questDifficulty={target.difficulty}
            existingSubTasks={target.subTasks ?? []}
            onClose={() => setSplitTarget(null)}
          />
        );
      })()}
    </div>
  );
};

export default DailyQuest;
