import {
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Texture,
  type FederatedPointerEvent,
} from "pixi.js";
import {
  buildGardenGrid,
  cropStage,
  type DayBucket,
  type GardenCell,
  type Tag,
} from "@/utils/garden";

// 아이소 다이아몬드 반폭/반높이 (true isometric, 화면 비율 2:1)
const HW = 22;
const HH = 11;

// 빈 곳에 보일 바닥색(잔디가 대부분 덮음). 잔디톤 그린.
const GRASS_CLEAR = 0x6f9e56;
const SOIL_SIDE = 0x5a3a22;
// 월별 흙 색 — 홀수 월(어두운 갈색) / 짝수 월(밝은 탠)으로 띠를 만들어 월 경계를 보이게.
const MONTH_PAL = [
  { a: 0x8b5e36, b: 0x7c5230 }, // 홀수 월
  { a: 0xa67b49, b: 0x97683b }, // 짝수 월
];
const NAME_FONT = "Galmuri11, system-ui, sans-serif";

const TAG_COLOR: Record<Tag, number> = {
  STR: 0xc84b3a,
  INT: 0x6b8fb8,
  EMO: 0xc97b8e,
  FIN: 0xb89a4e,
  LIV: 0x9b7cb8,
};
const TAG_DARK: Record<Tag, number> = {
  STR: 0x8e2f22,
  INT: 0x4a6b8e,
  EMO: 0x8e5566,
  FIN: 0x8e7536,
  LIV: 0x6e5489,
};
// 한 칸에 카테고리별 작물을 심을 때의 안정적 순서
const TAG_ORDER: Tag[] = ["STR", "INT", "EMO", "FIN", "LIV"];

// 작물 로드 실패 시 폴백 덤불 크기
const BUSH_H = [0, 8, 12, 16];
const BUSH_W = [0, 7, 10, 13];

// ── Mana Seed Farming Crops 스프라이트 시트 (160×512, 16×32 셀, 10열×16행) ──
const CROP_SHEET_URL = "/images/garden/crops-1a.png";
const CELL_W = 16;
const CELL_H = 32;
const STAGE_COL0 = 3; // 성장 단계 1이 시작하는 열(0-indexed)
const CROP_ROW: Record<Tag, number> = {
  STR: 8, // 토마토(빨강)
  INT: 13, // 블루 포도(파랑)
  EMO: 12, // 딸기(분홍)
  FIN: 3, // 옥수수(금색)
  LIV: 1, // 양배추(초록)
};
const SPRITE_SCALE = 0.94;

// ── 이소 흙 타일(갈아엎은 흙) — 그레이스케일 텍스처를 월별 색으로 tint ──
const SOIL_URL = "/images/garden/soil-iso.png";
const SOIL_TEX_W = 88;
const SOIL_SCALE = (HW * 2) / SOIL_TEX_W;

// ── garden_tile_set.png 하나에서 잔디·물·오브젝트를 모두 잘라 쓴다 ──
const TILESET_URL = "/images/garden/garden_tile_set.png";
const TILE_SRC_W = 100; // 잔디·물 마름모 원본 크기
const TILE_SRC_H = 50;
const GROUND_TILE_SCALE = (HW * 2) / TILE_SRC_W; // 100px 타일 → 다이아몬드 폭
// 잔디 마름모 19변형 소스 좌표(각 100×50)
const GRASS_ROWS: Array<[number, number]> = [
  [50, 7],
  [150, 8],
  [250, 4],
];
const GRASS_SRC: Array<[number, number]> = [];
for (const [y, n] of GRASS_ROWS)
  for (let i = 0; i < n; i++) GRASS_SRC.push([i * 100, y]);
// 꽉 찬 파란 물 마름모 소스
const WATER_SRC: Array<[number, number]> = [
  [400, 850],
  [500, 850],
  [600, 950],
  [700, 950],
  [800, 950],
  [900, 950],
];
// 오브젝트 소스 [x,y,w,h] — 카테고리별
const OBJ_SRC: Record<string, Array<[number, number, number, number]>> = {
  rock: [
    [8, 516, 83, 77],
    [108, 511, 83, 82],
    [204, 511, 86, 86],
    [316, 502, 367, 98],
    [700, 519, 193, 80],
    [910, 540, 84, 60],
  ],
  tuft: [
    [11, 1129, 77, 59],
    [108, 1124, 180, 72],
    [333, 1124, 246, 76],
    [600, 1127, 200, 73],
    [810, 1136, 81, 64],
    [911, 1125, 83, 61],
  ],
  bush: [
    [110, 1225, 87, 68],
    [808, 1230, 89, 63],
    [905, 1218, 89, 75],
    [44, 1244, 52, 42],
  ],
  pine: [
    [211, 1230, 72, 149],
    [315, 1268, 67, 111],
  ],
  tree: [
    [4, 1365, 95, 217],
    [110, 1374, 89, 208],
    [211, 1413, 75, 166],
    [321, 1418, 58, 161],
    [438, 1418, 222, 176],
    [724, 1363, 269, 227],
  ],
};
const OBJ_SCALE: Record<string, number> = {
  rock: 0.5,
  tuft: 0.5,
  bush: 0.5,
  pine: 0.42,
  tree: 0.3,
};
// 배치 빈도 가중치(풀·덤불 흔하게, 큰나무 드물게)
const OBJ_WEIGHT: Array<[string, number]> = [
  ["tuft", 32],
  ["bush", 24],
  ["rock", 16],
  ["pine", 10],
  ["tree", 6],
];
// 밭 위(앞)엔 두지 않을 큰 오브젝트(작물을 가리지 않도록) — 앞이면 덤불로 대체
const BIG_OBJ = new Set(["tree", "pine"]);
const OBJ_FILL = 0.5; // hash가 이 값 이상이면 오브젝트 배치
// 스크롤 범위를 양끝에서 이 비율만큼 줄인다(극단 칸이 화면 중앙까진 안 옴).
const SCROLL_EDGE = 0.05;

// 결정적 의사난수(0~1) — 배치를 고정해 리사이즈/재렌더에도 동일.
function hash(a: number, b: number): number {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export interface GardenTapInfo {
  date: string;
  count: number;
  byTag: Record<Tag, number>;
  /** 캔버스 기준 좌표(px) — 팝오버 위치용 */
  screenX: number;
  screenY: number;
}

export interface GardenSceneOptions {
  todayMs: number;
  data: Map<string, DayBucket>;
  onTileTap: (info: GardenTapInfo | null) => void;
}

interface BushNode {
  node: Container;
  phase: number;
}

/**
 * 성장 정원 — 아이소메트릭 농장. garden_tile_set의 잔디·물·나무·바위로 들판을 꾸미고,
 * 가운데 흙밭 365칸에 완료한 날의 작물이 자란다. 좌우 드래그로 시간축(주) 이동.
 */
export class PixiGardenScene {
  private app: Application | null = null;
  private world = new Container();
  private groundLayer = new Container(); // 잔디/물 마름모 바닥
  private objectBackLayer = new Container(); // 밭 뒤(row<0) 오브젝트 — 밭에 가려짐
  private objectFrontLayer = new Container(); // 밭 앞(row>6) 오브젝트 — 밭·작물 위
  private floor = new Graphics(); // 흙 측면(두께) + 텍스처 없을 때 폴백
  private soilLayer = new Container(); // 흙 윗면 텍스처
  private bushLayer = new Container(); // 작물
  private todayBorder = new Graphics();
  private labelLayer = new Container();

  private cells: GardenCell[] = [];
  private cellByKey = new Map<string, GardenCell>();
  private bushes: BushNode[] = [];
  private data!: Map<string, DayBucket>;
  private opts!: GardenSceneOptions;

  // 텍스처. 로드 실패 시 각각 폴백.
  private cropTex = new Map<string, Texture>();
  private soilTex: Texture | null = null;
  private grassTiles: Texture[] = [];
  private waterTiles: Texture[] = [];
  private objTex: Record<string, Texture[]> = {};
  private pond = new Set<string>();

  private width = 0;
  private height = 0;
  private builtW = 0; // 잔디 바닥을 채운 기준 크기(리사이즈로 커지면 재빌드)
  private builtH = 0;
  private maxCol = 0;
  private scroll = 0;
  private elapsed = 0;

  private dragging = false;
  private lastX = 0;
  private movedDist = 0;

  private get cx() {
    return this.width * 0.62;
  }
  private get cy() {
    return this.height * 0.42;
  }
  // 스크롤 허용 범위(양끝 SCROLL_EDGE 비율만큼 축소)
  private get scrollMin() {
    return this.maxCol * SCROLL_EDGE;
  }
  private get scrollMax() {
    return this.maxCol * (1 - SCROLL_EDGE);
  }

  async init(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    opts: GardenSceneOptions,
  ) {
    this.width = width;
    this.height = height;
    this.opts = opts;
    this.data = opts.data;

    this.cells = buildGardenGrid(opts.todayMs);
    this.maxCol = this.cells.reduce((m, c) => Math.max(m, c.col), 0);
    for (const c of this.cells) this.cellByKey.set(`${c.col},${c.row}`, c);
    this.scroll = this.scrollMax; // 열면 가장 최근(오늘) 쪽

    this.app = new Application();
    await this.app.init({
      canvas,
      width,
      height,
      background: GRASS_CLEAR,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    });

    this.bushLayer.sortableChildren = true;
    this.objectBackLayer.sortableChildren = true;
    this.objectFrontLayer.sortableChildren = true;
    // 이소 깊이순: 잔디 → 뒤 오브젝트 → 밭 → 작물 → 앞 오브젝트 → 라벨
    this.world.addChild(this.groundLayer);
    this.world.addChild(this.objectBackLayer);
    this.world.addChild(this.floor);
    this.world.addChild(this.soilLayer);
    this.world.addChild(this.todayBorder);
    this.world.addChild(this.bushLayer);
    this.world.addChild(this.objectFrontLayer);
    this.world.addChild(this.labelLayer);
    this.app.stage.addChild(this.world);

    await this._loadTextures();
    this._buildGround();
    this._buildObjects();
    this._buildFloor();
    this._buildCrops();
    this._buildMonthLabels();
    this._updateCamera();
    this._bindPointer();
    this._startTicker();
  }

  // 작물 시트 + 흙 텍스처 + garden_tile_set(잔디·물·오브젝트)을 로드/슬라이스.
  private async _loadTextures() {
    try {
      const sheet = await Assets.load<Texture>(CROP_SHEET_URL);
      sheet.source.scaleMode = "nearest";
      for (const tag of Object.keys(CROP_ROW) as Tag[]) {
        const row = CROP_ROW[tag];
        for (let stage = 1; stage <= 5; stage++) {
          const x = (STAGE_COL0 + stage - 1) * CELL_W;
          const y = row * CELL_H;
          this.cropTex.set(
            `${tag}:${stage}`,
            new Texture({
              source: sheet.source,
              frame: new Rectangle(x, y, CELL_W, CELL_H),
            }),
          );
        }
      }
    } catch {
      this.cropTex.clear();
    }

    try {
      this.soilTex = await Assets.load<Texture>(SOIL_URL);
      this.soilTex.source.scaleMode = "nearest";
    } catch {
      this.soilTex = null;
    }

    try {
      const sheet = await Assets.load<Texture>(TILESET_URL);
      sheet.source.scaleMode = "nearest";
      const src = sheet.source;
      this.grassTiles = GRASS_SRC.map(
        ([x, y]) =>
          new Texture({
            source: src,
            frame: new Rectangle(x, y, TILE_SRC_W, TILE_SRC_H),
          }),
      );
      this.waterTiles = WATER_SRC.map(
        ([x, y]) =>
          new Texture({
            source: src,
            frame: new Rectangle(x, y, TILE_SRC_W, TILE_SRC_H),
          }),
      );
      this.objTex = {};
      for (const cat of Object.keys(OBJ_SRC)) {
        this.objTex[cat] = OBJ_SRC[cat].map(
          ([x, y, w, h]) =>
            new Texture({ source: src, frame: new Rectangle(x, y, w, h) }),
        );
      }
    } catch {
      this.grassTiles = [];
      this.waterTiles = [];
      this.objTex = {};
    }
  }

  // 스크롤하며 마주치도록 밭 둘레에 작은 연못 몇 개를 결정적으로 배치.
  private _computePond(): Set<string> {
    const set = new Set<string>();
    if (!this.waterTiles.length) return set;
    const centers: Array<[number, number]> = [
      [this.maxCol - 6, 10],
      [this.maxCol - 24, -4],
      [this.maxCol - 42, 10],
    ];
    for (const [pc, pr] of centers)
      for (let dc = -2; dc <= 2; dc++)
        for (let dr = -2; dr <= 2; dr++)
          if (Math.abs(dc) + Math.abs(dr) <= 2) set.add(`${pc + dc},${pr + dr}`);
    return set;
  }

  // 스크롤 양끝(scroll 0~maxCol)에서도 뷰포트를 덮도록, 화면 크기에서
  // 잔디 바닥의 열 여백(pad)과 행 범위를 계산한다. 카메라 중심은 (0.62W, 0.42H).
  private _groundRange() {
    const W = this.width;
    const H = this.height;
    const padL = Math.ceil(((0.62 * W) / HW + (0.42 * H) / HH) / 2);
    const padR = Math.ceil(((0.38 * W) / HW + (0.58 * H) / HH) / 2);
    const rowMin = -Math.ceil(((0.42 * H) / HH + (0.38 * W) / HW) / 2) - 2;
    const rowMax = Math.ceil(((0.58 * H) / HH + (0.62 * W) / HW) / 2) + 2;
    return { pad: Math.max(padL, padR) + 2, rowMin, rowMax };
  }

  // 잔디 바닥 — 이소 잔디 마름모(랜덤 변형)로 채우고, 연못 칸엔 물 타일.
  private _buildGround() {
    if (!this.grassTiles.length) return;
    this.groundLayer.removeChildren();
    this.pond = this._computePond();
    const { pad, rowMin, rowMax } = this._groundRange();
    for (let col = -pad; col <= this.maxCol + pad; col++) {
      for (let row = rowMin; row <= rowMax; row++) {
        const isPond = this.pond.has(`${col},${row}`);
        const tex = isPond
          ? this.waterTiles[
              Math.floor(hash(col * 2, row * 2) * this.waterTiles.length)
            ]
          : this.grassTiles[
              Math.floor(hash(col * 2 + 1, row * 3 + 1) * this.grassTiles.length)
            ];
        const tile = new Sprite(tex);
        tile.anchor.set(0.5);
        tile.scale.set(GROUND_TILE_SCALE);
        tile.position.set((col - row) * HW, (col + row) * HH);
        this.groundLayer.addChild(tile);
      }
    }
    this.builtW = this.width;
    this.builtH = this.height;
  }

  // 스프라이트의 화면 bbox(밑면 앵커)가 흙밭 영역(row 0~6, col 0~maxCol)과
  // 겹치는지. 네 모서리를 (col,row)로 역변환해 보수적으로 판정(겹치면 배치 제외).
  private _overlapsPlot(wx: number, wy: number, sw: number, sh: number): boolean {
    let minC = Infinity;
    let maxC = -Infinity;
    let minR = Infinity;
    let maxR = -Infinity;
    const corners: Array<[number, number]> = [
      [wx - sw / 2, wy - sh],
      [wx + sw / 2, wy - sh],
      [wx - sw / 2, wy],
      [wx + sw / 2, wy],
    ];
    for (const [px, py] of corners) {
      const c = (px / HW + py / HH) / 2;
      const r = (py / HH - px / HW) / 2;
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
    }
    return (
      maxR >= -0.5 &&
      minR <= 6.5 &&
      maxC >= -0.5 &&
      minC <= this.maxCol + 0.5
    );
  }

  // 밭 위·아래 잔디 여백에 나무·바위·풀숲을 가중치대로 흩뿌린다.
  // 밭 뒤(row<0)는 뒤 레이어(밭에 가려짐), 앞(row>6)은 앞 레이어(밭·작물 위).
  private _buildObjects() {
    if (!Object.keys(this.objTex).length) return;
    this.objectBackLayer.removeChildren();
    this.objectFrontLayer.removeChildren();
    const wsum = OBJ_WEIGHT.reduce((s, w) => s + w[1], 0);
    const rows: number[] = [];
    for (let r = -8; r <= -1; r++) rows.push(r);
    for (let r = 7; r <= 13; r++) rows.push(r);
    for (let col = 0; col <= this.maxCol; col++) {
      for (const br of rows) {
        if (hash(col, br * 7 + 1) < OBJ_FILL) continue;
        if (this.pond.has(`${col},${br}`)) continue;
        // 가중치로 카테고리 선택
        let pick = hash(col * 3 + 1, br * 2) * wsum;
        let cat = OBJ_WEIGHT[0][0];
        for (const [k, w] of OBJ_WEIGHT) {
          if (pick < w) {
            cat = k;
            break;
          }
          pick -= w;
        }
        // 큰 오브젝트가 밭 앞(작물 위)에 오면 작물을 가리므로 덤불로 대체
        const isFront = br > 6;
        if (isFront && BIG_OBJ.has(cat)) cat = "bush";
        const arr = this.objTex[cat];
        if (!arr || !arr.length) continue;
        const tex = arr[Math.floor(hash(col * 5, br * 3) * arr.length)];
        const c = col + (hash(col, br + 0.3) - 0.5);
        const r = br + (hash(col * 5 + 2, br) - 0.5) * 0.9;
        const wx = (c - r) * HW;
        const wy = (c + r) * HH;
        const s = OBJ_SCALE[cat] ?? 0.5;
        // 스프라이트가 흙밭 위를 덮으면(침범) 배치하지 않음
        if (this._overlapsPlot(wx, wy, tex.width * s, tex.height * s)) continue;
        const sp = new Sprite(tex);
        sp.anchor.set(0.5, 1); // 밑면 기준
        sp.scale.set(s);
        sp.position.set(wx, wy);
        sp.zIndex = wy; // 레이어 안에서 앞(아래)이 뒤를 가림
        (isFront ? this.objectFrontLayer : this.objectBackLayer).addChild(sp);
      }
    }
  }

  // 흙밭 — 측면(두께)은 Graphics, 윗면은 흙 텍스처 마름모(없으면 단색 폴백).
  private _buildFloor() {
    const sorted = [...this.cells].sort(
      (a, b) => a.col + a.row - (b.col + b.row),
    );
    this.floor.clear();
    this.soilLayer.removeChildren();
    for (const cell of sorted) {
      const wx = (cell.col - cell.row) * HW;
      const wy = (cell.col + cell.row) * HH;
      this.floor
        .poly([wx, wy - HH + 4, wx + HW, wy + 4, wx, wy + HH + 4, wx - HW, wy + 4])
        .fill(SOIL_SIDE);

      const month = Number(cell.date.slice(5, 7));
      const pal = MONTH_PAL[month % 2];
      const fill = (cell.col + cell.row) % 2 === 0 ? pal.a : pal.b;

      if (this.soilTex) {
        const tile = new Sprite(this.soilTex);
        tile.anchor.set(0.5);
        tile.scale.set(SOIL_SCALE);
        tile.position.set(wx, wy);
        tile.tint = fill;
        this.soilLayer.addChild(tile);
      } else {
        this.floor
          .poly([wx, wy - HH, wx + HW, wy, wx, wy + HH, wx - HW, wy])
          .fill(fill)
          .stroke({ width: 1, color: SOIL_SIDE, alpha: 0.5 });
      }
    }

    const today = this.cells[this.cells.length - 1];
    if (today) {
      const wx = (today.col - today.row) * HW;
      const wy = (today.col + today.row) * HH;
      this.todayBorder
        .clear()
        .poly([wx, wy - HH, wx + HW, wy, wx, wy + HH, wx - HW, wy])
        .stroke({ width: 2.5, color: 0xf5d76e });
    }
  }

  // 완료한 날의 칸에 카테고리마다 작물 1개씩. 각 작물 크기 = 그 카테고리 완료수.
  private _buildCrops() {
    for (const cell of this.cells) {
      const bucket = this.data.get(cell.date);
      if (!bucket || bucket.count <= 0) continue;
      const tags = TAG_ORDER.filter((t) => bucket.byTag[t] > 0);
      if (tags.length === 0) continue;

      const n = tags.length;
      const wx = (cell.col - cell.row) * HW;
      const wy = (cell.col + cell.row) * HH;
      const base = cell.col + cell.row;
      const scaleF = n <= 2 ? 1 : n === 3 ? 0.85 : 0.75;

      tags.forEach((tag, i) => {
        const stage = cropStage(bucket.byTag[tag]);
        if (stage === 0) return;
        const tex = this.cropTex.get(`${tag}:${stage}`);
        const node = tex
          ? this._makeCrop(tex, scaleF)
          : this._makeBush(tag, Math.min(stage, 3) as 1 | 2 | 3);
        const xOff = n === 1 ? 0 : (i - (n - 1) / 2) * (20 / n);
        const yOff = n === 1 ? 0 : i % 2 === 0 ? -1.5 : 1.5;
        node.position.set(wx + xOff, wy + 2 + yOff);
        node.zIndex = base + yOff * 0.01;
        this.bushLayer.addChild(node);
        this.bushes.push({ node, phase: (cell.col * 7 + cell.row + i) % 11 });
      });
    }
  }

  private _makeCrop(tex: Texture, scaleF = 1): Container {
    const sp = new Sprite(tex);
    sp.anchor.set(0.5, 1);
    sp.scale.set(SPRITE_SCALE * scaleF);
    return sp;
  }

  // 폴백 덤불(작물 스프라이트 로드 실패 시).
  private _makeBush(tag: Tag, stage: 1 | 2 | 3): Container {
    const c = new Container();
    const g = new Graphics();
    const col = TAG_COLOR[tag];
    const dk = TAG_DARK[tag];
    const h = BUSH_H[stage];
    const w = BUSH_W[stage];
    g.ellipse(0, 0, w / 2, 2.5).fill(dk);
    const blades = stage + 2;
    for (let k = 0; k < blades; k++) {
      const off = (k - (blades - 1) / 2) * (w / blades);
      g.poly([off - 1.5, 0, off + 1.5, 0, off, -h * (k % 2 ? 0.8 : 1)]).fill(
        k % 2 ? col : dk,
      );
    }
    c.addChild(g);
    return c;
  }

  private _buildMonthLabels() {
    this.labelLayer.removeChildren();
    let prevMonth = "";
    this.cells.forEach((cell, i) => {
      const mm = cell.date.slice(5, 7);
      if (i === 0 || mm !== prevMonth) {
        const wx = (cell.col - cell.row) * HW;
        const wy = (cell.col + cell.row) * HH;
        const label = this._makeMonthLabel(`${Number(mm)}월`);
        label.position.set(wx, wy - HH - 13);
        this.labelLayer.addChild(label);
      }
      prevMonth = mm;
    });
  }

  private _makeMonthLabel(text: string): Container {
    const c = new Container();
    const t = new Text({
      text,
      style: {
        fontFamily: NAME_FONT,
        fontSize: 10,
        fontWeight: "bold",
        fill: 0xffffff,
      },
    });
    t.anchor.set(0.5);
    const w = Math.ceil(t.width) + 10;
    const h = Math.ceil(t.height) + 4;
    const bg = new Graphics()
      .roundRect(-w / 2, -h / 2, w, h, 3)
      .fill({ color: 0x4a3f2f, alpha: 0.85 });
    c.addChild(bg);
    c.addChild(t);
    return c;
  }

  private _updateCamera() {
    this.world.x = this.cx - this.scroll * HW;
    this.world.y = this.cy - this.scroll * HH;
  }

  private _bindPointer() {
    if (!this.app) return;
    const stage = this.app.stage;
    stage.eventMode = "static";
    stage.hitArea = new Rectangle(0, 0, this.width, this.height);

    stage.on("pointerdown", (e: FederatedPointerEvent) => {
      this.dragging = true;
      this.lastX = e.global.x;
      this.movedDist = 0;
      this.opts.onTileTap(null);
    });
    stage.on("pointermove", (e: FederatedPointerEvent) => {
      if (!this.dragging) return;
      const dx = e.global.x - this.lastX;
      this.lastX = e.global.x;
      this.movedDist += Math.abs(dx);
      this.scroll = Math.max(
        this.scrollMin,
        Math.min(this.scrollMax, this.scroll - dx / HW),
      );
      this._updateCamera();
    });
    const end = (e: FederatedPointerEvent) => {
      if (this.dragging && this.movedDist < 6) this._handleTap(e);
      this.dragging = false;
    };
    stage.on("pointerup", end);
    stage.on("pointerupoutside", end);
  }

  private _handleTap(e: FederatedPointerEvent) {
    const wx = e.global.x - this.world.x;
    const wy = e.global.y - this.world.y;
    const a = wx / HW; // col - row
    const b = wy / HH; // col + row
    const col = Math.round((a + b) / 2);
    const row = Math.round((b - a) / 2);
    const cell = this.cellByKey.get(`${col},${row}`);
    if (!cell) {
      this.opts.onTileTap(null);
      return;
    }
    const bucket = this.data.get(cell.date);
    this.opts.onTileTap({
      date: cell.date,
      count: bucket?.count ?? 0,
      byTag: bucket?.byTag ?? { STR: 0, INT: 0, EMO: 0, FIN: 0, LIV: 0 },
      screenX: e.global.x,
      screenY: e.global.y,
    });
  }

  private _startTicker() {
    if (!this.app) return;
    this.app.ticker.add((ticker) => {
      this.elapsed += ticker.deltaMS / 1000;
      const t = this.elapsed;
      for (const b of this.bushes) {
        b.node.rotation = Math.sin(t * 1.7 + b.phase) * 0.05;
      }
    });
  }

  resize(width: number, height: number) {
    if (!this.app || width === 0 || height === 0) return;
    this.width = width;
    this.height = height;
    this.app.renderer.resize(width, height);
    if (this.app.stage.hitArea instanceof Rectangle) {
      this.app.stage.hitArea.width = width;
      this.app.stage.hitArea.height = height;
    }
    // 캔버스가 커지면 잔디 바닥을 더 넓게 다시 채운다(양끝 빈 배경 방지).
    if (width > this.builtW || height > this.builtH) this._buildGround();
    this._updateCamera();
  }

  destroy() {
    this.app?.destroy(false, { children: true });
    this.app = null;
  }
}
