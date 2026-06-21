import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserFromCookie: vi.fn(),
  findCharacter: vi.fn(),
  findQuest: vi.fn(),
  updateQuest: vi.fn(),
  deleteQuest: vi.fn(),
}));

vi.mock("@/utils/auth", () => ({
  getUserFromCookie: mocks.getUserFromCookie,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    character: {
      findFirst: mocks.findCharacter,
    },
    quest: {
      findUnique: mocks.findQuest,
      update: mocks.updateQuest,
    },
  },
}));

vi.mock("@/application/usecases/quest/DeleteQuestUsecase", () => ({
  DeleteQuestUseCase: vi.fn().mockImplementation(function () {
    return {
      deleteQuest: mocks.deleteQuest,
    };
  }),
}));

vi.mock("@/infrastructure/repositories", () => ({
  PriQuestRepository: vi.fn(),
  PriSuccessDayRepository: vi.fn(),
}));

function createRequest(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/quest/1", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("/api/quest/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserFromCookie.mockResolvedValue({ user: { id: 1, loginId: "hunter" } });
    mocks.findCharacter.mockResolvedValue({ id: 100, userId: 1 });
    mocks.updateQuest.mockResolvedValue({ id: 1, name: "updated" });
    mocks.deleteQuest.mockResolvedValue(undefined);
  });

  it("blocks updating another character's quest", async () => {
    const { PUT } = await import("./route");
    mocks.findQuest.mockResolvedValue({ id: 1, characterId: 999 });

    const response = await PUT(createRequest("PUT", { name: "updated" }), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.updateQuest).not.toHaveBeenCalled();
  });

  it("passes the authenticated character id to quest deletion", async () => {
    const { DELETE } = await import("./route");

    const response = await DELETE(createRequest("DELETE"), {
      params: Promise.resolve({ id: "1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.deleteQuest).toHaveBeenCalledWith({ id: 1, characterId: 100 });
  });
});
