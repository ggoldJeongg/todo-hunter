import { SuccessDay } from "@prisma/client"; 

export interface ISuccessDayRepository {
    findById(id: number): Promise<SuccessDay | null>;
    findByQuestId(questId: number): Promise<SuccessDay[]>;
    findByQuestIdSince(questId: number, since: Date): Promise<SuccessDay[]>;
    findByQuestIdsSince(questIds: number[], since: Date): Promise<SuccessDay[]>;
    findCurrentQuests(currentQuestIds: number[], currentDay: Date): Promise<SuccessDay[] | null>;
    createForCycle(questId: number, cycleKey: string): Promise<SuccessDay | null>;
    update(id: number, data: Partial<SuccessDay>): Promise<SuccessDay | null>;
    findCompletedQuests: (questIds: number[], date: Date) => Promise<SuccessDay[]>; 
    // delete(id: number): Promise<void>;
  }
  
