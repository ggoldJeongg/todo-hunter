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

export type Direction = "up" | "down" | "left" | "right";

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
  facing: Direction;
  moveTo: (x: number, y: number) => void;
  setFacing: (dir: Direction) => void;
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
      facing: "down",

      moveTo: (x: number, y: number) => {
        const cur = get().position;
        const dx = x - cur.x;
        const dy = y - cur.y;
        // 더 큰 축으로 방향 결정
        let dir: Direction;
        if (Math.abs(dx) > Math.abs(dy)) {
          dir = dx > 0 ? "right" : "left";
        } else {
          dir = dy > 0 ? "down" : "up";
        }
        set({ targetPosition: { x, y }, isWalking: true, facing: dir });
      },

      setFacing: (dir) => set({ facing: dir }),

      arriveAtTarget: () => {
        const { targetPosition } = get();
        if (targetPosition) {
          set({ position: targetPosition, targetPosition: null, isWalking: false });
        }
      },
    }),
    {
      name: "square-session-data",
      // 저장 대상: 타이머 + 공유 퀘스트만. 캐릭터 위치/이동 상태는 저장하지 않는다.
      // (위치까지 persist하면 설정한 초기 위치 {50,70}을 덮어쓰고,
      //  옛 좌표가 흰 길 밖이면 이동 불가로 갇힘 → 매 세션 초기 위치에서 시작)
      partialize: (state) => ({
        isRunning: state.isRunning,
        startedAt: state.startedAt,
        elapsed: state.elapsed,
        sharedQuest: state.sharedQuest,
      }),
      // localStorage 사용 — 앱 종료/재실행 후에도 타이머 유지
      // (Date.now() - startedAt 기반이라 백그라운드/앱종료 시간도 자동 반영)
      storage: {
        getItem: async (name) => {
          if (typeof window === "undefined") return null;
          const item = window.localStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: async (name, value) => {
          if (typeof window === "undefined") return;
          window.localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          if (typeof window === "undefined") return;
          window.localStorage.removeItem(name);
        },
      },
    }
  )
);
