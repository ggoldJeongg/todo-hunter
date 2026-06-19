import type { Prisma } from "@prisma/client";

type AccountDeletionClient = Prisma.TransactionClient;

export async function deleteUserAccountData(client: AccountDeletionClient, userId: number) {
  const characters = await client.character.findMany({
    where: { userId },
    select: { id: true },
  });
  const characterIds = characters.map((character) => character.id);

  if (characterIds.length > 0) {
    const quests = await client.quest.findMany({
      where: { characterId: { in: characterIds } },
      select: { id: true },
    });
    const questIds = quests.map((quest) => quest.id);

    if (questIds.length > 0) {
      await client.successDay.deleteMany({ where: { questId: { in: questIds } } });
      await client.subTask.deleteMany({ where: { questId: { in: questIds } } });
    }

    await client.quest.deleteMany({ where: { characterId: { in: characterIds } } });
    await client.status.deleteMany({ where: { characterId: { in: characterIds } } });
    await client.userTitle.deleteMany({ where: { characterId: { in: characterIds } } });
    await client.endingHistory.deleteMany({ where: { characterId: { in: characterIds } } });
    await client.character.deleteMany({ where: { id: { in: characterIds } } });
  }

  await client.user.delete({ where: { id: userId } });
}
