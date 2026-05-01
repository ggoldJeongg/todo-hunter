// 충돌 마스크 — 흰색 영역만 걸어다닐 수 있음
// 사용법:
//   await loadCollisionMask("/images/backgrounds/square_mask.png");
//   if (isWalkable(xPct, yPct)) { ... }

let maskImage: HTMLImageElement | null = null;
let maskCanvas: HTMLCanvasElement | null = null;
let maskCtx: CanvasRenderingContext2D | null = null;
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

// xPct, yPct: 0~100 (맵 % 좌표)
export function isWalkable(xPct: number, yPct: number): boolean {
  // 마스크 로딩 전엔 통과 허용 (UX 깨지지 않도록)
  if (!maskLoaded || !maskCtx || !maskImage) return true;

  const px = Math.floor((xPct / 100) * maskImage.width);
  const py = Math.floor((yPct / 100) * maskImage.height);

  if (px < 0 || py < 0 || px >= maskImage.width || py >= maskImage.height) {
    return false;
  }

  const data = maskCtx.getImageData(px, py, 1, 1).data;
  // R 채널이 임계값 이상이면 통과 (흰색 ≈ 255, 검정 ≈ 0)
  return data[0] > 128;
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
  stepPct = 0.5
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
    if (!isWalkable(x, y)) break;
    lastSafeX = x;
    lastSafeY = y;
  }

  return { x: lastSafeX, y: lastSafeY };
}
