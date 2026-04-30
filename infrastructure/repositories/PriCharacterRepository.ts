import { ICharacterRepository } from "@/domain/repositories";
import { Character, PrismaClient } from "@prisma/client";

export class PriCharacterRepository implements ICharacterRepository {

  constructor(private readonly prisma: PrismaClient) {} // 의존성 주입 방식

  async findById(id: number):Promise<Character | null> {
    return await this.prisma.character.findUnique({
      where: {
        id,
      },
    });
  }

  async findByUserId(userId: number): Promise<Character | null> {
    return await this.prisma.character.findFirst({
      where: {
        userId,
      },
    })
  };

  async addEndingCount(id: number): Promise<number> {
    const updatedCharacter = await this.prisma.character.update({
      where: { id },
      data: {
        endingCount: {
          increment: 1,
        },
      },
    });
    return updatedCharacter.endingCount;
  }

  async create(userId: number, endingState: number): Promise<Character> {
    return await this.prisma.character.create({
      data: {
        userId,
        endingCount: 0,
        endingState,
      },
    });
  }

  async updateCharacterStats(
    id: number,
    data: { level?: number; exp?: number; willpower?: number; maxWillpower?: number }
  ): Promise<Character> {
    return await this.prisma.character.update({
      where: { id },
      data,
    });
  }

  async updateAppearance(
    id: number,
    data: { outfitId?: string; hairId?: string; hatId?: string | null }
  ): Promise<Character> {
    return await this.prisma.character.update({
      where: { id },
      data,
    });
  }

  async updateEndingMeta(
    id: number,
    data: { endingState?: number; endingCode?: string | null }
  ): Promise<Character> {
    return await this.prisma.character.update({
      where: { id },
      data,
    });
  }

  async findAllIds(): Promise<number[]> {
    const rows = await this.prisma.character.findMany({
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

}