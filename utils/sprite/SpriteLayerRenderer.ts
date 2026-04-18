const DEFAULT_COLS = 8;
const DEFAULT_ROWS = 8;
const DEFAULT_FRAME_SIZE = 64;

export interface SpriteSheet {
  image: HTMLImageElement;
  cols: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
}

export interface LayerConfig {
  src: string;
  sheet?: SpriteSheet;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function loadLayers(
  configs: LayerConfig[]
): Promise<SpriteSheet[]> {
  return Promise.all(
    configs.map(async (config) => {
      const image = await loadImage(config.src);
      return {
        image,
        cols: DEFAULT_COLS,
        rows: DEFAULT_ROWS,
        frameWidth: DEFAULT_FRAME_SIZE,
        frameHeight: DEFAULT_FRAME_SIZE,
      };
    })
  );
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteSheet,
  frameIndex: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const col = frameIndex % sheet.cols;
  const row = Math.floor(frameIndex / sheet.cols);
  const sx = col * sheet.frameWidth;
  const sy = row * sheet.frameHeight;

  ctx.drawImage(
    sheet.image,
    sx,
    sy,
    sheet.frameWidth,
    sheet.frameHeight,
    dx,
    dy,
    dw,
    dh
  );
}

export function renderLayers(
  ctx: CanvasRenderingContext2D,
  sheets: SpriteSheet[],
  frameIndex: number,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  for (const sheet of sheets) {
    drawFrame(ctx, sheet, frameIndex, 0, 0, canvasWidth, canvasHeight);
  }
}
