"use client";

import { useRouter } from "next/navigation";
import { useQuestStore } from "@/utils/stores/questStore";
import { useQuestFormStore } from "@/utils/stores/useQuestFormStore";
import QuestForm from "@/components/quest/QuestForm";

const AddQuestPage = () => {
  const router = useRouter();
  const { addQuest } = useQuestStore();
  const { questName, tagged, selectedDate, isWeekly, difficulty, resetForm } = useQuestFormStore();

  const handleCreate = async () => {
    await addQuest({
      name: questName,
      tagged,
      isWeekly,
      difficulty,
      expiredAt: selectedDate || null,
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
