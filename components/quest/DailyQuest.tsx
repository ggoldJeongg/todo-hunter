"use client";

import React, { useEffect, useState } from "react";
import { IconButton } from "@/components/common";
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
        <h2 className="p-3 w-fit bg-ink text-paper font-bold">
          일간 퀘스트 ({quests.filter((q) => !q.isWeekly && q.completed).length}/
          {quests.filter((q) => !q.isWeekly).length})
        </h2>
      )}

      {loading ? (
        <p className="text-center text-stone">로딩 중...</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        <div className="space-y-3">
          {quests
            .filter((q) => !q.isWeekly)
            .map((quest) => {
              const { id, name, tagged, completed, subTasks } = quest;
              const hasSubTasks = !!subTasks && subTasks.length > 0;
              const completedSubCount = subTasks?.filter((s) => s.completedAt).length ?? 0;
              const totalSubCount = subTasks?.length ?? 0;
              const expanded = expandedIds.has(id);

              return (
                <div
                  key={id}
                  className={`relative flex flex-wrap items-center gap-3 quest-card p-2.5 ${completed ? "opacity-60" : ""}`}
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

                  <IconButton
                    src={completed ? "/icons/check_on.svg" : "/icons/check_off.svg"}
                    alt={completed ? "완료" : "미완료"}
                    disabled={completed || hasSubTasks}
                    onClick={() => { if (!completed && !hasSubTasks) completeQuest(id); }}
                    title={hasSubTasks ? "서브태스크를 모두 완료해야 합니다" : ""}
                  />

                  <div className="flex-1 min-w-0">
                    <span className="text-sm line-clamp-2 break-all block">{name}</span>
                    {hasSubTasks && (
                      <span className="text-[11px] text-stone">
                        서브태스크 {completedSubCount}/{totalSubCount}
                      </span>
                    )}
                  </div>

                  <Tag variant={tagged}>{tagged}</Tag>

                  {hasSubTasks && (
                    <button
                      className="shrink-0 cursor-pointer text-xs text-stone px-1"
                      onClick={() => toggleExpand(id)}
                      aria-label={expanded ? "접기" : "펼치기"}
                    >
                      {expanded ? "▲" : "▼"}
                    </button>
                  )}
                  {!completed && (
                    <IconButton
                      src="/icons/Numbered-List.svg"
                      alt="할일 쪼개기"
                      onClick={() => setSplitTarget(id)}
                      title="할일 쪼개기"
                    />
                  )}
                  {!completed && (
                    <IconButton
                      src="/icons/Pencil.png"
                      alt="수정"
                      onClick={() => router.push(`/play/quest/edit-quest/${id}`)}
                    />
                  )}
                  {!completed && (
                    <IconButton src="/icons/circle-x.svg" alt="삭제" onClick={() => deleteQuest(id)} />
                  )}

                  {/* 서브태스크 펼침 영역 — w-full basis-full 로 다음 줄에 배치 */}
                  {hasSubTasks && expanded && (
                    <div className="w-full basis-full border-t border-ink/15 mt-2 pt-2 space-y-1.5">
                      {subTasks!.map((s) => {
                        const isDone = !!s.completedAt;
                        return (
                          <div key={s.id} className="flex items-center gap-2">
                            <IconButton
                              size={16}
                              src={isDone ? "/icons/check_on.svg" : "/icons/check_off.svg"}
                              alt={isDone ? "완료" : "미완료"}
                              disabled={isDone || completed}
                              onClick={() => { if (!isDone && !completed) completeSubTask(id, s.id); }}
                            />
                            <span
                              className={`text-xs flex-1 truncate ${
                                isDone ? "line-through text-stone" : "text-ink"
                              }`}
                            >
                              {s.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
