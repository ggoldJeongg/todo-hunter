import { Character } from "@prisma/client";

export interface ICharacterRepository {
    findById: (id: number) => Promise<Character | null>;
    findByUserId: (userId: number) => Promise<Character | null>;
    addEndingCount: (id: number) => Promise<number>;
    create: (userId: number, endingState: number) => Promise<Character>;
    updateCharacterStats: (id: number, data: { level?: number; exp?: number; willpower?: number; maxWillpower?: number }) => Promise<Character>;
    resetAllWillpower: () => Promise<void>;
    updateForSunday: () => Promise<void>;
    updateForMonday: () => Promise<void>;
}