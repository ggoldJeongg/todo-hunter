import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserFromCookie: vi.fn(),
  findCharacter: vi.fn(),
  completeQuest: vi.fn(),
}));

vi.mock("@/utils/auth", () => ({
  getUserFromCookie: mocks.getUserFromCookie,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    character: {
      findFirst: mocks.findCharacter,
    },
  },
}));

vi.mock("@/application/usecases/quest/CompleteQuestUsecase", () => ({
  CompleteQuestUsecase: vi.fn().mockImplementation(function () {
    return {
      completeQuest: mocks.completeQuest,
    };
  }),
}));

vi.mock("@/infrastructure/repositories", () => ({
  PriQuestRepository: vi.fn(),
  PriSuccessDayRepository: vi.fn(),
  PriCharacterRepository: vi.fn(),
  PriStatusRepository: vi.fn(),
}));

function createCompleteRequest(body: unknown) {
  return new NextRequest("http://localhost/api/quest/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/quest/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserFromCookie.mockResolvedValue({ user: { id: 1, loginId: "hunter" } });
    mocks.findCharacter.mockResolvedValue({ id: 100, userId: 1 });
    mocks.completeQuest.mockResolvedValue(undefined);
  });

  it("uses the authenticated character id instead of a spoofable request characterId", async () => {
    const { POST } = await import("./route");

    const response = await POST(createCompleteRequest({
      questId: 1,
      characterId: 999,
    }));

    expect(response.status).toBe(200);
    expect(mocks.completeQuest).toHaveBeenCalledWith(100, 1);
  });
});
