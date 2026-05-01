import { STATUS } from "@/constants";

export interface SubTaskDTO {
  id: number;
  name: string;
  order: number;
  completedAt: Date | null;
}

//할일 조회, 응답 DTO
export interface GetQuestDTO {
    id?: number;           // 퀘스트 ID
    characterId: number;  // 퀘스트를 소유한 캐릭터
    name: string;         // 퀘스트 제목
    tagged: keyof typeof STATUS;  // 태그
    isWeekly: boolean;
    difficulty?: string;
    expiredAt?: Date;
    createdAt: Date;
    completedDates?: Date[];
    days?: string[];
    subTasks?: SubTaskDTO[]; // 서브태스크 목록 (없으면 단일 할일)
  }