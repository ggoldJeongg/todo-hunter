// 칭호 아이콘 = /play/title 과 동일한 칭호 이미지로 매칭
// TITLE_IMAGES(ID → 이미지 경로)를 공유하여 두 화면의 아이콘이 항상 일치하도록 한다.
import { TITLE_IMAGES, TITLE_FALLBACK_IMAGE } from "./title";

/**
 * 칭호 ID → 칭호 이미지 경로
 * 1) titleId 가 TITLE_IMAGES 에 있으면 해당 이미지
 * 2) 없으면 기본(자물쇠/블러) 칭호 이미지
 */
export function getTitleIcon(titleId?: number | null): string {
  if (titleId != null && TITLE_IMAGES[titleId]) return TITLE_IMAGES[titleId];
  return TITLE_FALLBACK_IMAGE;
}
