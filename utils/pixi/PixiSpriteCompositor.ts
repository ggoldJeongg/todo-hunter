import {
  Assets,
  Texture,
  Rectangle,
  Container,
  Sprite,
  RenderTexture,
  type Renderer,
} from "pixi.js";

const DEFAULT_COLS = 8;
const DEFAULT_ROWS = 8;
const DEFAULT_FRAME_SIZE = 64;

export interface SpriteSheetLayer {
  texture: Texture;
  cols: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
}

/** 여러 레이어 이미지를 로드하고 nearest 스케일모드 적용 */
export async function loadSpriteLayers(
  paths: string[]
): Promise<SpriteSheetLayer[]> {
  const layers: SpriteSheetLayer[] = [];

  for (const path of paths) {
    const texture = await Assets.load<Texture>(path);
    texture.source.scaleMode = "nearest";

    layers.push({
      texture,
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS,
      frameWidth: DEFAULT_FRAME_SIZE,
      frameHeight: DEFAULT_FRAME_SIZE,
    });
  }

  return layers;
}

/** 단일 이미지 텍스처 로드 (몬스터 프레임 등) */
export async function loadTexture(path: string): Promise<Texture> {
  const texture = await Assets.load<Texture>(path);
  texture.source.scaleMode = "nearest";
  return texture;
}

/** 여러 레이어의 특정 프레임을 합성하여 RenderTexture에 그림 */
export function compositeFrame(
  renderer: Renderer,
  layers: SpriteSheetLayer[],
  frameIndex: number,
  size: number,
  target: RenderTexture
): void {
  const container = new Container();

  for (const layer of layers) {
    const col = frameIndex % layer.cols;
    const row = Math.floor(frameIndex / layer.cols);
    const sx = col * layer.frameWidth;
    const sy = row * layer.frameHeight;

    const frameTexture = new Texture({
      source: layer.texture.source,
      frame: new Rectangle(sx, sy, layer.frameWidth, layer.frameHeight),
    });

    const sprite = new Sprite(frameTexture);
    sprite.width = size;
    sprite.height = size;
    container.addChild(sprite);
  }

  renderer.render({ container, target });
  container.destroy({ children: true });
}

/** RenderTexture를 생성 (재사용 가능) */
export function createRenderTexture(
  renderer: Renderer,
  size: number
): RenderTexture {
  return RenderTexture.create({ width: size, height: size });
}
