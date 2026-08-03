// 광장(Square) 맵 데이터 스키마 + 로더.
//
// 지금까지 하드코딩돼 있던 두 배열
//   - page.tsx 의 NPC_POSITIONS (위치)
//   - NpcData.ts 의 NPC_USERS   (외형/행동)
// 을 "맵 하나 = JSON 하나"로 통합한다. 게임(PixiSquareScene)과 (추후) 맵 에디터가
// 같은 스키마를 공유하므로, 에디터가 export한 JSON을 그대로 게임이 읽는다.
//
// 데이터 원본: /public/maps/square.json
//   → 에디터에서 내보낸 파일을 이 경로에 덮어쓰면 리빌드 없이 배치가 바뀐다.

export const SQUARE_MAP_VERSION = 1;

/** 맵 기본 설정 — 렌더 배율/종횡비/배경/충돌. */
export interface SquareMapConfig {
  /** 뷰포트 대비 맵 배율 (기존 MAP_SCALE = 2.5) */
  scale: number;
  /** 맵 종횡비 width/height (기존 1536/1024 = 1.5) */
  aspect: number;
  /** 배경 이미지 경로. 당장은 통짜 일러스트, 추후 타일 레이어로 교체 가능. */
  background: string;
  /** 충돌 마스크 PNG 경로 (흰색 = 걸을 수 있음). 추후 격자 데이터로 교체 가능. */
  collisionMask: string;
}

export type SquareObjectKind = "npc" | "prop";

interface SquareObjectBase {
  /** 고유 id (에디터에서 선택/삭제 키) */
  id: string;
  kind: SquareObjectKind;
  /** 발 기준 위치 (맵 %, 0~100) */
  x: number;
  y: number;
  /** 이미지 픽셀 오프셋 (미세 정렬용) */
  offsetX?: number;
  offsetY?: number;
  /** 좌우반전 */
  flip?: boolean;
  /**
   * 표시 크기(px). frame 이 있으면 "높이"로 해석하고 가로는 frame 종횡비로 계산,
   * 없으면 정사각(가로=세로=size)으로 표시. (미지정 시 씬 기본값)
   */
  size?: number;
  /**
   * 아틀라스 프레임 — imageSrc 시트에서 잘라낼 사각형(px).
   * 있으면 시트 1장을 공유하며 이 영역만 그린다(square_sprites.png 등).
   * 없으면 imageSrc 를 통짜 이미지/가로스트립으로 처리(기존 방식).
   */
  frame?: { x: number; y: number; w: number; h: number };
}

/** NPC — 클릭/상호작용 가능. 기존 SquareUser + 위치를 하나로 합친 것. */
export interface SquareNpcObject extends SquareObjectBase {
  kind: "npc";
  nickname: string;
  imageSrc: string;
  /** 클릭형 NPC 여부 (true면 앞까지 걸어가 모달을 연다) */
  interactive?: boolean;
  /** 클릭 시 열 모달 (interactive NPC 전용) */
  action?: "rest" | "roulette";
  /** 앰비언트 말풍선 대사 목록 — 랜덤으로 잠깐씩 머리 위에 띄운다. */
  lines?: string[];
}

/** 구조물/장식 — 노점·분수·표지판 등. 클릭 불가, 깊이 정렬만 참여. */
export interface SquarePropObject extends SquareObjectBase {
  kind: "prop";
  imageSrc: string;
}

export type SquareObject = SquareNpcObject | SquarePropObject;

export interface SquareMapData {
  version: number;
  config: SquareMapConfig;
  /** 플레이어 최초 스폰 위치 (맵 %). 세션 중 이동 위치는 스토어가 따로 관리. */
  player: { spawn: { x: number; y: number } };
  objects: SquareObject[];
}

// ── 기본값 / 폴백 ──────────────────────────────────────────────

export const DEFAULT_SQUARE_CONFIG: SquareMapConfig = {
  scale: 2.5,
  aspect: 1536 / 1024,
  background: "/images/backgrounds/square.png",
  collisionMask: "/images/backgrounds/square_mask.png",
};

/** fetch 실패 시에도 광장이 최소한 렌더되도록 하는 폴백(오브젝트 없음). */
export const FALLBACK_SQUARE_MAP: SquareMapData = {
  version: SQUARE_MAP_VERSION,
  config: DEFAULT_SQUARE_CONFIG,
  player: { spawn: { x: 50, y: 70 } },
  objects: [],
};

// ── 검증 / 정규화 ──────────────────────────────────────────────

function isValidObject(o: unknown): o is SquareObject {
  if (!o || typeof o !== "object") return false;
  const obj = o as Record<string, unknown>;
  return (
    (obj.kind === "npc" || obj.kind === "prop") &&
    typeof obj.x === "number" &&
    typeof obj.y === "number" &&
    typeof obj.imageSrc === "string"
  );
}

/** 부분/불완전 데이터에 기본값을 채워 안전한 SquareMapData로 정규화. */
export function normalizeSquareMap(raw: unknown): SquareMapData {
  const data = (raw ?? {}) as Partial<SquareMapData>;
  const config: SquareMapConfig = { ...DEFAULT_SQUARE_CONFIG, ...(data.config ?? {}) };
  const objects = Array.isArray(data.objects)
    ? data.objects.filter(isValidObject)
    : [];
  const spawn = data.player?.spawn ?? { x: 50, y: 70 };
  return {
    version: typeof data.version === "number" ? data.version : SQUARE_MAP_VERSION,
    config,
    player: { spawn },
    objects,
  };
}

/** /public/maps/square.json 을 불러온다. 실패 시 폴백 맵을 반환(광장은 항상 렌더). */
export async function loadSquareMap(
  url = "/maps/square.json"
): Promise<SquareMapData> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return normalizeSquareMap(await res.json());
  } catch (err) {
    console.error("[Square] 맵 로드 실패, 폴백 맵 사용:", err);
    return FALLBACK_SQUARE_MAP;
  }
}

// ── 스프라이트 아틀라스 ─────────────────────────────────────────
// scripts/slice_atlas.mjs 가 square_sprites.png 를 잘라 생성한다.

export type AtlasGroup = "tile" | "building" | "prop" | "npc" | "foreground";

export interface AtlasFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  group: AtlasGroup;
}

export interface SquareAtlas {
  /** 시트 이미지 경로 (모든 프레임이 공유) */
  sheet: string;
  /** 시트 원본 픽셀 크기 (썸네일 스케일 계산용) */
  width: number;
  height: number;
  sprites: Record<string, AtlasFrame>;
}

/** 광장 스프라이트 아틀라스를 불러온다. 실패 시 null. */
export async function loadSquareAtlas(
  url = "/images/square/square_atlas.json"
): Promise<SquareAtlas | null> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SquareAtlas;
  } catch (err) {
    console.error("[Square] 아틀라스 로드 실패:", err);
    return null;
  }
}
