import { describe, expect, it, vi } from "vitest";
import { deleteUserAccountData } from "@/utils/accountDeletion";

function createClientMock(characterIds: number[], questIds: number[]) {
  return {
    character: {
      findMany: vi.fn().mockResolvedValue(characterIds.map((id) => ({ id }))),
      deleteMany: vi.fn().mockResolvedValue({ count: characterIds.length }),
    },
    quest: {
      findMany: vi.fn().mockResolvedValue(questIds.map((id) => ({ id }))),
      deleteMany: vi.fn().mockResolvedValue({ count: questIds.length }),
    },
    successDay: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    subTask: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    status: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    userTitle: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    endingHistory: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    user: { delete: vi.fn().mockResolvedValue({ id: 1 }) },
  };
}

describe("deleteUserAccountData", () => {
  it("deletes dependent account data before deleting the user", async () => {
    const client = createClientMock([10], [100, 101]);

    await deleteUserAccountData(client as never, 1);

    expect(client.successDay.deleteMany).toHaveBeenCalledWith({ where: { questId: { in: [100, 101] } } });
    expect(client.subTask.deleteMany).toHaveBeenCalledWith({ where: { questId: { in: [100, 101] } } });
    expect(client.quest.deleteMany).toHaveBeenCalledWith({ where: { characterId: { in: [10] } } });
    expect(client.status.deleteMany).toHaveBeenCalledWith({ where: { characterId: { in: [10] } } });
    expect(client.userTitle.deleteMany).toHaveBeenCalledWith({ where: { characterId: { in: [10] } } });
    expect(client.endingHistory.deleteMany).toHaveBeenCalledWith({ where: { characterId: { in: [10] } } });
    expect(client.character.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [10] } } });
    expect(client.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("deletes the user even when no character exists", async () => {
    const client = createClientMock([], []);

    await deleteUserAccountData(client as never, 1);

    expect(client.quest.findMany).not.toHaveBeenCalled();
    expect(client.successDay.deleteMany).not.toHaveBeenCalled();
    expect(client.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
