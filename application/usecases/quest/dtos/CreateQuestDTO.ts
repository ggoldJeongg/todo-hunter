import { STATUS } from "@/constants";

export interface CreateQuestDTO {
    characterId: number; // 어떤 캐릭터의 퀘스트인지
    name: string;        // 할일 제목
    tagged: keyof typeof STATUS;    // 스탯 태그 (예: STR)
    isWeekly: boolean;   // 반복 여부
    difficulty?: string; // 난이도 (easy, normal, hard)
    expiredAt?: Date;    // 만료일
    days?: string[];     // 주간 퀘스트의 반복 요일 (예: ["월", "수", "금"])
    subTasks?: string[]; // 서브태스크 이름 목록(생성 시 함께 등록). 없거나 빈 배열이면 단일 할일로 처리.
  }