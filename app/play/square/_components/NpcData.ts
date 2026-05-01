export interface SquareUser {
  id: string | number;
  nickname: string;
  level: number;
  focusSeconds: number;
  isRunning: boolean;
  sharedQuest: { name: string; tagged: string } | null;
  isNpc: boolean;
  // 옷 레이어 경로 (미지정 시 기본 옷 사용)
  outfitSrc?: string;
  // 머리 레이어 경로 (미지정 시 기본 머리 사용)
  hairSrc?: string;
  // 모자 레이어 경로 (미지정 시 모자 없음)
  hatSrc?: string;
  // 클릭형 NPC — 타이머/공유퀘스트 UI 숨김 + 클릭 핸들러 활성화
  interactive?: boolean;
}

// NPC mock 데이터 (나중에 실제 유저 API 응답으로 교체)
export const NPC_USERS: SquareUser[] = [
  {
    id: "npc-1",
    nickname: "용사 길동",
    level: 5,
    focusSeconds: 3720,
    isRunning: true,
    sharedQuest: { name: "알고리즘 문제 풀기", tagged: "INT" },
    isNpc: true,
  },
  {
    id: "npc-2",
    nickname: "의문의 마법사",
    level: 8,
    focusSeconds: 0,
    isRunning: false,
    sharedQuest: null,
    isNpc: true,
    outfitSrc:
      "/images/asprites/char_a_p1/1out/char_a_p1_1out_pfpn_v03.png",
    hairSrc: "/images/asprites/char_a_p1/4har/char_a_p1_4har_dap1_v13.png",
    interactive: true,
  },
  {
    id: "npc-3",
    nickname: "전사 민호",
    level: 3,
    focusSeconds: 1800,
    isRunning: true,
    sharedQuest: { name: "운동 30분", tagged: "STR" },
    isNpc: true,
    outfitSrc:
      "/images/asprites/char_a_p1/1out/char_a_p1_1out_fstr_v05.png",
  },
  {
    id: "npc-4",
    nickname: "도적 하늘",
    level: 12,
    focusSeconds: 14400,
    isRunning: false,
    sharedQuest: null,
    isNpc: true,
    outfitSrc:
      "/images/asprites/char_a_p1/1out/char_a_p1_1out_pfpn_v02.png",
  },
];
