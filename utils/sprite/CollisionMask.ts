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
