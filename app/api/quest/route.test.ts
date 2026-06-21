import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserFromCookie: vi.fn(),
  findCharacter: vi.fn(),
  createQuest: vi.fn(),
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

vi.mock("@/application/usecases/quest/CreateQuestUsecase", () => ({
  CreateQuestUseCase: vi.fn().mockImplementation(function () {
    return {
      createQuest: mocks.createQuest,
    };
  }),
}));

vi.mock("@/infrastructure/repositories", () => ({
  PriQuestRepository: vi.fn(),
  PriStatusRepository: vi.fn(),
  PriSubTaskRepository: vi.fn(),
}));

const validQuestBody = {
  name: "daily quest",
  tagged: "STR",
  isWeekly: false,
  difficulty: "normal",
  expiredAt: null,
  days: [],
};

function createPostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/quest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/quest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserFromCookie.mockResolvedValue({ user: { id: 1, loginId: "hunter" } });
    mocks.findCharacter.mockResolvedValue({ id: 100, userId: 1 });
    mocks.createQuest.mockImplementation(async (dto) => ({ id: 1, ...dto }));
  });

  it("uses the authenticated user's character instead of a spoofable request characterId", async () => {
    const { POST } = await import("./route");

    const response = await POST(createPostRequest({
      ...validQuestBody,
      characterId: 999,
    }));

    expect(response.status).toBe(201);
    expect(mocks.createQuest).toHaveBeenCalledWith(
      expect.objectContaining({
        characterId: 100,
        name: "daily quest",
      })
    );
  });

  it("rejects invalid quest input before creating a quest", async () => {
    const { POST } = await import("./route");

    const response = await POST(createPostRequest({
      ...validQuestBody,
      tagged: "BAD",
    }));

    expect(response.status).toBe(400);
    expect(mocks.createQuest).not.toHaveBeenCalled();
  });
});
