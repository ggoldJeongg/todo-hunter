import {
  Application,
  Container,
  Graphics,
  Rectangle,
  Text,
  type FederatedPointerEvent,
} from "pixi.js";
import {
  buildGardenGrid,
  bushStage,
  dominantCategory,
  type DayBucket,
  type GardenCell,
  type Tag,
} from "@/utils/garden";

// 아이소 다이아몬드 반폭/반높이 (true isometric, 화면 비율 2:1)
const HW = 22;
const HH = 11;

const SKY = 0xaee0f0;
const SOIL_SIDE = 0x5a3a22;
// 월별 흙 색 — 홀수 월(어두운 갈색) / 짝수 월(밝은 탠)으로 띠를 만들어 월 경계를 보이게.
// 각 월 안에서는 (col+row) 체커로 a/b 교차.
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

// 덤불 단계(1~3)별 높이/폭 — 스프라이트 교체 시 이 값 대신 텍스처 크기 사용
const BUSH_H = [0, 8, 12, 16];
const BUSH_W = [0, 7, 10, 13];

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
 * 성장 정원 — 진짜 아이소메트릭 다이아몬드 365칸.
 * 바닥은 Pixi Graphics(정적), 덤불은 플레이스홀더 Graphics(추후 스프라이트 교체).
 * 드래그 시 시간축(주)을 따라 대각선으로 카메라가 이동한다.
 */
export class PixiGardenScene {
  private app: Application | null = null;
  private world = new Container();
  private floor = new Graphics();
  private bushLayer = new Container();
  private todayBorder = new Graphics();
  private labelLayer = new Container();

  private cells: GardenCell[] = [];
  private cellByKey = new Map<string, GardenCell>();
  private bushes: BushNode[] = [];
  private data!: Map<string, DayBucket>;
  private opts!: GardenSceneOptions;

  private width = 0;
  private height = 0;
  private maxCol = 0;
  private scroll = 0; // 중심에 둘 주(week) 인덱스
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
    this.scroll = this.maxCol; // 열면 오늘(가장 최근)

    this.app = new Application();
    await this.app.init({
      canvas,
      width,
      height,
      background: SKY,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    });

    this.bushLayer.sortableChildren = true;
    this.world.addChild(this.floor);
    this.world.addChild(this.bushLayer);
    this.world.addChild(this.todayBorder);
    this.world.addChild(this.labelLayer);
    this.app.stage.addChild(this.world);

    this._buildFloor();
    this._buildBushes();
    this._buildMonthLabels();
    this._updateCamera();
    this._bindPointer();
    this._startTicker();
  }

  // 365칸 다이아몬드를 하나의 Graphics 에 뒤→앞 순서로 그림(정적)
  private _buildFloor() {
    const sorted = [...this.cells].sort(
      (a, b) => a.col + a.row - (b.col + b.row),
    );
    this.floor.clear();
    for (const cell of sorted) {
      const wx = (cell.col - cell.row) * HW;
      const wy = (cell.col + cell.row) * HH;
      // 두께(측면)
      this.floor
        .poly([wx, wy - HH + 4, wx + HW, wy + 4, wx, wy + HH + 4, wx - HW, wy + 4])
        .fill(SOIL_SIDE);
      // 윗면 — 월별 팔레트(홀/짝수 월)로 띠, 월 안에서 체커 교차
      const month = Number(cell.date.slice(5, 7));
      const pal = MONTH_PAL[month % 2];
      const fill = (cell.col + cell.row) % 2 === 0 ? pal.a : pal.b;
      this.floor
        .poly([wx, wy - HH, wx + HW, wy, wx, wy + HH, wx - HW, wy])
        .fill(fill)
        .stroke({ width: 1, color: SOIL_SIDE, alpha: 0.5 });
    }

    // 오늘 칸 테두리
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

  // 각 달의 첫 칸(또는 범위 시작 칸) 위에 "N월" 라벨. world에 속해 스크롤 따라 이동.
  private _buildMonthLabels() {
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
      style: { fontFamily: NAME_FONT, fontSize: 10, fontWeight: "bold", fill: 0xffffff },
    });
    t.anchor.set(0.5);
    const padX = 5;
    const padY = 2;
    const w = Math.ceil(t.width) + padX * 2;
    const h = Math.ceil(t.height) + padY * 2;
    const bg = new Graphics()
      .roundRect(-w / 2, -h / 2, w, h, 3)
      .fill({ color: 0x4a3f2f, alpha: 0.85 });
    c.addChild(bg);
    c.addChild(t);
    return c;
  }

  private _buildBushes() {
    for (const cell of this.cells) {
      const bucket = this.data.get(cell.date);
      if (!bucket || bucket.count <= 0) continue;
      const stage = bushStage(bucket.count);
      if (stage === 0) continue;
      const tag = dominantCategory(bucket.byTag) ?? "LIV";
      const node = this._makeBush(tag, stage);
      const wx = (cell.col - cell.row) * HW;
      const wy = (cell.col + cell.row) * HH;
      node.position.set(wx, wy - 1);
      node.zIndex = cell.col + cell.row;
      this.bushLayer.addChild(node);
      this.bushes.push({ node, phase: (cell.col * 7 + cell.row) % 11 });
    }
  }

  // 플레이스홀더 덤불(삼각 잎 묶음). 추후 Sprite(텍스처)로 교체.
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
      this.opts.onTileTap(null); // 기존 팝오버 닫기
    });
    stage.on("pointermove", (e: FederatedPointerEvent) => {
      if (!this.dragging) return;
      const dx = e.global.x - this.lastX;
      this.lastX = e.global.x;
      this.movedDist += Math.abs(dx);
      this.scroll = Math.max(
        0,
        Math.min(this.maxCol, this.scroll - dx / HW),
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
    this._updateCamera();
  }

  destroy() {
    this.app?.destroy(false, { children: true });
    this.app = null;
  }
}
