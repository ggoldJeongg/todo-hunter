import { STATUS } from "@/constants";
import { toast } from "sonner";
import { create } from "zustand";
import { useUserStore } from "@/utils/stores/userStore";
import { getMonsterByKillCount, QUEST_DAMAGE } from "@/utils/pixi/MonsterRegistry";

export interface SubTask {
  id: number;
  name: string;
  order: number;
  completedAt: string | null;
}

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
  subTasks?: SubTask[]; // 서브태스크 목록 (없으면 단일 할일)
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
  completeSubTask: (questId: number, subTaskId: number) => Promise<void>;
  deleteQuest: (questId: number) => Promise<void>;
  addQuest: (quest: Omit<Quest, "id" | "subTasks"> & { subTasks?: string[] }) => Promise<void>;
  addSubTasks: (questId: number, names: string[]) => Promise<SubTask[] | null>;
  updateQuest: (questId: number, data: Partial<Quest>) => Promise<void>;
}

// 초기 몬스터
const initialMonster = getMonsterByKillCount(0);

// 단일 공격 시퀀스(전진 → 공격 → HP 감소 → 후퇴 → 처치 판정).
// 데일리/서브태스크 모두 동일하게 사용. damage 만큼 HP 감소.
type SetState = {
  (partial: Partial<QuestStore> | ((state: QuestStore) => Partial<QuestStore>)): void;
};

function runAttackAnimation(set: SetState, get: () => QuestStore, damage: number) {
  set({ isMoving: true, isMovingForward: true });

  setTimeout(() => {
    set({ isMoving: false, isAttacking: true });

    setTimeout(() => {
      // 공격 적중 시점: HP 감소
      set((state) => ({ monsterHp: Math.max(state.monsterHp - damage, 0) }));

      set({ isAttacking: false, isMoving: true, isMovingForward: false });

      setTimeout(() => {
        set({ isMoving: false, isMovingForward: true });

        const { monsterHp } = get();
        if (monsterHp <= 0) {
          get().setDefeated(true);
        }
      }, 600);
    }, 1000);
  }, 600);
}

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

      // 서브태스크가 있는 퀘스트는 직접 완료 불가 — 서브태스크를 하나씩 완료해야 함
      if (quest.subTasks && quest.subTasks.length > 0) {
        toast.error("서브태스크를 모두 완료해야 합니다.");
        return;
      }

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
      runAttackAnimation(set, get, damage);

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

  // 서브태스크 단일 완료. 마지막 서브태스크였으면 서버에서 자동으로 퀘스트 완료 처리(EXP/스탯/의지력)됨.
  completeSubTask: async (questId, subTaskId) => {
    try {
      const quest = get().quests.find((q) => q.id === questId);
      if (!quest || !quest.subTasks) return;

      const target = quest.subTasks.find((s) => s.id === subTaskId);
      if (!target || target.completedAt) return;

      // 낙관적 업데이트: 해당 서브태스크 completedAt 마킹
      const nowIso = new Date().toISOString();
      set((state) => ({
        quests: state.quests.map((q) => {
          if (q.id !== questId) return q;
          const updatedSubs =
            q.subTasks?.map((s) =>
              s.id === subTaskId ? { ...s, completedAt: nowIso } : s
            ) ?? [];
          // 모두 완료됐으면 quest.completed 도 true 로
          const allDone = updatedSubs.length > 0 && updatedSubs.every((s) => s.completedAt);
          return { ...q, subTasks: updatedSubs, completed: allDone ? true : q.completed };
        }),
      }));

      // API 호출 (응답 기다리며 동시에 애니메이션)
      const responsePromise = fetch("/api/quest/subtask/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subTaskId }),
      });

      // 데미지: GAME_SYSTEM 명세대로 서브태스크 1개당 기본 데미지 10
      runAttackAnimation(set, get, 10);

      const response = await responsePromise;
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.errorType === "WILLPOWER_DEPLETED") {
          throw new Error("WILLPOWER_DEPLETED");
        }
        throw new Error("서브태스크 완료 실패");
      }

      const json = await response.json();
      if (json.questCompleted) {
        setTimeout(() => {
          toast.success(`${STATUS[quest.tagged]} 스탯이 증가했습니다!`);
        }, 1600);
        await useUserStore.getState().fetchCharacter();
      }
    } catch (err) {
      console.error("completeSubTask 오류:", err);

      // 롤백
      set({ isMoving: false, isAttacking: false, isMovingForward: true });
      set((state) => ({
        quests: state.quests.map((q) => {
          if (q.id !== questId) return q;
          return {
            ...q,
            subTasks: q.subTasks?.map((s) =>
              s.id === subTaskId ? { ...s, completedAt: null } : s
            ),
            completed: false,
          };
        }),
      }));

      if (err instanceof Error && err.message === "WILLPOWER_DEPLETED") {
        toast.error("의지력이 부족하여 완료할 수 없습니다!");
      } else {
        toast.error("서브태스크 완료 실패");
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

  addQuest: async (quest) => {
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

  // 이미 등록된 퀘스트에 서브태스크 N개 추가. 성공 시 해당 quest.subTasks 끝에 이어붙임.
  addSubTasks: async (questId, names) => {
    try {
      const response = await fetch(`/api/quest/${questId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ names }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "서브태스크 추가 실패");
      }

      const json = await response.json();
      const created: SubTask[] = (json.subTasks ?? []).map((s: SubTask) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        completedAt: s.completedAt,
      }));

      set((state) => ({
        quests: state.quests.map((q) =>
          q.id === questId
            ? {
                ...q,
                subTasks: [...(q.subTasks ?? []), ...created],
                // 서브태스크가 새로 생기면 quest 의 main 체크는 다시 비활성 → completed 도 false 로
                completed: false,
              }
            : q
        ),
      }));

      toast.success(`서브태스크 ${created.length}개 추가됨`);
      return created;
    } catch (err) {
      console.error("addSubTasks 오류:", err);
      toast.error(err instanceof Error ? err.message : "서브태스크 추가 실패");
      return null;
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
