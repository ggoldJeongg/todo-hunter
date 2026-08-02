// 충돌 마스크 — 흰색 영역만 걸어다닐 수 있음
// 사용법:
//   await loadCollisionMask("/images/backgrounds/square_mask.png");
//   if (isWalkable(xPct, yPct)) { ... }

let maskImage: HTMLImageElement | null = null;
let maskCanvas: HTMLCanvasElement | null = null;
let maskCtx: CanvasRenderingContext2D | null = null;
let maskData: Uint8ClampedArray | null = null;
let maskLoaded = false;
let loadingPromise: Promise<void> | null = null;

export function loadCollisionMask(src: string): Promise<void> {
  if (loadingPromise) return loadingPromise;
  if (maskLoaded) return Promise.resolve();

  loadingPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("Failed to create mask context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      maskImage = img;
      maskCanvas = canvas;
      maskCtx = ctx;
      maskData = ctx.getImageData(0, 0, img.width, img.height).data;
      maskLoaded = true;
      gridCache = null; // 마스크가 바뀌면 길찾기 격자 무효화
      resolve();
    };
    img.onerror = () => reject(new Error(`Failed to load mask: ${src}`));
    img.src = src;
  });

  return loadingPromise;
}

export function isCollisionMaskLoaded(): boolean {
  return maskLoaded;
}

// 걸어갈 수 있는 픽셀 판정.
// square_mask.png는 순수 흑백 마스크가 아니라 "컬러 배경 위에 흰색 길만 덧칠"한 이미지다.
// 따라서 빨강 채널만 보면 노란 차양막/과일/하늘 등 밝은 컬러도 통과해버린다.
// → R·G·B 세 채널이 모두 밝을 때(=덧칠한 흰색)만 walkable로 본다. (가장자리 AA 허용 위해 200)
const WHITE_MIN = 200;
function isWhiteAt(index: number): boolean {
  if (!maskData) return false;
  return (
    maskData[index] > WHITE_MIN &&
    maskData[index + 1] > WHITE_MIN &&
    maskData[index + 2] > WHITE_MIN &&
    maskData[index + 3] > 128
  );
}

// xPct, yPct: 0~100 (맵 % 좌표)
export function isWalkable(xPct: number, yPct: number): boolean {
  // 마스크 로딩 전엔 통과 허용 (UX 깨지지 않도록)
  if (!maskLoaded || !maskData || !maskImage) return true;

  const px = Math.floor((xPct / 100) * maskImage.width);
  const py = Math.floor((yPct / 100) * maskImage.height);

  if (px < 0 || py < 0 || px >= maskImage.width || py >= maskImage.height) {
    return false;
  }

  const index = (py * maskImage.width + px) * 4;
  return isWhiteAt(index);
}

export interface CollisionFootprint {
  halfWidthPct: number;
  heightPct: number;
}

export function isFootprintWalkable(
  xPct: number,
  yPct: number,
  footprint: CollisionFootprint
): boolean {
  if (!maskLoaded || !maskData || !maskImage) return true;

  const left = Math.floor(
    ((xPct - footprint.halfWidthPct) / 100) * maskImage.width
  );
  const right = Math.ceil(
    ((xPct + footprint.halfWidthPct) / 100) * maskImage.width
  );
  const top = Math.floor(((yPct - footprint.heightPct) / 100) * maskImage.height);
  const bottom = Math.ceil((yPct / 100) * maskImage.height);

  if (
    left < 0 ||
    top < 0 ||
    right >= maskImage.width ||
    bottom >= maskImage.height
  ) {
    return false;
  }

  for (let py = top; py <= bottom; py++) {
    for (let px = left; px <= right; px++) {
      const index = (py * maskImage.width + px) * 4;
      if (!isWhiteAt(index)) return false;
    }
  }

  return true;
}

// (x, y) 주변에서 가장 가까운 걸어갈 수 있는 점을 나선형으로 탐색
// NPC 초기 배치를 마스크 안쪽으로 보정할 때 사용
export function findNearestWalkable(
  xPct: number,
  yPct: number,
  maxRadiusPct = 30
): { x: number; y: number } {
  if (!maskLoaded) return { x: xPct, y: yPct };
  if (isWalkable(xPct, yPct)) return { x: xPct, y: yPct };

  const stepPct = 0.5;
  for (let r = stepPct; r <= maxRadiusPct; r += stepPct) {
    // 8방향 + 점점 더 촘촘하게
    const samples = Math.max(8, Math.floor((2 * Math.PI * r) / stepPct));
    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * Math.PI * 2;
      const tx = xPct + Math.cos(angle) * r;
      const ty = yPct + Math.sin(angle) * r;
      if (isWalkable(tx, ty)) return { x: tx, y: ty };
    }
  }
  return { x: xPct, y: yPct };
}

// 시작 → 목표 직선상 충돌 직전까지의 안전한 위치 반환
// 벽에 미끄러지듯 멈추는 효과
export function findReachablePoint(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  stepPct = 0.5,
  footprint?: CollisionFootprint
): { x: number; y: number } {
  if (!maskLoaded) return { x: toX, y: toY };

  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.01) return { x: fromX, y: fromY };

  const steps = Math.ceil(dist / stepPct);
  let lastSafeX = fromX;
  let lastSafeY = fromY;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = fromX + dx * t;
    const y = fromY + dy * t;
    const walkable = footprint
      ? isFootprintWalkable(x, y, footprint)
      : isWalkable(x, y);
    if (!walkable) break;
    lastSafeX = x;
    lastSafeY = y;
  }

  return { x: lastSafeX, y: lastSafeY };
}

// ===== A* 길찾기 =====
// 마스크를 격자로 바꿔 A*로 시작→목표 최단 경로를 찾고, 직선 구간을 합쳐(스무딩)
// 자연스러운 waypoint 목록(맵 %)을 돌려준다. 장애물을 자동으로 돌아간다.

interface Point {
  x: number;
  y: number;
}

// 격자 해상도. 월드(1440×960, 종횡비 1.5)에서 셀이 대략 정사각(≈15×15px)이 되도록.
const PATH_COLS = 96;
const PATH_ROWS = 64;

let gridCache:
  | { cols: number; rows: number; fpKey: string; cells: Uint8Array }
  | null = null;

/** 각 셀 중심이 걸을 수 있는지(footprint 포함) 미리 계산한 격자. 마스크 로드 후 1회 캐시. */
function getGrid(
  cols: number,
  rows: number,
  footprint?: CollisionFootprint
): Uint8Array {
  const fpKey = footprint
    ? `${footprint.halfWidthPct.toFixed(3)}:${footprint.heightPct.toFixed(3)}`
    : "point";
  if (
    gridCache &&
    gridCache.cols === cols &&
    gridCache.rows === rows &&
    gridCache.fpKey === fpKey
  ) {
    return gridCache.cells;
  }
  const cells = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const yPct = ((r + 0.5) / rows) * 100;
    for (let c = 0; c < cols; c++) {
      const xPct = ((c + 0.5) / cols) * 100;
      const ok = footprint
        ? isFootprintWalkable(xPct, yPct, footprint)
        : isWalkable(xPct, yPct);
      cells[r * cols + c] = ok ? 1 : 0;
    }
  }
  gridCache = { cols, rows, fpKey, cells };
  return cells;
}

/** 막힌 셀 주변에서 가장 가까운 걸을 수 있는 셀을 찾는다(사각 링 확장). */
function nearestCell(
  cells: Uint8Array,
  cols: number,
  rows: number,
  c0: number,
  r0: number
): [number, number] | null {
  if (cells[r0 * cols + c0]) return [c0, r0];
  const maxRad = Math.max(cols, rows);
  for (let rad = 1; rad <= maxRad; rad++) {
    for (let dc = -rad; dc <= rad; dc++) {
      for (let dr = -rad; dr <= rad; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue; // 링 테두리만
        const c = c0 + dc;
        const r = r0 + dr;
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        if (cells[r * cols + c]) return [c, r];
      }
    }
  }
  return null;
}

/** 이진 최소 힙 (A* open set). 중복 push + closed 검사(lazy deletion)로 감소키 대체. */
class MinHeap {
  private node: number[] = [];
  private pri: number[] = [];
  get size() {
    return this.node.length;
  }
  push(node: number, pri: number) {
    this.node.push(node);
    this.pri.push(pri);
    let i = this.node.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.pri[p] <= this.pri[i]) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): number {
    const top = this.node[0];
    const last = this.node.length - 1;
    this.node[0] = this.node[last];
    this.pri[0] = this.pri[last];
    this.node.pop();
    this.pri.pop();
    let i = 0;
    const n = this.node.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let s = i;
      if (l < n && this.pri[l] < this.pri[s]) s = l;
      if (r < n && this.pri[r] < this.pri[s]) s = r;
      if (s === i) break;
      this.swap(i, s);
      i = s;
    }
    return top;
  }
  private swap(a: number, b: number) {
    const tn = this.node[a];
    this.node[a] = this.node[b];
    this.node[b] = tn;
    const tp = this.pri[a];
    this.pri[a] = this.pri[b];
    this.pri[b] = tp;
  }
}

// 8방향 옥타일 휴리스틱(대각선 √2). admissible → 최단 보장.
function octile(dc: number, dr: number): number {
  const dx = Math.abs(dc);
  const dy = Math.abs(dr);
  return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

/** a→b 직선이 전부 걸을 수 있는지(스무딩용 가시선 검사). */
function hasLineOfSight(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  footprint?: CollisionFootprint,
  step = 0.5
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const n = Math.max(1, Math.ceil(dist / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = ax + dx * t;
    const y = ay + dy * t;
    const ok = footprint
      ? isFootprintWalkable(x, y, footprint)
      : isWalkable(x, y);
    if (!ok) return false;
  }
  return true;
}

/** 격자 경로의 불필요한 꺾임을 가시선으로 합쳐 직선화(string pulling). */
function smoothPath(pts: Point[], footprint?: CollisionFootprint): Point[] {
  if (pts.length <= 2) return pts;
  const out: Point[] = [pts[0]];
  let anchor = 0;
  for (let i = 2; i < pts.length; i++) {
    if (!hasLineOfSight(pts[anchor].x, pts[anchor].y, pts[i].x, pts[i].y, footprint)) {
      out.push(pts[i - 1]);
      anchor = i - 1;
    }
  }
  const last = pts[pts.length - 1];
  const back = out[out.length - 1];
  if (Math.hypot(back.x - last.x, back.y - last.y) > 0.01) out.push(last);
  return out;
}

/**
 * (fromX,fromY) → (toX,toY) A* 경로를 맵 % waypoint 목록으로 반환.
 * 목표가 막힌 곳이면 가장 가까운 걸을 수 있는 지점으로. 실패 시 null.
 * 반환[0]은 시작점, 마지막은 도착점. 장애물을 자동 우회한다.
 */
export function findPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  footprint?: CollisionFootprint
): Point[] | null {
  if (!maskLoaded) return null;
  const cols = PATH_COLS;
  const rows = PATH_ROWS;
  const cells = getGrid(cols, rows, footprint);
  const idx = (c: number, r: number) => r * cols + c;
  const toCol = (x: number) =>
    Math.min(cols - 1, Math.max(0, Math.floor((x / 100) * cols)));
  const toRow = (y: number) =>
    Math.min(rows - 1, Math.max(0, Math.floor((y / 100) * rows)));
  const cellX = (c: number) => ((c + 0.5) / cols) * 100;
  const cellY = (r: number) => ((r + 0.5) / rows) * 100;

  // 시작 셀 (막혔으면 가장 가까운 걸을 수 있는 셀)
  let sc = toCol(fromX);
  let sr = toRow(fromY);
  if (!cells[idx(sc, sr)]) {
    const n = nearestCell(cells, cols, rows, sc, sr);
    if (!n) return null;
    [sc, sr] = n;
  }
  // 목표 셀 (클릭 지점이 막혔으면 가장 가까운 걸을 수 있는 %로 보정)
  const goalPt = findNearestWalkable(toX, toY);
  let gc = toCol(goalPt.x);
  let gr = toRow(goalPt.y);
  if (!cells[idx(gc, gr)]) {
    const n = nearestCell(cells, cols, rows, gc, gr);
    if (!n) return null;
    [gc, gr] = n;
  }
  if (sc === gc && sr === gr) {
    return [
      { x: fromX, y: fromY },
      { x: goalPt.x, y: goalPt.y },
    ];
  }

  const N = cols * rows;
  const g = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const start = idx(sc, sr);
  const goal = idx(gc, gr);
  g[start] = 0;
  const heap = new MinHeap();
  heap.push(start, octile(sc - gc, sr - gr));

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  let found = false;
  let guard = 0;
  // 상한은 안전장치일 뿐(일관 휴리스틱이라 실제로는 훨씬 적게 돎). 경로를 놓치지 않게 넉넉히.
  while (heap.size && guard++ < N * 16) {
    const cur = heap.pop();
    if (cur === goal) {
      found = true;
      break;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cc = cur % cols;
    const cr = (cur / cols) | 0;
    for (const [dx, dy] of dirs) {
      const nc = cc + dx;
      const nr = cr + dy;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const ni = idx(nc, nr);
      if (!cells[ni] || closed[ni]) continue;
      // 대각선은 모서리 관통 금지 (양쪽 직교 셀도 걸을 수 있어야 함)
      if (dx !== 0 && dy !== 0) {
        if (!cells[idx(cc + dx, cr)] || !cells[idx(cc, cr + dy)]) continue;
      }
      const cost = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
      const ng = g[cur] + cost;
      if (ng < g[ni]) {
        g[ni] = ng;
        came[ni] = cur;
        heap.push(ni, ng + octile(nc - gc, nr - gr));
      }
    }
  }
  if (!found) return null;

  // 경로 역추적 → % 좌표. 시작/끝은 실제 좌표로 교체.
  const chain: number[] = [];
  for (let c = goal; c !== -1; c = came[c]) chain.push(c);
  chain.reverse();
  const pts: Point[] = chain.map((i) => ({
    x: cellX(i % cols),
    y: cellY((i / cols) | 0),
  }));
  pts[0] = { x: fromX, y: fromY };
  pts[pts.length - 1] = { x: goalPt.x, y: goalPt.y };

  return smoothPath(pts, footprint);
}
