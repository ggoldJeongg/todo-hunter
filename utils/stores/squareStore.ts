import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SharedQuest {
  id: number;
  name: string;
  tagged: "STR" | "INT" | "EMO" | "FIN" | "LIV";
}

interface Position {
  x: number; // % (0~100)
  y: number; // % (0~100)
}

interface SquareStore {
  // 집중시간 스톱워치
  isRunning: boolean;
  startedAt: number | null; // Date.now() when started
  elapsed: number; // 누적 시간 (ms)

  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  getElapsed: () => number;

  // 공유 퀘스트
  sharedQuest: SharedQuest | null;
  setSharedQuest: (quest: SharedQuest | null) => void;

  // 캐릭터 위치 & 이동
  position: Position;
  targetPosition: Position | null;
  isWalking: boolean;
  moveTo: (x: number, y: number) => void;
  arriveAtTarget: () => void;
}

export const useSquareStore = create<SquareStore>()(
  persist(
    (set, get) => ({
      isRunning: false,
      startedAt: null,
      elapsed: 0,

      startTimer: () => {
        set({ isRunning: true, startedAt: Date.now() });
      },

      stopTimer: () => {
        const { startedAt, elapsed } = get();
        if (startedAt) {
          set({
            isRunning: false,
            elapsed: elapsed + (Date.now() - startedAt),
            startedAt: null,
          });
        }
      },

      resetTimer: () => {
        set({ isRunning: false, startedAt: null, elapsed: 0 });
      },

      getElapsed: () => {
        const { isRunning, startedAt, elapsed } = get();
        if (isRunning && startedAt) {
          return elapsed + (Date.now() - startedAt);
        }
        return elapsed;
      },

      sharedQuest: null,
      setSharedQuest: (quest) => set({ sharedQuest: quest }),

      // 캐릭터 위치 (% 기준, 초기: 중앙 하단)
      position: { x: 50, y: 70 },
      targetPosition: null,
      isWalking: false,

      moveTo: (x: number, y: number) => {
        set({ targetPosition: { x, y }, isWalking: true });
      },

      arriveAtTarget: () => {
        const { targetPosition } = get();
        if (targetPosition) {
          set({ position: targetPosition, targetPosition: null, isWalking: false });
        }
      },
    }),
    {
      name: "square-session-data",
      storage: {
        getItem: async (name) => {
          const item = sessionStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: async (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          sessionStorage.removeItem(name);
        },
      },
    }
  )
);
