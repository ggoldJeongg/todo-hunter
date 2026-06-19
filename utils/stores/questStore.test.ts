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
});
