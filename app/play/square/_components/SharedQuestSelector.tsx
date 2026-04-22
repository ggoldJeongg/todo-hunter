"use client";

import { useState } from "react";
import { useQuestStore } from "@/utils/stores/questStore";
import { useSquareStore } from "@/utils/stores/squareStore";
import { STATUS } from "@/constants";
import { FEATURES } from "@/constants/features";

interface SharedQuestSelectorProps {
  open: boolean;
  onClose: () => void;
}

export default function SharedQuestSelector({
  open,
  onClose,
}: SharedQuestSelectorProps) {
  const { quests } = useQuestStore();
  const { sharedQuest, setSharedQuest } = useSquareStore();
  const [selectedId, setSelectedId] = useState<number | null>(
    sharedQuest?.id ?? null
  );

  if (!FEATURES.SHARED_QUEST) return null;
  if (!open) return null;

  const handleConfirm = () => {
    if (selectedId === null) {
      setSharedQuest(null);
    } else {
      const quest = quests.find((q) => q.id === selectedId);
      if (quest) {
        setSharedQuest({
          id: quest.id,
          name: quest.name,
          tagged: quest.tagged,
        });
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1a2e] border border-gray-600 rounded-xl p-4 w-[320px] max-h-[400px] flex flex-col">
        <h3 className="text-white font-bold text-sm mb-3">
          광장에 공유할 퀘스트 선택
        </h3>

        <div className="flex-1 overflow-y-auto space-y-1.5 mb-3">
          {/* 공유 안 함 옵션 */}
          <button
            onClick={() => setSelectedId(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedId === null
                ? "bg-purple-600/40 border border-purple-400 text-white"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            공유 안 함
          </button>

          {quests.map((quest) => (
            <button
              key={quest.id}
              onClick={() => setSelectedId(quest.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedId === quest.id
                  ? "bg-purple-600/40 border border-purple-400 text-white"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              <span>{quest.name}</span>
              <span className="ml-2 text-yellow-300 text-xs">
                {STATUS[quest.tagged]}
              </span>
            </button>
          ))}

          {quests.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              등록된 퀘스트가 없습니다
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-bold bg-gray-600 hover:bg-gray-700 text-white transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
