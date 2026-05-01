import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserStore {
  id: number | null;
  loginId: string | null;
  nickname?: string;
  progress?: number;
  str?: number;
  int?: number;
  emo?: number;
  fin?: number;
  liv?: number;
  endingCount?: number;
  endingState?: number;
  level?: number;
  exp?: number;
  willpower?: number;
  maxWillpower?: number;
  // 외형 (constants/appearance.ts 의 ID)
  outfitId?: string;
  hairId?: string;
  hatId?: string | null;
  setId: (id: number) => void;
  setLoginId: (loginId: string) => void;
  clearUser: () => void;
  fetchUser: () => Promise<void>;
  fetchCharacter: () => Promise<void>;
  fetchEndingState: () => Promise<void>;
  fetchAppearance: () => Promise<void>;
  updateAppearance: (input: {
    outfitId?: string;
    hairId?: string;
    hatId?: string | null;
  }) => Promise<void>;
}

// Zustand + persist 적용
export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      id: null,
      loginId: null,
      nickname: undefined,
      progress: undefined,
      str: undefined,
      int: undefined,
      emo: undefined,
      fin: undefined,
      liv: undefined,
      endingCount: undefined,
      endingState: undefined,
      level: undefined,
      exp: undefined,
      willpower: undefined,
      maxWillpower: undefined,
      outfitId: undefined,
      hairId: undefined,
      hatId: undefined,
      setId: (id: number) => set({ id }),
      setLoginId: (loginId: string) => set({ loginId }),
      clearUser: () => {
        set({
          id: null,
          loginId: null,
          nickname: undefined,
          progress: undefined,
          str: undefined,
          int: undefined,
          emo: undefined,
          fin: undefined,
          liv: undefined,
          endingCount: undefined,
          endingState: undefined,
          level: undefined,
          exp: undefined,
          willpower: undefined,
          maxWillpower: undefined,
          outfitId: undefined,
          hairId: undefined,
          hatId: undefined,
        });
        sessionStorage.removeItem("user-session-data"); // 세션 초기화
      },
      fetchUser: async () => {
        if (get().id) return; // 이미 상태가 있으면 fetchUser 실행 안 함

        try {
          const res = await fetch("/api/auth/signin-info", { credentials: "include" });
          if (!res.ok) throw new Error("API 호출 실패");
          const data = await res.json();

          set({ id: data.user?.id, loginId: data.user?.loginId });

          if (data.user?.id) {
            await get().fetchCharacter();
            await get().fetchEndingState();
            await get().fetchAppearance();
          }
        } catch (error) {
          console.error("사용자 정보를 가져오는 중 오류 발생:", error);
        }
      },
      fetchCharacter: async () => {
        if (!get().id) throw new Error("사용자 id가 존재하지 않습니다.");
        try {
          const res = await fetch("/api/character", { credentials: "include" });
          if (!res.ok) throw new Error("캐릭터 데이터 호출 실패");
          const data = await res.json();
          set({
            nickname: data.nickname,
            progress: data.progress,
            str: data.str,
            int: data.int,
            emo: data.emo,
            fin: data.fin,
            liv: data.liv,
            endingCount: data.endingCount,
            level: data.level,
            exp: data.exp,
            willpower: data.willpower,
            maxWillpower: data.maxWillpower,
          });
        } catch (error) {
          console.error("캐릭터 데이터를 가져오는 중 오류 발생:", error);
        }
      },
      fetchEndingState: async () => {
        if (!get().id) return;

        try {
          const res = await fetch("/api/ending", { credentials: "include" });
          if (!res.ok) throw new Error("엔딩 정보 요청 실패");
          const data = await res.json();
          set({ endingState: data.endingState });
        } catch (error) {
          console.error("엔딩 정보를 가져오는 중 오류 발생:", error);
        }
      },
      fetchAppearance: async () => {
        if (!get().id) return;

        try {
          const res = await fetch("/api/character/appearance", {
            credentials: "include",
          });
          if (!res.ok) throw new Error("외형 정보 요청 실패");
          const data = await res.json();
          set({
            outfitId: data.outfitId,
            hairId: data.hairId,
            hatId: data.hatId,
          });
        } catch (error) {
          console.error("외형 정보를 가져오는 중 오류 발생:", error);
        }
      },
      updateAppearance: async (input) => {
        if (!get().id) throw new Error("로그인이 필요합니다.");

        // 낙관적 업데이트 (즉시 반영) — 실패 시 이전 값으로 롤백
        const prev = {
          outfitId: get().outfitId,
          hairId: get().hairId,
          hatId: get().hatId,
        };
        set({
          ...(input.outfitId !== undefined && { outfitId: input.outfitId }),
          ...(input.hairId !== undefined && { hairId: input.hairId }),
          ...(input.hatId !== undefined && { hatId: input.hatId }),
        });

        try {
          const res = await fetch("/api/character/appearance", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(input),
          });
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error ?? "외형 변경 실패");
          }
          const data = await res.json();
          // 서버 응답 기준으로 최종 동기화
          set({
            outfitId: data.outfitId,
            hairId: data.hairId,
            hatId: data.hatId,
          });
        } catch (error) {
          // 롤백
          set(prev);
          throw error;
        }
      },
    }),
    {
      name: "user-session-data", // 저장할 키 이름
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
      }, // sessionStorage 사용 (페이지 닫히면 초기화)
    }
  )
);

// 클라이언트 사이드일 때만 fetchUser() 실행
if (typeof window !== "undefined") {
  useUserStore.getState().fetchUser();
}
