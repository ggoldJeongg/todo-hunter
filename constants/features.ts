/**
 * 피처 플래그
 *
 * 미완성 또는 점진 배포 중인 기능을 제어합니다.
 * MVP 출시 기준 모든 플래그는 기본 OFF이며, 준비된 기능부터
 * 이 파일의 값을 true로 바꿔 배포합니다.
 *
 * 사용 예:
 *   import { FEATURES } from "@/constants/features";
 *   if (FEATURES.CHAT) { ... }
 */
export const FEATURES = {
  /** 광장 — 월드맵 + NPC 아바타 페이지 진입 (메뉴 활성화) */
  PLAZA: false,
  /** 광장 내 실시간 채팅 */
  CHAT: false,
  /** 광장 내 공유 퀘스트 (다른 플레이어에게 퀘스트 공유) */
  SHARED_QUEST: false,
  /** 전투 중 몬스터의 반격 (플레이어 HP 감소 로직) */
  MONSTER_COUNTER_ATTACK: false,
} as const;

export type FeatureFlag = keyof typeof FEATURES;

export const isEnabled = (flag: FeatureFlag): boolean => FEATURES[flag];
