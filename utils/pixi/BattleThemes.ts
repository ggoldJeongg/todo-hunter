import { Container, Graphics, Sprite, Assets, type Texture } from "pixi.js";

export type BattleThemeId = "night" | "forest" | "dungeon" | "volcano" | "field";

export interface BattleTheme {
  id: BattleThemeId;
  name: string;
  bgColor: number; // Application background
  buildBackground: (width: number, height: number) => Container;
}

// ─── 공통 유틸 ───

function makeTiledFloor(
  width: number,
  height: number,
  groundY: number,
  colorA: number,
  colorB: number,
  borderColor: number,
  gridAlpha: number
): Container {
  const container = new Container();

  // 경계선
  const border = new Graphics();
  border.rect(0, groundY, width, 2);
  border.fill({ color: borderColor });
  container.addChild(border);

  // 타일
  const tiles = new Graphics();
  for (let x = 0; x < width; x += 32) {
    tiles.rect(x, groundY + 2, 16, height - groundY - 2);
    tiles.fill({ color: colorA });
    tiles.rect(x + 16, groundY + 2, 16, height - groundY - 2);
    tiles.fill({ color: colorB });
  }
  container.addChild(tiles);

  // 수평 그리드
  const grid = new Graphics();
  for (let y = groundY + 2; y < height; y += 16) {
    grid.rect(0, y, width, 1);
    grid.fill({ color: 0xffffff, alpha: gridAlpha });
  }
  container.addChild(grid);

  return container;
}

function makeParticles(
  positions: { x: number; y: number }[],
  color: number,
  radius: number
): Graphics {
  const g = new Graphics();
  for (const p of positions) {
    g.circle(p.x, p.y, radius);
  }
  g.fill({ color });
  return g;
}

// ─── 밤하늘 (기본) ───

const STAR_POSITIONS = [
  { x: 20, y: 23 },
  { x: 80, y: 33 },
  { x: 150, y: 18 },
  { x: 220, y: 38 },
  { x: 300, y: 26 },
  { x: 350, y: 16 },
];

function buildNight(width: number, height: number): Container {
  const bg = new Container();

  // 하늘
  const sky = new Graphics();
  sky.rect(0, 0, width, 120);
  sky.fill({ color: 0x0f0c29 });
  bg.addChild(sky);

  const midSky = new Graphics();
  midSky.rect(0, 40, width, 40);
  midSky.fill({ color: 0x302b63, alpha: 0.6 });
  bg.addChild(midSky);

  const lowSky = new Graphics();
  lowSky.rect(0, 80, width, 40);
  lowSky.fill({ color: 0x24243e, alpha: 0.7 });
  bg.addChild(lowSky);

  // 별
  bg.addChild(makeParticles(STAR_POSITIONS, 0xffffff, 1));

  // 바닥
  bg.addChild(
    makeTiledFloor(width, height, 112, 0x2a2a4a, 0x252545, 0x3a3a5a, 0.03)
  );

  return bg;
}

// ─── 숲 ───

const FIREFLY_POSITIONS = [
  { x: 30, y: 35 },
  { x: 120, y: 20 },
  { x: 200, y: 45 },
  { x: 280, y: 28 },
  { x: 370, y: 40 },
];

function buildForest(width: number, height: number): Container {
  const bg = new Container();

  // 하늘 — 깊은 숲 녹색 그라디언트
  const sky = new Graphics();
  sky.rect(0, 0, width, 120);
  sky.fill({ color: 0x0a1f0a });
  bg.addChild(sky);

  const midSky = new Graphics();
  midSky.rect(0, 30, width, 45);
  midSky.fill({ color: 0x1a3a1a, alpha: 0.7 });
  bg.addChild(midSky);

  const lowSky = new Graphics();
  lowSky.rect(0, 75, width, 45);
  lowSky.fill({ color: 0x2d5a2d, alpha: 0.5 });
  bg.addChild(lowSky);

  // 나무 실루엣 (배경)
  const trees = new Graphics();
  const treePositions = [15, 55, 100, 155, 210, 260, 320, 380];
  for (const tx of treePositions) {
    const h = 40 + (tx * 7) % 25; // 다양한 높이
    // 줄기
    trees.rect(tx - 2, 112 - h + 20, 4, h - 20);
    trees.fill({ color: 0x1a2a1a, alpha: 0.6 });
    // 왕관 (삼각형 근사 — 다이아몬드)
    trees.circle(tx, 112 - h + 15, 12 + (tx * 3) % 8);
    trees.fill({ color: 0x0f2f0f, alpha: 0.5 });
  }
  bg.addChild(trees);

  // 반딧불이
  bg.addChild(makeParticles(FIREFLY_POSITIONS, 0xaaff44, 1.5));

  // 바닥 — 풀 + 흙
  bg.addChild(
    makeTiledFloor(width, height, 112, 0x2d5a3d, 0x1a3a2d, 0x3d7a4d, 0.04)
  );

  // 풀 디테일
  const grass = new Graphics();
  for (let gx = 0; gx < width; gx += 8) {
    const bladeH = 3 + (gx * 13) % 5;
    grass.rect(gx, 112 - bladeH, 2, bladeH);
    grass.fill({ color: 0x4a8a4a, alpha: 0.4 + ((gx * 7) % 30) / 100 });
  }
  bg.addChild(grass);

  return bg;
}

// ─── 던전 ───

const TORCH_POSITIONS = [
  { x: 60, y: 50 },
  { x: 180, y: 45 },
  { x: 320, y: 55 },
];

function buildDungeon(width: number, height: number): Container {
  const bg = new Container();

  // 어두운 석벽
  const wall = new Graphics();
  wall.rect(0, 0, width, 120);
  wall.fill({ color: 0x1a1a2e });
  bg.addChild(wall);

  // 벽돌 패턴
  const bricks = new Graphics();
  for (let by = 0; by < 120; by += 16) {
    const offset = (by / 16) % 2 === 0 ? 0 : 16;
    for (let bx = -16 + offset; bx < width + 16; bx += 32) {
      bricks.rect(bx, by, 30, 14);
      bricks.fill({ color: 0x222240, alpha: 0.4 });
      // 벽돌 틈새 (어두운 라인)
      bricks.rect(bx, by + 14, 32, 2);
      bricks.fill({ color: 0x0f0f1e, alpha: 0.3 });
    }
  }
  bg.addChild(bricks);

  // 횃불
  for (const tp of TORCH_POSITIONS) {
    // 횃불 받침
    const holder = new Graphics();
    holder.rect(tp.x - 2, tp.y, 4, 20);
    holder.fill({ color: 0x5a4a3a });
    bg.addChild(holder);

    // 불꽃 (원형 glow)
    const flame = new Graphics();
    flame.circle(tp.x, tp.y - 2, 6);
    flame.fill({ color: 0xff8800, alpha: 0.8 });
    bg.addChild(flame);

    // 불빛 반경
    const glow = new Graphics();
    glow.circle(tp.x, tp.y, 30);
    glow.fill({ color: 0xff6600, alpha: 0.06 });
    bg.addChild(glow);
  }

  // 바닥 — 석재 타일
  bg.addChild(
    makeTiledFloor(width, height, 112, 0x2a2a3a, 0x222233, 0x444466, 0.05)
  );

  // 바닥 균열 디테일
  const cracks = new Graphics();
  const crackPositions = [40, 130, 250, 350];
  for (const cx of crackPositions) {
    cracks.moveTo(cx, 125);
    cracks.lineTo(cx + 5, 135);
    cracks.lineTo(cx + 2, 150);
    cracks.stroke({ color: 0x111122, width: 1, alpha: 0.4 });
  }
  bg.addChild(cracks);

  return bg;
}

// ─── 화산 ───

const EMBER_POSITIONS = [
  { x: 25, y: 30 },
  { x: 90, y: 15 },
  { x: 160, y: 40 },
  { x: 240, y: 22 },
  { x: 310, y: 35 },
  { x: 380, y: 18 },
  { x: 50, y: 50 },
  { x: 270, y: 48 },
];

function buildVolcano(width: number, height: number): Container {
  const bg = new Container();

  // 붉은 하늘
  const sky = new Graphics();
  sky.rect(0, 0, width, 120);
  sky.fill({ color: 0x1a0a0a });
  bg.addChild(sky);

  const midSky = new Graphics();
  midSky.rect(0, 30, width, 45);
  midSky.fill({ color: 0x3a1515, alpha: 0.7 });
  bg.addChild(midSky);

  const lowSky = new Graphics();
  lowSky.rect(0, 75, width, 45);
  lowSky.fill({ color: 0x5a2020, alpha: 0.5 });
  bg.addChild(lowSky);

  // 먼 화산 실루엣
  const volcano = new Graphics();
  volcano.moveTo(width * 0.3, 112);
  volcano.lineTo(width * 0.45, 40);
  volcano.lineTo(width * 0.5, 45);
  volcano.lineTo(width * 0.55, 38);
  volcano.lineTo(width * 0.7, 112);
  volcano.fill({ color: 0x1a0808, alpha: 0.6 });
  bg.addChild(volcano);

  // 화산 꼭대기 용암 빛
  const lavaGlow = new Graphics();
  lavaGlow.circle(width * 0.5, 35, 15);
  lavaGlow.fill({ color: 0xff4400, alpha: 0.15 });
  bg.addChild(lavaGlow);

  // 불씨 파티클
  bg.addChild(makeParticles(EMBER_POSITIONS, 0xff6633, 1.5));

  // 바닥 — 용암 + 검은 바위
  const groundY = 112;
  const floor = new Container();

  const border = new Graphics();
  border.rect(0, groundY, width, 2);
  border.fill({ color: 0x661a00 });
  floor.addChild(border);

  // 바위 타일
  const tiles = new Graphics();
  for (let x = 0; x < width; x += 32) {
    tiles.rect(x, groundY + 2, 16, height - groundY - 2);
    tiles.fill({ color: 0x2a1a1a });
    tiles.rect(x + 16, groundY + 2, 16, height - groundY - 2);
    tiles.fill({ color: 0x1f1010 });
  }
  floor.addChild(tiles);

  // 용암 균열 (바닥에 붉은 빛)
  const lavaCracks = new Graphics();
  const lavaPositions = [20, 80, 150, 220, 300, 370];
  for (const lx of lavaPositions) {
    lavaCracks.rect(lx, groundY + 6 + (lx * 3) % 20, 12, 2);
    lavaCracks.fill({ color: 0xff4400, alpha: 0.3 });
    // glow
    lavaCracks.rect(lx - 2, groundY + 4 + (lx * 3) % 20, 16, 6);
    lavaCracks.fill({ color: 0xff2200, alpha: 0.08 });
  }
  floor.addChild(lavaCracks);

  // 수평 그리드
  const grid = new Graphics();
  for (let y = groundY + 2; y < height; y += 16) {
    grid.rect(0, y, width, 1);
    grid.fill({ color: 0xff4400, alpha: 0.03 });
  }
  floor.addChild(grid);

  bg.addChild(floor);

  return bg;
}

// ─── 들판 (이미지 배경) ───

function buildField(width: number, height: number): Container {
  const bg = new Container();

  // 비동기로 텍스처 로드 후 sprite 추가. 컨테이너가 destroy 되었으면 취소.
  Assets.load<Texture>("/images/backgrounds/field_01.png").then((texture) => {
    if (bg.destroyed) return;
    const sprite = new Sprite(texture);
    sprite.width = width;
    sprite.height = height;
    bg.addChild(sprite);
  });

  return bg;
}

// ─── 테마 레지스트리 ───

export const BATTLE_THEMES: Record<BattleThemeId, BattleTheme> = {
  night: {
    id: "night",
    name: "밤하늘",
    bgColor: 0x0f0c29,
    buildBackground: buildNight,
  },
  forest: {
    id: "forest",
    name: "숲",
    bgColor: 0x0a1f0a,
    buildBackground: buildForest,
  },
  dungeon: {
    id: "dungeon",
    name: "던전",
    bgColor: 0x1a1a2e,
    buildBackground: buildDungeon,
  },
  volcano: {
    id: "volcano",
    name: "화산",
    bgColor: 0x1a0a0a,
    buildBackground: buildVolcano,
  },
  field: {
    id: "field",
    name: "모험의 시작",
    bgColor: 0x000000,
    buildBackground: buildField,
  },
};
