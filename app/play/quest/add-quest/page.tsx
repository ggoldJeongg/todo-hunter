"use client";

import { useRouter } from "next/navigation";
import { useQuestStore } from "@/utils/stores/questStore";
import { useQuestFormStore } from "@/utils/stores/useQuestFormStore";
import QuestForm from "@/components/quest/QuestForm";

const AddQuestPage = () => {
  const router = useRouter();
  const { addQuest } = useQuestStore();
  const {
    questName, tagged, selectedDate, isWeekly,
    difficulty, selectedDays, resetForm,
  } = useQuestFormStore();

  // 서브태스크는 등록 후 목록 화면에서 "쪼개기" 모달로 추가하는 흐름.
  const handleCreate = async () => {
    await addQuest({
      name: questName,
      tagged,
      isWeekly,
      difficulty,
      expiredAt: selectedDate || null,
      days: isWeekly ? selectedDays : [],
      completed: false,
      characterId: 0,
    });
    resetForm();
    router.push("/play/quest");
  };

  return (
    <QuestForm
      title="퀘스트 생성"
      submitLabel="저장"
      onSubmit={handleCreate}
    />
  );
};

export default AddQuestPage;
