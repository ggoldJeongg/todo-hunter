import { SubTask } from "@prisma/client";

export interface ISubTaskRepository {
  findById: (id: number) => Promise<SubTask | null>;
  findByQuestId: (questId: number) => Promise<SubTask[]>;
  countByQuestId: (questId: number) => Promise<number>;
  countCompletedByQuestId: (questId: number) => Promise<number>;
  createMany: (questId: number, names: string[], startOrder?: number) => Promise<SubTask[]>;
  markCompleted: (id: number, completedAt: Date) => Promise<SubTask>;
  resetByQuestId: (questId: number) => Promise<void>;
  deleteByQuestId: (questId: number) => Promise<void>;
}
