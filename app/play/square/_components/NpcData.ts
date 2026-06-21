export interface SquareUser {
  id: string | number;
  nickname: string;
  level: number;
  focusSeconds: number;
  isRunning: boolean;
  sharedQuest: { name: string; tagged: string } | null;
  isNpc: boolean;
  // 클릭형 NPC — 타이머/공유퀘스트 UI 숨김 + 클릭 핸들러 활성화
  interactive?: boolean;
  // 클릭 시 열 모달 종류 (interactive NPC 전용)
  action?: "rest" | "roulette";
  // 커스텀 이미지(gif/png) — 지정 시 스프라이트 canvas 대신 이 이미지로 렌더링
  imageSrc?: string;
  // 아바타 픽셀 크기 오버라이드 (없으면 기본값 사용)
  avatarSize?: number;
  // 좌우반전 — 이미지/스프라이트를 수평으로 뒤집음
  flip?: boolean;
  // 위치 픽셀 오프셋 (음수 = 왼쪽/위쪽)
  offsetX?: number;
  offsetY?: number;
}

// NPC mock 데이터 (나중에 실제 유저 API 응답으로 교체)
export const NPC_USERS: SquareUser[] = [
  {
    id: "npc-1",
    nickname: "할일돌림판",
    level: 5,
    focusSeconds: 0,
    isRunning: false,
    sharedQuest: null,
    isNpc: true,
    interactive: true,
    action: "roulette",
    imageSrc: "/images/characters/npcs/todo_wheel.png",
    avatarSize: 125,
  },
  {
    id: "npc-2",
    nickname: "의문의 마법사",
    level: 8,
    focusSeconds: 0,
    isRunning: false,
    sharedQuest: null,
    isNpc: true,
    interactive: true,
    action: "rest",
    imageSrc: "/images/characters/npcs/witch_idle_on_a_broom-Sheet.png",
  },
  {
    id: "npc-3",
    nickname: "나나",
    level: 3,
    focusSeconds: 1800,
    isRunning: true,
    sharedQuest: { name: "운동 30분", tagged: "STR" },
    isNpc: true,
    imageSrc: "/images/characters/npcs/girl2_butterfly-Sheet.png",
    flip: true,
    offsetX: -5,
  },
  {
    id: "npc-4",
    nickname: "뭉뭉이",
    level: 12,
    focusSeconds: 14400,
    isRunning: false,
    sharedQuest: null,
    isNpc: true,
    imageSrc: "/images/characters/npcs/dog_tail-Sheet.png",
  },
];
