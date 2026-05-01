"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuestStore } from "@/utils/stores/questStore";
import { useQuestFormStore } from "@/utils/stores/useQuestFormStore";
import QuestForm from "@/components/quest/QuestForm";

const EditQuestPage = () => {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { quests, fetchQuests, updateQuest } = useQuestStore();
  const {
    questName, tagged, selectedDate, isWeekly, difficulty, selectedDays,
    setQuestName, setTagged, setSelectedDate, setIsWeekly, setDifficulty, setSelectedDays,
    resetForm,
  } = useQuestFormStore();

  const [loaded, setLoaded] = useState(false);

  // 퀘스트 데이터를 폼에 채우기
  useEffect(() => {
    if (loaded) return;

    const questId = Number(id);
    let quest = quests.find((q) => q.id === questId);

    if (!quest) {
      // quests가 아직 로드 안 됐으면 fetch 후 재시도
      fetchQuests().then(() => {
        quest = useQuestStore.getState().quests.find((q) => q.id === questId);
        if (quest) fillForm(quest);
      });
    } else {
      fillForm(quest);
    }
    // fillForm / fetchQuests / setter 들은 store action 으로 stable reference.
    // deps 에 추가하면 zustand setter 변경 등 엣지케이스에서 재실행되지만, 의도는 1회 초기화이므로 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, quests, loaded]);

  const fillForm = (quest: {
    name: string;
    tagged: string;
    isWeekly: boolean;
    difficulty?: string;
    expiredAt?: string | null;
    days?: string[];
  }) => {
    setQuestName(quest.name);
    setTagged(quest.tagged as "STR" | "INT" | "EMO" | "FIN" | "LIV");
    setIsWeekly(quest.isWeekly);
    if (quest.difficulty) setDifficulty(quest.difficulty as "easy" | "normal" | "hard");
    if (quest.expiredAt) setSelectedDate(quest.expiredAt.split("T")[0]);
    setSelectedDays(quest.days ?? []);
    setLoaded(true);
  };

  const handleUpdate = async () => {
    await updateQuest(Number(id), {
      name: questName,
      tagged: tagged as "STR" | "INT" | "EMO" | "FIN" | "LIV",
      isWeekly,
      difficulty,
      expiredAt: selectedDate || null,
      days: isWeekly ? selectedDays : [],
    });
    resetForm();
    router.push("/play/quest");
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#2a2a2a] text-white">
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <QuestForm
      title="퀘스트 수정"
      submitLabel="수정"
      onSubmit={handleUpdate}
    />
  );
};

export default EditQuestPage;
