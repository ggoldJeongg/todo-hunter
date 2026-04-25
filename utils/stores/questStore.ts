import { STATUS } from "@/constants";
import { toast } from "sonner";
import { create } from "zustand";
import { useUserStore } from "@/utils/stores/userStore";
import { getMonsterByKillCount, QUEST_DAMAGE } from "@/utils/pixi/MonsterRegistry";

interface Quest {
  id: number;
  name: string;
  isWeekly: boolean;
  tagged: "STR" | "INT" | "EMO" | "FIN" | "LIV";
  expiredAt?: string | null;
  difficulty?: string;
  completed: boolean;
  characterId: number;
  days?: string[]; // 주간 퀘스트의 반복 요일 (예: ["월", "수", "금"])
  streak?: number; // 주간 퀘스트의 연속 성공 주 수 (days 모두 만족한 주 카운트)
}

interface QuestStore {
  quests: Quest[];
  loading: boolean;
  error: string | null;
  isMoving: boolean;
  isMovingForward: boolean;
  isAttacking: boolean;
  isDefeated: boolean;
  killCount: number;
  monsterHp: number; // 현재 몬스터 HP
  monsterMaxHp: number; // 현재 몬스터 최대 HP
  setDefeated: (value: boolean) => void;
  spawnNextMonster: () => void;
  fetchQuests: () => Promise<void>;
  completeQuest: (questId: number) => Promise<void>;
  deleteQuest: (questId: number) => Promise<void>;
  addQuest: (quest: Omit<Quest, "id">) => Promise<void>;
  updateQuest: (questId: number, data: Partial<Quest>) => Promise<void>;
}

// 초기 몬스터
const initialMonster = getMonsterByKillCount(0);

export const useQuestStore = create<QuestStore>((set, get) => ({
  quests: [],
  loading: false,
  error: null,
  isMoving: false,
  isMovingForward: false,
  isAttacking: false,
  isDefeated: false,
  killCount: 0,
  monsterHp: initialMonster.hp,
  monsterMaxHp: initialMonster.hp,

  setDefeated: (value) => {
    const prev = get().isDefeated;
    if (value && !prev) {
      const newKillCount = get().killCount + 1;
      set({ isDefeated: true, killCount: newKillCount });
      toast.success(`몬스터를 처치했습니다!`);

      // CLEAR 연출 후 자동으로 다음 몬스터 젠 (2초 뒤)
      setTimeout(() => {
        get().spawnNextMonster();
      }, 2000);
    } else {
      set({ isDefeated: value });
    }
  },

  spawnNextMonster: () => {
    const { killCount } = get();
    const next = getMonsterByKillCount(killCount);
    set({
      isDefeated: false,
      monsterHp: next.hp,
      monsterMaxHp: next.hp,
    });
    toast(`${next.name}이(가) 나타났다!`);
  },

  fetchQuests: async () => {
    set({ loading: true, error: null });

    try {
      const { id } = useUserStore.getState();
      if (!id) throw new Error("로그인이 필요합니다.");

      const response = await fetch(`/api/quest?characterId=${id}`);
      if (!response.ok) throw new Error("퀘스트 데이터를 불러오지 못했습니다.");

      const json = await response.json();

      if (!json.success || !Array.isArray(json.quests)) {
        throw new Error("퀘스트 데이터를 올바르게 받아오지 못했습니다.");
      }

      set({
        quests: json.quests,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "알 수 없는 오류 발생",
        loading: false,
      });
    }
  },

  completeQuest: async (questId) => {
    try {
      const { id: characterId } = useUserStore.getState();
      if (!characterId) throw new Error("로그인이 필요합니다.");

      const quest = get().quests.find((q) => q.id === questId);
      if (!quest) return;

      // 낙관적 UI 업데이트
      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId ? { ...q, completed: true } : q
        ),
      }));

      // API 요청
      const responsePromise = fetch("/api/quest/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ characterId, questId }),
      });

      // 데미지 계산
      const difficulty = quest.difficulty ?? "normal";
      const damage = QUEST_DAMAGE[difficulty] ?? QUEST_DAMAGE.normal;

      // 애니메이션 실행
      set({ isMoving: true, isMovingForward: true });

      setTimeout(() => {
        set({ isMoving: false, isAttacking: true });

        setTimeout(() => {
          // 공격 적중 시점: HP 감소
          set((state) => {
            const newHp = Math.max(state.monsterHp - damage, 0);
            return { monsterHp: newHp };
          });

          set({ isAttacking: false, isMoving: true, isMovingForward: false });

          setTimeout(() => {
            set({ isMoving: false, isMovingForward: true });

            // 애니메이션 끝 — HP 0이면 처치
            const { monsterHp } = get();
            if (monsterHp <= 0) {
              get().setDefeated(true);
            }
          }, 600);
        }, 1000);
      }, 600);

      // API 응답 확인
      const response = await responsePromise;
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.errorType === "WILLPOWER_DEPLETED") {
          throw new Error("WILLPOWER_DEPLETED");
        }
        throw new Error("퀘스트 완료 실패");
      }

      setTimeout(() => {
        toast.success(`${STATUS[quest.tagged]} 스탯이 +1 증가했습니다!`);
      }, 1600);

      await useUserStore.getState().fetchCharacter();
    } catch (err) {
      console.error("completeQuest 오류:", err);

      set({ isMoving: false, isAttacking: false, isMovingForward: true });

      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId ? { ...q, completed: false } : q
        ),
      }));

      if (err instanceof Error && err.message === "WILLPOWER_DEPLETED") {
        toast.error("의지력이 부족하여 퀘스트를 완료할 수 없습니다!");
      }
    }
  },

  deleteQuest: async (questId) => {
    try {
      const { id: characterId } = useUserStore.getState();
      if (!characterId) throw new Error("로그인이 필요합니다.");

      const response = await fetch(`/api/quest/${questId}?characterId=${characterId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "삭제 실패");
      }

      set((state) => ({
        quests: state.quests.filter((q) => q.id !== questId),
      }));
    } catch (err) {
      console.error("deleteQuest 오류:", err);
      toast.error(err instanceof Error ? err.message : "퀘스트 삭제 중 오류 발생");
    }
  },

  addQuest: async (quest: Omit<Quest, "id" | "characterId">) => {
    try {
      const { id } = useUserStore.getState();
      if (!id) throw new Error("로그인이 필요합니다.");

      const requestData = { ...quest, characterId: id };

      const response = await fetch("/api/quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error("퀘스트 추가 실패");

      await Promise.all([
        useQuestStore.getState().fetchQuests(),
        useUserStore.getState().fetchCharacter(),
      ]);
    } catch (err) {
      console.error("퀘스트 추가 실패:", err);
    }
  },

  updateQuest: async (questId: number, data: Partial<Quest>) => {
    try {
      const response = await fetch(`/api/quest/${questId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("퀘스트 수정 실패");

      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId ? { ...q, ...data } : q
        ),
      }));
    } catch (err) {
      console.error("퀘스트 수정 실패:", err);
    }
  },
}));
