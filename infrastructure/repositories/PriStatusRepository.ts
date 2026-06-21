import { Status } from "@prisma/client";
import { IStatusRepository } from "@/domain/repositories";
import { PrismaRepositoryClient } from "./prisma-client";

export class PriStatusRepository implements IStatusRepository {
  constructor(private readonly prisma: PrismaRepositoryClient) {} // 의존성 주입

  async create(characterId: number): Promise<Status> {
    return await this.prisma.status.create({
      data: {
        characterId: characterId,
        str: 0,
        int: 0,
        emo: 0,
        fin: 0,
        liv: 0,
      },
    });
  }

  async findById(id: number): Promise<Status | null> {
    return await this.prisma.status.findUnique({
      where: {
        id: id,
      },
    });
  }

  async findByCharacterId(characterId: number): Promise<Status | null> {
    return await this.prisma.status.findUnique({
      where: {
        characterId: characterId,
      },
    });
  }

  async update(status: Status): Promise<Status> {
    return await this.prisma.status.update({
      where: {
        id: status.id,
        characterId: status.characterId,
      },
      data: {
        str: status.str,
        int: status.int,
        emo: status.emo,
        fin: status.fin,
        liv: status.liv,
      },
    });
  }
}
