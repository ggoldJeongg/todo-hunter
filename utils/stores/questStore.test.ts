import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuestStore } from "@/utils/stores/questStore";
import { useUserStore } from "@/utils/stores/userStore";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const questInput = {
  name: "테스트 퀘스트",
  tagged: "STR" as const,
  isWeekly: false,
  difficulty: "normal",
  expiredAt: null,
  days: [],
  completed: false,
  characterId: 0,
};

describe("questStore save failure handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const storage = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      }),
      key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
      get length() {
        return storage.size;
      },
    });
    useUserStore.setState({ id: 1 });
    useQuestStore.setState({
      quests: [],
      loading: false,
      error: null,
      isMoving: false,
      isMovingForward: false,
      isAttacking: false,
      isDefeated: false,
      killCount: 0,
      monsterHp: 30,
      monsterMaxHp: 30,
    });
  });

  it("throws the server message when quest creation fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ success: false, error: "저장 실패" }, 500)
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(useQuestStore.getState().addQuest(questInput)).rejects.toThrow("저장 실패");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("separates successful creation from a failed quest list refresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, quest: { id: 1 } }, 201))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: "목록 실패" }, 500));
    vi.stubGlobal("fetch", fetchMock);

    await expect(useQuestStore.getState().addQuest(questInput)).rejects.toThrow(
      "퀘스트는 생성됐지만 목록을 다시 불러오지 못했습니다."
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws a clear message when updating a missing quest", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ success: false, error: "퀘스트를 찾을 수 없습니다." }, 404)
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(useQuestStore.getState().updateQuest(999, { name: "수정" })).rejects.toThrow(
      "퀘스트를 찾을 수 없습니다."
    );
  });

  it("keeps the local quest input when quest update fails with 500", async () => {
    const originalQuest = {
      id: 1,
      ...questInput,
      name: "original quest",
    };
    useQuestStore.setState({ quests: [originalQuest] });
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ success: false, error: "update failed" }, 500)
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(useQuestStore.getState().updateQuest(1, { name: "edited quest" })).rejects.toThrow(
      "update failed"
    );

    expect(useQuestStore.getState().quests).toEqual([originalQuest]);
  });

  it("rolls back optimistic completion when quest completion API fails", async () => {
    const originalQuest = {
      id: 1,
      ...questInput,
      completed: false,
    };
    useQuestStore.setState({ quests: [originalQuest] });
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ success: false, error: "complete failed" }, 500)
    );
    vi.stubGlobal("fetch", fetchMock);

    await useQuestStore.getState().completeQuest(1);

    expect(useQuestStore.getState().quests[0].completed).toBe(false);
  });

  it("keeps a quest in the list when delete API fails", async () => {
    const originalQuest = {
      id: 1,
      ...questInput,
      name: "keep quest",
    };
    useQuestStore.setState({ quests: [originalQuest] });
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ success: false, error: "delete failed" }, 500)
    );
    vi.stubGlobal("fetch", fetchMock);

    await useQuestStore.getState().deleteQuest(1);

    expect(useQuestStore.getState().quests).toEqual([originalQuest]);
  });
});
