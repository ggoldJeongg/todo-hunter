// Swordsman 단일 캐릭터 스프라이트 정의 + Canvas2D 렌더 헬퍼
// 모든 동작이 하나의 시트(Swordsman.png)에 행(row)으로 들어있다. 프레임 100x100.
//   행 = 동작 종류(row), 열 = 프레임(frameIndex)
// Pixi(전투)와 Canvas2D(광장/캐릭터/엔딩)가 이 정의를 공유한다.
// 주의: 이 모듈은 pixi.js를 import 하지 않는다 (Canvas2D 컴포넌트 번들 경량 유지).

// 동작 전체를 합친 단일 스프라이트 시트 (1500x700 = 15열 x 7행)
export const SWORDSMAN_SHEET = "/images/characters/swordsman/Swordsman.png";
export const SWORDSMAN_FRAME_SIZE = 100;

export interface SpriteClip {
  row: number; // 시트 내 행 인덱스 (sy = row * frameSize)
  frames: number; // 그 행의 가로 프레임 개수
}

// 동작별 클립 (row = 시트 행, frames = 가로 프레임 개수). 시트 실측 기준.
export const SWORDSMAN_CLIPS = {
  idle: { row: 0, frames: 6 },
  walk: { row: 1, frames: 8 },
  attack: { row: 2, frames: 7 },
  attack2: { row: 3, frames: 15 },
  attack3: { row: 4, frames: 12 },
  hurt: { row: 5, frames: 5 },
  death: { row: 6, frames: 4 },
} satisfies Record<string, SpriteClip>;

export type SwordsmanClipName = keyof typeof SWORDSMAN_CLIPS;

// ==================== Canvas2D 헬퍼 ====================

// src → Promise<HTMLImageElement> 전역 캐시 (같은 PNG 중복 디코드 방지)
const imgCache = new Map<string, Promise<HTMLImageElement>>();

export function loadSpriteImage(src: string): Promise<HTMLImageElement> {
  let p = imgCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load sprite: ${src}`));
      img.src = src;
    });
    imgCache.set(src, p);
  }
  return p;
}

// 프레임(100x100) 안에서 캐릭터는 작게(~24x22px) 그려져 있고 나머지는 투명 여백.
// 픽셀 측정 기준: idle/walk x42~65·y38~60, attack는 x40~79까지 돌진.
// → 발 중심(프레임 정규화 좌표)을 기준으로 확대 정렬해 캐릭터를 크게 보이게 한다.
const CHAR_CENTER_X = 0.52; // 캐릭터 좌우 중심
const CHAR_FEET_Y = 0.7; // 발 위치
const DRAW_ZOOM = 2.0; // 캔버스 대비 확대 배율 (클수록 캐릭터 큼)
const FEET_SCREEN_Y = 0.94; // 캔버스 안에서 발이 놓일 세로 위치

// 시트에서 clip(행) + frameIndex(열) 한 프레임을 캐릭터 기준으로 확대해 그림.
// 투명 여백은 캔버스 밖으로 넘어가 잘린다. flipX=true면 좌우 반전(왼쪽 이동 등).
export function drawSpriteFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  clip: SpriteClip,
  frameIndex: number,
  dWidth: number,
  dHeight: number,
  flipX = false
): void {
  const fs = SWORDSMAN_FRAME_SIZE;
  const sx = frameIndex * fs; // 열 → 가로 위치
  const sy = clip.row * fs; // 행(동작 종류) → 세로 위치
  const S = Math.max(dWidth, dHeight) * DRAW_ZOOM; // 프레임을 그릴 정사각 크기
  const dx = dWidth / 2 - CHAR_CENTER_X * S;
  const dy = dHeight * FEET_SCREEN_Y - CHAR_FEET_Y * S;

  ctx.clearRect(0, 0, dWidth, dHeight);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flipX) {
    ctx.translate(dWidth, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, sx, sy, fs, fs, dx, dy, S, S);
  ctx.restore();
}
