import { PrismaClient, SubTask } from "@prisma/client";
import { ISubTaskRepository } from "@/domain/repositories/ISubTaskRepository";

export class PriSubTaskRepository implements ISubTaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<SubTask | null> {
    return await this.prisma.subTask.findUnique({ where: { id } });
  }

  async findByQuestId(questId: number): Promise<SubTask[]> {
    return await this.prisma.subTask.findMany({
      where: { questId },
      orderBy: [{ order: "asc" }, { id: "asc" }],
    });
  }

  async countByQuestId(questId: number): Promise<number> {
    return await this.prisma.subTask.count({ where: { questId } });
  }

  async countCompletedByQuestId(questId: number): Promise<number> {
    return await this.prisma.subTask.count({
      where: { questId, completedAt: { not: null } },
    });
  }

  async createMany(
    questId: number,
    names: string[],
    startOrder: number = 0
  ): Promise<SubTask[]> {
    if (names.length === 0) return [];

    // createMany 는 created rows 를 반환하지 않으므로 트랜잭션으로 생성 후 신규분만 재조회
    return await this.prisma.$transaction(async (tx) => {
      await tx.subTask.createMany({
        data: names.map((name, idx) => ({
          questId,
          name: name.trim(),
          order: startOrder + idx,
        })),
      });
      // 방금 추가한 N개만 id desc 로 가져온 뒤 다시 asc 정렬해 반환
      const created = await tx.subTask.findMany({
        where: { questId },
        orderBy: { id: "desc" },
        take: names.length,
      });
      return created.reverse();
    });
  }

  async markCompleted(id: number, completedAt: Date): Promise<SubTask> {
    return await this.prisma.subTask.update({
      where: { id },
      data: { completedAt },
    });
  }

  // 주간 퀘스트의 새 사이클(다음 주) 시작 시 호출 — 모든 서브태스크 미완료로 리셋
  async resetByQuestId(questId: number): Promise<void> {
    await this.prisma.subTask.updateMany({
      where: { questId },
      data: { completedAt: null },
    });
  }

  async deleteByQuestId(questId: number): Promise<void> {
    await this.prisma.subTask.deleteMany({ where: { questId } });
  }
}
