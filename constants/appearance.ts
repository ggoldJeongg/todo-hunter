// 캐릭터 외형 옵션 매니페스트
// 각 옵션은 정적 ID로 식별되고 Character DB에 String으로 저장됨
// 새 에셋 추가 시 여기에 한 줄 추가하면 끝 (코드 수정 거의 없음)

export type AppearanceCategory = "outfit" | "hair" | "hat";

export interface AppearanceOption {
  id: string;
  name: string;
  src: string;
  category: AppearanceCategory;
  // 전투 씬(pONE1) 호환 여부 — false면 전투 화면에서 기본 옷/모자로 fallback
  // (pONE1 시트에 해당 파일이 존재하지 않는 경우 false 표기)
  battleCompatible?: boolean;
}

const BASE = "/images/asprites/char_a_p1";

// ==================== 옷 (17개) ====================
export const OUTFITS: AppearanceOption[] = [
  { id: "fstr_v01", name: "모험가복 (분홍)", src: `${BASE}/1out/char_a_p1_1out_fstr_v01.png`, category: "outfit" },
  { id: "fstr_v02", name: "모험가복 (초록)", src: `${BASE}/1out/char_a_p1_1out_fstr_v02.png`, category: "outfit" },
  { id: "fstr_v03", name: "모험가복 (파랑)", src: `${BASE}/1out/char_a_p1_1out_fstr_v03.png`, category: "outfit" },
  { id: "fstr_v04", name: "모험가복 (보라)", src: `${BASE}/1out/char_a_p1_1out_fstr_v04.png`, category: "outfit" },
  { id: "fstr_v05", name: "모험가복 (노랑)", src: `${BASE}/1out/char_a_p1_1out_fstr_v05.png`, category: "outfit" },
  { id: "pfpn_v01", name: "정장 (검정)", src: `${BASE}/1out/char_a_p1_1out_pfpn_v01.png`, category: "outfit" },
  { id: "pfpn_v02", name: "정장 (회색)", src: `${BASE}/1out/char_a_p1_1out_pfpn_v02.png`, category: "outfit" },
  { id: "pfpn_v03", name: "마법사 로브", src: `${BASE}/1out/char_a_p1_1out_pfpn_v03.png`, category: "outfit" },
  { id: "pfpn_v04", name: "정장 (파랑)", src: `${BASE}/1out/char_a_p1_1out_pfpn_v04.png`, category: "outfit" },
  { id: "pfpn_v05", name: "정장 (빨강)", src: `${BASE}/1out/char_a_p1_1out_pfpn_v05.png`, category: "outfit" },
  { id: "pfdr_v01", name: "드레스 (분홍)", src: `${BASE}/1out/char_a_p1_1out_pfdr_v01.png`, category: "outfit", battleCompatible: false },
  { id: "pfdr_v02", name: "드레스 (초록)", src: `${BASE}/1out/char_a_p1_1out_pfdr_v02.png`, category: "outfit", battleCompatible: false },
  { id: "pfdr_v03", name: "드레스 (파랑)", src: `${BASE}/1out/char_a_p1_1out_pfdr_v03.png`, category: "outfit", battleCompatible: false },
  { id: "pfdr_v04", name: "드레스 (보라)", src: `${BASE}/1out/char_a_p1_1out_pfdr_v04.png`, category: "outfit", battleCompatible: false },
  { id: "pfdr_v05", name: "드레스 (노랑)", src: `${BASE}/1out/char_a_p1_1out_pfdr_v05.png`, category: "outfit", battleCompatible: false },
  { id: "boxr_v01", name: "복서 트렁크", src: `${BASE}/1out/char_a_p1_1out_boxr_v01.png`, category: "outfit" },
  { id: "undi_v01", name: "기본 속옷", src: `${BASE}/1out/char_a_p1_1out_undi_v01.png`, category: "outfit" },
];

// ==================== 머리 (7개) ====================
export const HAIRS: AppearanceOption[] = [
  { id: "bob1_v00", name: "단발 (검정)", src: `${BASE}/4har/char_a_p1_4har_bob1_v00.png`, category: "hair" },
  { id: "bob1_v01", name: "단발 (갈색)", src: `${BASE}/4har/char_a_p1_4har_bob1_v01.png`, category: "hair" },
  { id: "bob1_v02", name: "단발 (금발)", src: `${BASE}/4har/char_a_p1_4har_bob1_v02.png`, category: "hair" },
  { id: "bob1_v03", name: "단발 (빨강)", src: `${BASE}/4har/char_a_p1_4har_bob1_v03.png`, category: "hair" },
  { id: "bob1_v04", name: "단발 (파랑)", src: `${BASE}/4har/char_a_p1_4har_bob1_v04.png`, category: "hair" },
  { id: "bob1_v05", name: "단발 (은발)", src: `${BASE}/4har/char_a_p1_4har_bob1_v05.png`, category: "hair" },
  { id: "dap1_v13", name: "장발 (보라)", src: `${BASE}/4har/char_a_p1_4har_dap1_v13.png`, category: "hair" },
];

// ==================== 모자 (15개 + 없음) ====================
export const HATS: AppearanceOption[] = [
  { id: "pfht_v01", name: "마법사 모자 (보라)", src: `${BASE}/5hat/char_a_p1_5hat_pfht_v01.png`, category: "hat" },
  { id: "pfht_v02", name: "마법사 모자 (검정)", src: `${BASE}/5hat/char_a_p1_5hat_pfht_v02.png`, category: "hat" },
  { id: "pfht_v03", name: "마법사 모자 (빨강)", src: `${BASE}/5hat/char_a_p1_5hat_pfht_v03.png`, category: "hat" },
  { id: "pfht_v04", name: "마법사 모자 (파랑)", src: `${BASE}/5hat/char_a_p1_5hat_pfht_v04.png`, category: "hat" },
  { id: "pfht_v05", name: "마법사 모자 (초록)", src: `${BASE}/5hat/char_a_p1_5hat_pfht_v05.png`, category: "hat" },
  { id: "pnty_v01", name: "고깔 모자 (빨강)", src: `${BASE}/5hat/char_a_p1_5hat_pnty_v01.png`, category: "hat" },
  { id: "pnty_v02", name: "고깔 모자 (파랑)", src: `${BASE}/5hat/char_a_p1_5hat_pnty_v02.png`, category: "hat" },
  { id: "pnty_v03", name: "고깔 모자 (초록)", src: `${BASE}/5hat/char_a_p1_5hat_pnty_v03.png`, category: "hat" },
  { id: "pnty_v04", name: "고깔 모자 (보라)", src: `${BASE}/5hat/char_a_p1_5hat_pnty_v04.png`, category: "hat" },
  { id: "pnty_v05", name: "고깔 모자 (노랑)", src: `${BASE}/5hat/char_a_p1_5hat_pnty_v05.png`, category: "hat" },
  { id: "pfbn_v01", name: "보닛 (분홍)", src: `${BASE}/5hat/char_a_p1_5hat_pfbn_v01.png`, category: "hat", battleCompatible: false },
  { id: "pfbn_v02", name: "보닛 (초록)", src: `${BASE}/5hat/char_a_p1_5hat_pfbn_v02.png`, category: "hat", battleCompatible: false },
  { id: "pfbn_v03", name: "보닛 (파랑)", src: `${BASE}/5hat/char_a_p1_5hat_pfbn_v03.png`, category: "hat", battleCompatible: false },
  { id: "pfbn_v04", name: "보닛 (보라)", src: `${BASE}/5hat/char_a_p1_5hat_pfbn_v04.png`, category: "hat", battleCompatible: false },
  { id: "pfbn_v05", name: "보닛 (노랑)", src: `${BASE}/5hat/char_a_p1_5hat_pfbn_v05.png`, category: "hat", battleCompatible: false },
];

// ==================== 기본값 ====================
export const DEFAULT_OUTFIT_ID = "fstr_v01";
export const DEFAULT_HAIR_ID = "bob1_v01";
export const DEFAULT_HAT_ID: string | null = null; // 기본은 모자 없음

// ==================== 조회 헬퍼 ====================
export function getOutfitById(id: string | null | undefined): AppearanceOption | null {
  if (!id) return null;
  return OUTFITS.find((o) => o.id === id) ?? null;
}

export function getHairById(id: string | null | undefined): AppearanceOption | null {
  if (!id) return null;
  return HAIRS.find((h) => h.id === id) ?? null;
}

export function getHatById(id: string | null | undefined): AppearanceOption | null {
  if (!id) return null;
  return HATS.find((h) => h.id === id) ?? null;
}

export function getOutfitSrc(id: string | null | undefined): string | null {
  return getOutfitById(id)?.src ?? null;
}

export function getHairSrc(id: string | null | undefined): string | null {
  return getHairById(id)?.src ?? null;
}

export function getHatSrc(id: string | null | undefined): string | null {
  return getHatById(id)?.src ?? null;
}

// ==================== ID 검증 (API 입력 sanitize) ====================
export function isValidOutfitId(id: string): boolean {
  return OUTFITS.some((o) => o.id === id);
}

export function isValidHairId(id: string): boolean {
  return HAIRS.some((h) => h.id === id);
}

export function isValidHatId(id: string): boolean {
  return HATS.some((h) => h.id === id);
}

// ==================== Battle 시트(pONE1) 경로 변환 ====================
// 전투 화면은 char_a_pONE1 시트(공격 모션 포함)를 사용.
// - battleCompatible !== false: pONE1 경로로 변환 → 정확한 공격 포즈 그래픽
// - battleCompatible === false: p1 경로 그대로 사용 → 포즈는 약간 어긋날 수 있으나
//   "공격 시 옷이 바뀌는" 위화감 없이 동일 외형 유지
// - 옵션 자체가 없는 경우(undefined): pONE1 default

const DEFAULT_BATTLE_OUTFIT_SRC = `${BASE}/1out/char_a_pONE1_1out_fstr_v01.png`
  .replace("/char_a_p1/", "/char_a_pONE1/");
const DEFAULT_BATTLE_HAIR_SRC = `${BASE}/4har/char_a_pONE1_4har_bob1_v01.png`
  .replace("/char_a_p1/", "/char_a_pONE1/");

function toBattlePath(src: string): string {
  return src
    .replace("/char_a_p1/", "/char_a_pONE1/")
    .replace("char_a_p1_", "char_a_pONE1_");
}

export function getOutfitBattleSrc(id: string | null | undefined): string {
  const opt = getOutfitById(id);
  if (!opt) return DEFAULT_BATTLE_OUTFIT_SRC;
  // 비호환 옷은 p1 경로 그대로 (외형 일관성 우선)
  if (opt.battleCompatible === false) return opt.src;
  return toBattlePath(opt.src);
}

export function getHairBattleSrc(id: string | null | undefined): string {
  const opt = getHairById(id);
  if (!opt) return DEFAULT_BATTLE_HAIR_SRC;
  if (opt.battleCompatible === false) return opt.src;
  return toBattlePath(opt.src);
}

export function getHatBattleSrc(id: string | null | undefined): string | null {
  const opt = getHatById(id);
  if (!opt) return null;
  // 비호환 모자도 p1 경로 그대로 (외형 일관성 우선)
  if (opt.battleCompatible === false) return opt.src;
  return toBattlePath(opt.src);
}
