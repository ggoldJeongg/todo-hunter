// 캐릭터 외형 데이터 전송 객체

export interface AppearanceDto {
  outfitId: string;
  hairId: string;
  hatId: string | null;
}

// PATCH 입력 — 부분 업데이트 지원
export interface UpdateAppearanceInput {
  outfitId?: string;
  hairId?: string;
  hatId?: string | null;
}
