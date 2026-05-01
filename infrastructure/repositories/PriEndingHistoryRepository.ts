import { EndingHistory, Prisma, PrismaClient } from "@prisma/client";
import { IEndingHistoryRepository } from "@/domain/repositories";

export class PriEndingHistoryRepository implements IEndingHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCharacterAndWeek(
    characterId: number,
    weekKey: string
  ): Promise<EndingHistory | null> {
    return this.prisma.endingHistory.findUnique({
      where: { characterId_weekKey: { characterId, weekKey } },
    });
  }

  async upsertIfAbsent(input: {
    characterId: number;
    weekKey: string;
    endingCode: string;
    completedCount: number;
    statsSnapshot: Prisma.InputJsonValue;
    awardedTitleId: number | null;
  }): Promise<EndingHistory> {
    // 확정 저장: 같은 (characterId, weekKey) 가 이미 있으면 update {} (덮어쓰지 않음)
    return this.prisma.endingHistory.upsert({
      where: {
        characterId_weekKey: {
          characterId: input.characterId,
          weekKey: input.weekKey,
        },
      },
      create: {
        characterId: input.characterId,
        weekKey: input.weekKey,
        endingCode: input.endingCode,
        completedCount: input.completedCount,
        statsSnapshot: input.statsSnapshot,
        awardedTitleId: input.awardedTitleId,
      },
      update: {}, // 이미 있으면 절대 덮어쓰지 않음 (확정 저장)
    });
  }

  async findAllByCharacter(characterId: number): Promise<EndingHistory[]> {
    return this.prisma.endingHistory.findMany({
      where: { characterId },
      orderBy: { resolvedAt: "desc" },
    });
  }

  async markChecked(id: number, checkedAt: Date): Promise<EndingHistory> {
    return this.prisma.endingHistory.update({
      where: { id },
      data: { checkedAt },
    });
  }
}
