"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useQuestStore } from "@/utils/stores/questStore";
import { Tag } from "@/components/common/Tag";
import { Button } from "@/components/common/Button";
import { useRouter } from "next/navigation";

const DailyQuest = ({ hideHeader, hideAddButton }: { hideHeader?: boolean; hideAddButton?: boolean }) => {
  const { quests, fetchQuests, completeQuest, deleteQuest, loading, error } = useQuestStore();
  const router = useRouter();

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const onAddQuestHandler = () => {
    router.push("quest/add-quest");
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
    </div>
  );
};

export default DailyQuest;
