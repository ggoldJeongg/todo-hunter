import {
  Application,
  Container,
  Sprite,
  Graphics,
  Text,
  Assets,
  Rectangle,
  Texture,
  type FederatedPointerEvent,
} from "pixi.js";
import { PixiCharacter } from "./PixiCharacter";
import { loadSpriteStrip } from "./PixiSpriteCompositor";
import {
  SWORDSMAN_CLIPS,
  SWORDSMAN_SHEET,
  loadSpriteImage,
} from "@/utils/sprite/swordsman";
import { useSquareStore, type Direction } from "@/utils/stores/squareStore";
import { useUserStore } from "@/utils/stores/userStore";
import {
  loadCollisionMask,
  findReachablePoint,
  findNearestWalkable,
  findPath,
} from "@/utils/sprite/CollisionMask";
import { STATUS } from "@/constants/status";
import {
  DEFAULT_SQUARE_CONFIG,
  type SquareMapData,
} from "@/utils/square/squareMap";

// 배경/충돌은 맵 데이터(map.config)에서 온다.
// 반응형: 맵은 뷰포트와 무관한 "고정 월드"(WORLD_H × aspect)로 정의하고,
// 카메라가 world.scale(줌)으로 확대한다 → 어느 기기든 오브젝트 비율이 동일.
// 줌 = 화면높이 / WORLD_H (높이 맞춤). 데스크톱은 좌우를 더 보고, 월드보다 넓으면 레터박스.
const WORLD_H = 960; // 고정 월드 높이(px). 에디터 PREVIEW_MAP_WIDTH 와 짝(WORLD_H*aspect).
const MOVE_SPEED = 25; // %/초

// NPC 상호작용: NPC 앞(플레이어 쪽)에서 멈추는 거리(맵 %).
// 이 거리 이내면 걷지 않고 즉시 상호작용한다.
const INTERACT_STAND_GAP = 5;

// 캐릭터 표시 크기(px)
// swordsman은 프레임(100px) 안 캐릭터가 ~1/4라 큰 값이 필요. NPC는 프레임을 꽉 채움.
// → 둘의 "보이는 크기" 차이를 줄이려고 플레이어는 키우고 NPC는 줄임.
const PLAYER_DISPLAY = 280; // swordsman 프레임 표시 크기 (보이는 캐릭터 ≈ 67px)
const NPC_DEFAULT_SIZE = 96; // NPC 프레임 표시 크기 (보이는 캐릭터 ≈ 84px)

// 플레이어 발자국(footprint) 충돌 박스 (px) — CSS 버전과 동일.
// 점 1개가 아닌 발밑 박스로 검사해 몸이 벽에 겹치는 것을 방지.
const PLAYER_FOOTPRINT_WIDTH = 36;
const PLAYER_FOOTPRINT_HEIGHT = 14;

// 원근감(깊이 스케일): 발-y가 화면 아래(앞)일수록 크게, 위(뒤)일수록 작게.
// 걸을 수 있는 y 범위(대략 48~100%)를 스케일 0.9~1.2로 매핑.
const DEPTH_Y_FAR = 48;
const DEPTH_Y_NEAR = 100;
const DEPTH_S_FAR = 0.9;
const DEPTH_S_NEAR = 1.2;

const NAME_FONT = "Galmuri11, system-ui, sans-serif";

export interface SquareSceneOptions {
  /** 광장 맵 데이터 (배경/충돌/오브젝트 배치). loadSquareMap()으로 로드해 전달. */
  map: SquareMapData;
  onPlayerClick: () => void;
  onNpcClick: (action: "rest" | "roulette" | undefined) => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(v, max));

/** 발-y(맵 %)를 원근 스케일로 변환. 앞(아래)=크게, 뒤(위)=작게. */
function depthScale(yPct: number): number {
  const t = clamp((yPct - DEPTH_Y_FAR) / (DEPTH_Y_NEAR - DEPTH_Y_FAR), 0, 1);
  return DEPTH_S_FAR + (DEPTH_S_NEAR - DEPTH_S_FAR) * t;
}

/** 둥근 사각형 배경 + 가운데 정렬 텍스트로 이루어진 "알약" UI. x=0 기준 가로 중앙. */
function makePill(opts: {
  text: string;
  bgColor: number;
  bgAlpha?: number;
  textColor: number;
  fontSize?: number;
  bold?: boolean;
}): { node: Container; w: number; h: number } {
  const fontSize = opts.fontSize ?? 11;
  const node = new Container();
  const label = new Text({
    text: opts.text,
    style: {
      fontFamily: NAME_FONT,
      fontSize,
      fontWeight: opts.bold ? "bold" : "normal",
      fill: opts.textColor,
    },
  });
  label.anchor.set(0.5);

  const padX = 7;
  const padY = 3;
  const w = Math.ceil(label.width) + padX * 2;
  const h = Math.ceil(label.height) + padY * 2;

  const bg = new Graphics();
  bg.roundRect(-w / 2, 0, w, h, h / 2);
  bg.fill({ color: opts.bgColor, alpha: opts.bgAlpha ?? 1 });

  label.position.set(0, h / 2);

  node.addChild(bg);
  node.addChild(label);
  return { node, w, h };
}

/** 알약 여러 개를 세로로 쌓은 컬럼. 반환 컨테이너의 (0,0)은 컬럼의 좌상단-중앙. */
function makeColumn(pills: { node: Container; w: number; h: number }[], gap = 2) {
  const col = new Container();
  let y = 0;
  for (const p of pills) {
    p.node.y = y;
    col.addChild(p.node);
    y += p.h + gap;
  }
  return { col, height: y > 0 ? y - gap : 0 };
}

/**
 * 스프라이트 프레임 안에서 실제 그림(불투명 픽셀)의 가로 중심이 프레임 중심에서
 * 얼마나 벗어나 있는지(px, 표시 크기 기준)를 측정.
 * 픽셀아트가 32px 프레임 안에서 살짝 치우쳐 있어도 이름표를 그림 중앙에 맞추기 위함.
 */
function frameArtCenterOffsetPx(
  img: HTMLImageElement,
  frameSize: number,
  frameIndex: number,
  displaySize: number
): number {
  const canvas = document.createElement("canvas");
  canvas.width = frameSize;
  canvas.height = frameSize;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    frameIndex * frameSize,
    0,
    frameSize,
    frameSize,
    0,
    0,
    frameSize,
    frameSize
  );
  const data = ctx.getImageData(0, 0, frameSize, frameSize).data;
  let minX = frameSize;
  let maxX = -1;
  for (let y = 0; y < frameSize; y++) {
    for (let x = 0; x < frameSize; x++) {
      if (data[(y * frameSize + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  if (maxX < 0) return 0;
  const artCenter = (minX + maxX) / 2;
  const frameCenter = (frameSize - 1) / 2;
  return (artCenter - frameCenter) * (displaySize / frameSize);
}

/** 가로 스트립 텍스처를 정사각 프레임 단위로 슬라이스 (같은 source 공유) */
function sliceStrip(base: Texture, frameSize: number, count: number): Texture[] {
  const out: Texture[] = [];
  for (let i = 0; i < count; i++) {
    out.push(
      new Texture({
        source: base.source,
        frame: new Rectangle(i * frameSize, 0, frameSize, frameSize),
      })
    );
  }
  return out;
}

export class PixiSquareScene {
  private app: Application | null = null;
  private world = new Container();
  private bg: Sprite | null = null;

  private player: PixiCharacter | null = null;
  private playerNameTag: Container | null = null;
  private playerTimeText: Text | null = null;

  private map: SquareMapData | null = null;
  private objectContainers: Container[] = [];
  // 스프라이트 시트 애니메이션 (가로 스트립 프레임 순환) — NPC/prop 공용
  private npcAnims: {
    sprite: Sprite;
    frames: Texture[];
    idx: number;
    elapsed: number;
    rate: number;
  }[] = [];
  // 배치된 오브젝트들의 현재 위치(맵 %) — map.objects 와 인덱스 정렬
  private objectPcts: { x: number; y: number }[] = [];
  // 오브젝트별 "걷는 길로 스냅할지" 여부 — NPC=true, prop(장애물)=false
  private objectSnap: boolean[] = [];

  // 앰비언트 말풍선: NPC별 대사 + 타이머 상태
  private clock = 0; // 누적 시간(ms)
  private npcBubbles: {
    node: Container; // NPC 컨테이너 (말풍선을 자식으로 붙임)
    size: number;
    tagX: number; // 이름표와 같은 가로 정렬
    lines: string[];
    bubble: Container | null;
    next: number; // 다음 대사 시작 시각(clock)
    until: number; // 현재 대사 숨길 시각(clock)
    last: number; // 직전 대사 인덱스(연속 반복 방지)
  }[] = [];

  private width = 0;
  private height = 0;

  // 현재 캐릭터 위치 (맵 %)
  private animPos = { x: 50, y: 70 };

  // A* 경로(맵 % waypoint 목록)와 현재 진행 인덱스. 비어 있으면 정지.
  private path: { x: number; y: number }[] = [];
  private pathIndex = 0;

  private opts: SquareSceneOptions | null = null;
  private unsubscribe: (() => void) | null = null;
  private lastTimeSec = -1;
  private lastRunning = false;

  // NPC까지 걸어간 뒤 도착하면 발동할 상호작용. (x,y)는 바라볼 NPC 위치(맵 %).
  private pendingInteraction:
    | { action: "rest" | "roulette" | undefined; x: number; y: number }
    | null = null;

  private get config() {
    return this.map?.config ?? DEFAULT_SQUARE_CONFIG;
  }
  // 고정 월드 크기 (뷰포트와 무관). 카메라가 world.scale 로 확대한다.
  private get mapWidth() {
    return WORLD_H * this.config.aspect;
  }
  private get mapHeight() {
    return WORLD_H;
  }
  private pctToPxX(p: number) {
    return (p / 100) * this.mapWidth;
  }
  private pctToPxY(p: number) {
    return (p / 100) * this.mapHeight;
  }

  async init(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    opts: SquareSceneOptions
  ) {
    this.width = width;
    this.height = height;
    this.opts = opts;
    this.map = opts.map;
    this.animPos = { ...useSquareStore.getState().position };
    // 오브젝트 초기 위치/스냅 여부를 맵 데이터에서 파생
    this.objectPcts = this.map.objects.map((o) => ({ x: o.x, y: o.y }));
    this.objectSnap = this.map.objects.map((o) => o.kind === "npc");

    this.app = new Application();
    await this.app.init({
      canvas,
      width,
      height,
      background: 0x3a2814,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    });

    this.app.stage.addChild(this.world);
    // Y축 깊이 정렬(painter's algorithm): 자식들을 zIndex(=발의 월드 y) 순으로 그린다.
    // 발이 화면 아래(y 큼)일수록 나중에(위에) 그려져 앞에 있는 것처럼 보인다.
    this.world.sortableChildren = true;

    // 바닥(타일맵)은 에디터에서 PNG로 구워 config.background 로 쓴다.
    // 게임은 배경 이미지 + 오브젝트만 렌더한다.
    await this._buildBackground();
    await this._buildPlayer();
    await this._buildObjects();

    // 충돌 마스크 로드 후 오브젝트(NPC) + 플레이어 위치를 걸어갈 수 있는 점으로 보정
    loadCollisionMask(this.config.collisionMask)
      .then(() => {
        this._snapObjectPositions();
        this._snapPlayerPosition();
        // 길찾기 격자를 미리 생성해 첫 클릭 시 끊김 방지 (start==goal이라 즉시 반환)
        findPath(this.animPos.x, this.animPos.y, this.animPos.x, this.animPos.y, this._footprint);
      })
      .catch((err) => console.error("[Square] 충돌 마스크 로드 실패:", err));

    this._startTicker();
    this._subscribeStore();
  }

  private async _buildBackground() {
    if (!this.app) return;
    const tex = await Assets.load<Texture>(this.config.background);
    tex.source.scaleMode = "nearest";
    this.bg = new Sprite(tex);
    this.bg.width = this.mapWidth;
    this.bg.height = this.mapHeight;
    this.bg.eventMode = "static";
    this.bg.on("pointertap", (e: FederatedPointerEvent) =>
      this._handleMapClick(e)
    );
    // 배경은 항상 맨 뒤 (어떤 캐릭터보다 작은 zIndex)
    this.bg.zIndex = -Number.MAX_SAFE_INTEGER;
    this.world.addChild(this.bg);
  }

  private async _buildPlayer() {
    if (!this.app) return;
    const [idle, walk, attack] = await Promise.all([
      loadSpriteStrip(SWORDSMAN_SHEET, SWORDSMAN_CLIPS.idle.frames, SWORDSMAN_CLIPS.idle.row),
      loadSpriteStrip(SWORDSMAN_SHEET, SWORDSMAN_CLIPS.walk.frames, SWORDSMAN_CLIPS.walk.row),
      loadSpriteStrip(SWORDSMAN_SHEET, SWORDSMAN_CLIPS.attack.frames, SWORDSMAN_CLIPS.attack.row),
    ]);

    this.player = new PixiCharacter(this.animPos.x, this.animPos.y, false, {}, 0.6);
    this.player.setSpriteClips({ idle, walk, attack }, 110, PLAYER_DISPLAY);
    this.player.setRoaming(false);
    this.player.setWorldPosition(
      this.pctToPxX(this.animPos.x),
      this.pctToPxY(this.animPos.y)
    );
    this.player.container.zIndex = this.pctToPxY(this.animPos.y);
    this.player.container.scale.set(depthScale(this.animPos.y));

    // 본체 클릭 영역. Pixi는 알파(투명도)가 아니라 사각 영역으로 히트 판정하므로
    // 스프라이트 전체가 아닌 "실제 보이는 캐릭터 몸통"에 맞춘 박스를 지정한다.
    // swordsman 프레임(100px) 내 캐릭터 ≈ x40~66, y36~62, anchor(0.52,0.6).
    // PLAYER_DISPLAY가 바뀌어도 따라가도록 scale로 계산.
    const hs = PLAYER_DISPLAY / 100;
    this.player.container.eventMode = "static";
    this.player.container.cursor = "pointer";
    this.player.container.hitArea = new Rectangle(-12 * hs, -24 * hs, 26 * hs, 26 * hs);
    this.player.container.on("pointertap", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this.opts?.onPlayerClick();
    });

    this.world.addChild(this.player.container);
    this._rebuildPlayerNameTag();
  }

  private async _buildObjects() {
    if (!this.app || !this.map) return;

    const objects = this.map.objects;
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const size = obj.size ?? NPC_DEFAULT_SIZE;
      const node = new Container();

      // 외형. 좌우반전/오프셋은 sprite에만 적용 → 이름표는 정자세 유지.
      //  - frame 있음   → 아틀라스 시트에서 해당 사각형만 잘라 사용 (종횡비 유지)
      //  - 가로 스트립   → 정사각 프레임 분할 후 순환 애니메이션 (예: 128x32 = 4프레임)
      //  - 정사각/단일   → 정적 Sprite (예: todo_wheel 1024x1024)
      const src = obj.imageSrc;
      let display: Sprite;
      let frameW: number; // 원본 프레임 픽셀 (종횡비 계산용)
      let frameH: number;
      const base = await Assets.load<Texture>(src);
      base.source.scaleMode = "nearest";
      if (obj.frame) {
        const f = obj.frame;
        const tex = new Texture({
          source: base.source,
          frame: new Rectangle(f.x, f.y, f.w, f.h),
        });
        display = new Sprite(tex);
        frameW = f.w;
        frameH = f.h;
      } else {
        const fw = base.width;
        const fh = base.height;
        const isStrip = fw > fh && fw % fh === 0;
        const frameSize = isStrip ? fh : Math.min(fw, fh);
        if (isStrip) {
          const count = fw / fh;
          const frames = sliceStrip(base, fh, count);
          const sprite = new Sprite(frames[0]);
          // 프레임 순환 속도 (ms/frame)
          this.npcAnims.push({ sprite, frames, idx: 0, elapsed: 0, rate: 300 });
          display = sprite;
        } else {
          display = new Sprite(base);
        }
        frameW = frameSize;
        frameH = frameSize;
      }

      // 발 기준 정렬 (CSS의 -translate-y-full과 동일: 박스 하단이 좌표에 닿음)
      // size = 표시 높이. 가로는 프레임 종횡비로 계산(정사각 프레임이면 size와 동일).
      display.anchor.set(0.5, 1.0);
      display.height = size;
      display.width = size * (frameW / frameH);
      display.x = obj.offsetX ?? 0;
      display.y = obj.offsetY ?? 0;
      if (obj.flip) display.scale.x = -Math.abs(display.scale.x);

      // 클릭 판정.
      // Pixi는 스프라이트를 알파가 아닌 "사각 바운딩 박스"로 히트 판정한다.
      // 그대로 두면 투명 여백까지 클릭을 삼켜 주변 빈 땅 클릭 시 이동이 막힌다.
      //  - interactive NPC: 실제 그림 크기에 맞춘 hitArea로 좁혀 받는다.
      //  - 그 외(비상호작용 NPC/prop): eventMode "none" → 클릭 통과 → 항상 이동 가능.
      if (obj.kind === "npc" && obj.interactive) {
        const hitW = size * 0.8;
        const hitH = size * 0.9;
        const action = obj.action;
        node.eventMode = "static";
        node.cursor = "pointer";
        node.hitArea = new Rectangle(
          (obj.offsetX ?? 0) - hitW / 2,
          (obj.offsetY ?? 0) - hitH,
          hitW,
          hitH
        );
        node.on("pointertap", (e: FederatedPointerEvent) => {
          e.stopPropagation();
          this._approachNpc(i, action);
        });
      } else {
        node.eventMode = "none";
      }

      node.addChild(display);

      // 이름표는 NPC만 (닉네임). 그림이 프레임 안에서 치우쳐 있어도
      // 실제 픽셀 중심에 이름표를 맞춰 가운데 정렬되게 한다.
      if (obj.kind === "npc") {
        const tag = this._buildNpcNameTag(obj.nickname, size);
        let tagX: number;
        if (obj.frame) {
          // 아틀라스 프레임은 그림이 프레임에 이미 중앙 정렬됨 → 오프셋 보정 불필요
          tagX = obj.offsetX ?? 0;
        } else {
          const img = await loadSpriteImage(src);
          const artOff = frameArtCenterOffsetPx(img, frameH, 0, size);
          tagX = (obj.offsetX ?? 0) + (obj.flip ? -artOff : artOff);
        }
        tag.x = tagX;
        node.addChild(tag);

        // 앰비언트 말풍선 등록 (대사가 있는 NPC만). 시작 시각을 인덱스로 stagger.
        if (obj.lines && obj.lines.length > 0) {
          this.npcBubbles.push({
            node,
            size,
            tagX,
            lines: obj.lines,
            bubble: null,
            next: 3000 + Math.random() * 8000 + this.npcBubbles.length * 1500,
            until: 0,
            last: -1,
          });
        }
      }

      node.x = this.pctToPxX(this.objectPcts[i].x);
      node.y = this.pctToPxY(this.objectPcts[i].y);
      node.zIndex = node.y; // 발 y 기준 깊이 정렬
      node.scale.set(depthScale(this.objectPcts[i].y)); // 원근 스케일
      this.world.addChild(node);
      this.objectContainers.push(node);
    }
  }

  private _snapObjectPositions() {
    for (let i = 0; i < this.objectPcts.length; i++) {
      // prop(장애물)은 걷는 길 위로 끌어오지 않는다 — NPC만 스냅.
      if (!this.objectSnap[i]) continue;
      const snapped = findNearestWalkable(
        this.objectPcts[i].x,
        this.objectPcts[i].y
      );
      this.objectPcts[i] = snapped;
      const node = this.objectContainers[i];
      if (node) {
        node.x = this.pctToPxX(snapped.x);
        node.y = this.pctToPxY(snapped.y);
        node.zIndex = node.y;
        node.scale.set(depthScale(snapped.y));
      }
    }
  }

  // 저장된(persist) 플레이어 위치가 흰 길 밖이면(예: 옛 버그로 상점 위로 걸어간 값)
  // 가장 가까운 길 위로 끌어와, 첫 스텝부터 막혀 갇히는 것을 방지한다.
  // 스토어에도 반영해 다음 세션부터 자가 교정되게 한다.
  private _snapPlayerPosition() {
    const snapped = findNearestWalkable(this.animPos.x, this.animPos.y);
    if (snapped.x === this.animPos.x && snapped.y === this.animPos.y) return;
    this.animPos = { x: snapped.x, y: snapped.y };
    this.path = [];
    this.pathIndex = 0;
    const px = this.pctToPxX(snapped.x);
    const py = this.pctToPxY(snapped.y);
    this.player?.setWorldPosition(px, py);
    this._updateCamera(px, py);
    useSquareStore.setState({
      position: { x: snapped.x, y: snapped.y },
      targetPosition: null,
      isWalking: false,
    });
  }

  // ===== 이름표 =====

  private _buildNpcNameTag(nickname: string, size: number) {
    const pill = makePill({
      text: nickname,
      bgColor: 0x000000,
      bgAlpha: 0.7,
      textColor: 0x4ade80, // green-400
      fontSize: 12,
      bold: true,
    });
    const { col, height } = makeColumn([pill]);
    // 머리 위로 배치 — 발 기준(anchor 하단)이므로 박스 상단은 -size
    col.y = -size - height - 4;
    col.eventMode = "none";
    return col;
  }

  /** 앰비언트 말풍선: 크림색 둥근 사각형 + 아래 꼬리 + 텍스트. (0,0)=꼬리 끝(하단 중앙). */
  private _makeSpeechBubble(text: string): Container {
    const node = new Container();
    const label = new Text({
      text,
      style: {
        fontFamily: NAME_FONT,
        fontSize: 12,
        fill: 0x2b2b2b,
        align: "center",
        wordWrap: true,
        wordWrapWidth: 150,
        lineHeight: 15,
      },
    });
    label.anchor.set(0.5, 0);
    const padX = 8;
    const padY = 6;
    const tail = 7;
    const w = Math.ceil(label.width) + padX * 2;
    const h = Math.ceil(label.height) + padY * 2;

    const bg = new Graphics();
    bg.roundRect(-w / 2, -(h + tail), w, h, 7);
    bg.fill({ color: 0xfdf6e3, alpha: 0.98 });
    const tri = new Graphics();
    tri.poly([-6, -tail, 6, -tail, 0, 0]);
    tri.fill({ color: 0xfdf6e3, alpha: 0.98 });

    label.position.set(0, -(h + tail) + padY);
    node.addChild(bg, tri, label);
    node.eventMode = "none";
    return node;
  }

  private _rebuildPlayerNameTag() {
    if (!this.player) return;
    if (this.playerNameTag) {
      this.player.container.removeChild(this.playerNameTag);
      this.playerNameTag.destroy({ children: true });
      this.playerNameTag = null;
      this.playerTimeText = null;
    }

    const u = useUserStore.getState();
    const s = useSquareStore.getState();
    const nickname = u.nickname ?? "모험가";
    const level = u.level ?? 1;
    const seconds = Math.floor(s.getElapsed() / 1000);

    const pills: { node: Container; w: number; h: number }[] = [];

    // 공유 퀘스트
    if (s.sharedQuest) {
      const statusLabel = STATUS[s.sharedQuest.tagged as keyof typeof STATUS] ?? "";
      pills.push(
        makePill({
          text: `${s.sharedQuest.name} ${statusLabel}`,
          bgColor: 0x000000,
          bgAlpha: 0.6,
          textColor: 0xffffff,
          fontSize: 10,
        })
      );
    }

    // 집중 시간
    const timePill = makePill({
      text: `${s.isRunning ? "🟢" : "⏸"} ${formatTime(seconds)}`,
      bgColor: s.isRunning ? 0x22c55e : 0x6b7280,
      bgAlpha: s.isRunning ? 0.8 : 0.6,
      textColor: 0xffffff,
      fontSize: 10,
    });
    this.playerTimeText = timePill.node.getChildAt(1) as Text;
    pills.push(timePill);

    // 레벨 + 닉네임 (한 줄에 가로 배치)
    const levelPill = makePill({
      text: `Lv.${level}`,
      bgColor: 0xc84b3a,
      bgAlpha: 1,
      textColor: 0xffffff,
      fontSize: 10,
      bold: true,
    });
    const namePill = makePill({
      text: nickname,
      bgColor: 0x000000,
      bgAlpha: 0.7,
      textColor: 0xffffff,
      fontSize: 12,
      bold: true,
    });
    const row = new Container();
    const gap = 4;
    const rowW = levelPill.w + gap + namePill.w;
    levelPill.node.x = -rowW / 2 + levelPill.w / 2;
    namePill.node.x = rowW / 2 - namePill.w / 2;
    row.addChild(levelPill.node, namePill.node);
    const rowH = Math.max(levelPill.h, namePill.h);

    const { col, height } = makeColumn(pills);
    // 행 컨테이너를 컬럼 아래에 붙임
    row.y = height + 2;
    col.addChild(row);
    const totalH = height + 2 + rowH;

    // 캐릭터 머리 위로 배치 — 머리 높이(≈22*scale)에 맞춰 자동 조정
    const headTop = 22 * (PLAYER_DISPLAY / 100);
    col.y = -(headTop + 12) - totalH;
    col.eventMode = "none";
    this.player.container.addChild(col);
    this.playerNameTag = col;
  }

  private _updatePlayerTime() {
    const s = useSquareStore.getState();
    const sec = Math.floor(s.getElapsed() / 1000);
    if (sec !== this.lastTimeSec || s.isRunning !== this.lastRunning) {
      this.lastTimeSec = sec;
      // 실행 상태가 바뀌면 색/아이콘이 달라지므로 전체 재구성
      if (s.isRunning !== this.lastRunning) {
        this.lastRunning = s.isRunning;
        this._rebuildPlayerNameTag();
      } else if (this.playerTimeText) {
        this.playerTimeText.text = `${s.isRunning ? "🟢" : "⏸"} ${formatTime(sec)}`;
      }
    }
  }

  // ===== 카메라 / 이동 / 클릭 =====

  private _updateCamera(playerPxX: number, playerPxY: number) {
    if (this.width === 0 || this.height === 0) return;
    // 높이 맞춤 줌: 월드 높이를 화면 높이에 맞춘다 → 오브젝트 비율이 기기 무관하게 동일.
    const zoom = this.height / this.mapHeight;
    this.world.scale.set(zoom);

    const worldScreenW = this.mapWidth * zoom;
    const worldScreenH = this.mapHeight * zoom; // == this.height

    // 가로: 플레이어 추적 + 맵 경계 클램프. 월드가 화면보다 좁으면 가운데(좌우 레터박스).
    let camX: number;
    if (worldScreenW <= this.width) {
      camX = (worldScreenW - this.width) / 2; // 음수 → 좌우 배경색 여백
    } else {
      camX = clamp(playerPxX * zoom - this.width / 2, 0, worldScreenW - this.width);
    }
    // 세로: 화면 높이에 꽉 참(스크롤 없음).
    const camY = (worldScreenH - this.height) / 2;

    // 카메라를 옮기는 대신 월드를 반대로 이동
    this.world.x = -camX;
    this.world.y = -camY;
  }

  private get _footprint() {
    return {
      halfWidthPct: (PLAYER_FOOTPRINT_WIDTH / 2 / this.mapWidth) * 100,
      heightPct: (PLAYER_FOOTPRINT_HEIGHT / this.mapHeight) * 100,
    };
  }

  /**
   * 현재 위치에서 (goalX,goalY)까지 A* 경로를 계산해 걷기 시작한다.
   * 장애물을 자동 우회. 실패 시 직선 도달 지점으로 폴백. 이동 못 하면 false.
   */
  private _walkTo(goalX: number, goalY: number): boolean {
    const cur = this.animPos;
    const fp = this._footprint;
    let path = findPath(cur.x, cur.y, goalX, goalY, fp);
    if (!path || path.length < 2) {
      // 폴백: 직선으로 도달 가능한 지점까지
      const reach = findReachablePoint(cur.x, cur.y, goalX, goalY, 0.5, fp);
      if (Math.abs(reach.x - cur.x) < 0.3 && Math.abs(reach.y - cur.y) < 0.3) {
        return false;
      }
      path = [
        { x: cur.x, y: cur.y },
        { x: reach.x, y: reach.y },
      ];
    }
    this.path = path;
    this.pathIndex = 1; // [0]은 현재 위치 → 1부터 이동
    // 목표를 targetPosition에 넣어 "걷는 중" 상태 표시 (도착 시 null)
    useSquareStore.setState({
      isWalking: true,
      targetPosition: { ...path[path.length - 1] },
    });
    return true;
  }

  private _handleMapClick(e: FederatedPointerEvent) {
    // 빈 땅을 클릭하면 진행 중이던 NPC 접근은 취소 (다른 곳으로 가려는 의도)
    this.pendingInteraction = null;

    const local = this.world.toLocal(e.global);
    const xPct = clamp((local.x / this.mapWidth) * 100, 0, 100);
    const yPct = clamp((local.y / this.mapHeight) * 100, 0, 100);

    this._walkTo(xPct, yPct);
  }

  /**
   * NPC를 클릭하면 그 앞까지 걸어간 뒤 상호작용한다.
   * 이미 충분히 가까우면 즉시 발동.
   */
  private _approachNpc(
    index: number,
    action: "rest" | "roulette" | undefined
  ) {
    const npcPos = this.objectPcts[index];
    if (!npcPos) return;
    const cur = this.animPos;

    const distToNpc = Math.hypot(npcPos.x - cur.x, npcPos.y - cur.y);
    // 이미 NPC 앞이면 바로 상호작용
    if (distToNpc <= INTERACT_STAND_GAP + 1.5) {
      this.pendingInteraction = null;
      this._faceTowards(npcPos.x);
      this.opts?.onNpcClick(action);
      return;
    }

    // NPC에서 플레이어 쪽으로 STAND_GAP 만큼 떨어진 "서는 지점" 계산
    const dx = cur.x - npcPos.x;
    const dy = cur.y - npcPos.y;
    const len = Math.hypot(dx, dy) || 1;
    const standX = npcPos.x + (dx / len) * INTERACT_STAND_GAP;
    const standY = npcPos.y + (dy / len) * INTERACT_STAND_GAP;

    // A*로 서는 지점까지 걸어간 뒤 도착하면 상호작용
    this.pendingInteraction = { action, x: npcPos.x, y: npcPos.y };
    if (!this._walkTo(standX, standY)) {
      // 이미 못 움직일 만큼 가깝거나 막힘 → 바로 상호작용
      this.pendingInteraction = null;
      this._faceTowards(npcPos.x);
      this.opts?.onNpcClick(action);
    }
  }

  /** 대상 x좌표(맵 %)를 향해 좌우 방향을 맞춘다. */
  private _faceTowards(targetXPct: number) {
    const left = targetXPct < this.animPos.x;
    useSquareStore.getState().setFacing(left ? "left" : "right");
    this.player?.setFlip(left);
  }

  private _startTicker() {
    if (!this.app) return;
    this.app.ticker.add((ticker) => {
      const dt = ticker.deltaMS / 1000;
      const store = useSquareStore.getState();

      // A* waypoint 추적: 현재 목표 지점으로 이동, 도달하면 다음 지점으로 (멈추지 않음)
      if (this.pathIndex < this.path.length) {
        const wp = this.path[this.pathIndex];
        const dx = wp.x - this.animPos.x;
        const dy = wp.y - this.animPos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.5) {
          this.animPos = { x: wp.x, y: wp.y };
          this.pathIndex++;
          if (this.pathIndex >= this.path.length) {
            // 최종 도착
            this.path = [];
            this.pathIndex = 0;
            useSquareStore.setState({
              position: { ...this.animPos },
              targetPosition: null,
              isWalking: false,
            });
            this.player?.setRoaming(false);
          }
        } else {
          const step = MOVE_SPEED * dt;
          const r = Math.min(step / dist, 1);
          this.animPos = { x: this.animPos.x + dx * r, y: this.animPos.y + dy * r };
          // 이동 방향으로 바라보기
          const dir: Direction =
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0
                ? "right"
                : "left"
              : dy > 0
                ? "down"
                : "up";
          if (store.facing !== dir) useSquareStore.setState({ facing: dir });
          this.player?.setRoaming(true);
          this.player?.setFlip(dir === "left");
        }
      } else {
        this.player?.setRoaming(false);
      }

      const px = this.pctToPxX(this.animPos.x);
      const py = this.pctToPxY(this.animPos.y);
      this.player?.setWorldPosition(px, py);
      // 발 y가 바뀔 때마다 깊이 갱신 → NPC보다 아래면 앞, 위면 뒤로 자동 정렬 + 원근 스케일
      if (this.player) {
        this.player.container.zIndex = py;
        this.player.container.scale.set(depthScale(this.animPos.y));
      }
      this._updateCamera(px, py);
      this.player?.update(this.app!.renderer, ticker.deltaMS);

      // 스프라이트 시트 NPC 프레임 순환
      for (const a of this.npcAnims) {
        if (a.frames.length < 2) continue;
        a.elapsed += ticker.deltaMS;
        if (a.elapsed >= a.rate) {
          a.elapsed = 0;
          a.idx = (a.idx + 1) % a.frames.length;
          a.sprite.texture = a.frames[a.idx];
        }
      }

      this._updatePlayerTime();

      // 앰비언트 말풍선: 일정 간격마다 랜덤 대사를 잠깐 띄웠다 사라짐
      this.clock += ticker.deltaMS;
      for (const nb of this.npcBubbles) {
        if (nb.bubble) {
          if (this.clock >= nb.until) {
            nb.node.removeChild(nb.bubble);
            nb.bubble.destroy({ children: true });
            nb.bubble = null;
            nb.next = this.clock + 15000 + Math.random() * 15000; // 15~30초 후 다음
          }
        } else if (this.clock >= nb.next) {
          let idx = Math.floor(Math.random() * nb.lines.length);
          if (nb.lines.length > 1 && idx === nb.last) {
            idx = (idx + 1) % nb.lines.length;
          }
          nb.last = idx;
          const bubble = this._makeSpeechBubble(nb.lines[idx]);
          bubble.x = nb.tagX;
          bubble.y = -nb.size - 28; // 이름표 위
          nb.node.addChild(bubble);
          nb.bubble = bubble;
          nb.until = this.clock + 3500; // 3.5초 표시
        }
      }

      // NPC 앞까지 걸어가 도착하면(이동 목표 소진) 상호작용 발동
      if (
        this.pendingInteraction &&
        !useSquareStore.getState().targetPosition
      ) {
        const pending = this.pendingInteraction;
        this.pendingInteraction = null;
        this._faceTowards(pending.x);
        this.opts?.onNpcClick(pending.action);
      }
    });
  }

  private _subscribeStore() {
    // 닉네임/레벨이 늦게 로드되거나 공유 퀘스트가 바뀌면 플레이어 이름표 재구성
    const unsubUser = useUserStore.subscribe(() => this._rebuildPlayerNameTag());
    const unsubSquare = useSquareStore.subscribe((state, prev) => {
      if (state.sharedQuest !== prev.sharedQuest) this._rebuildPlayerNameTag();
    });
    this.unsubscribe = () => {
      unsubUser();
      unsubSquare();
    };
  }

  resize(width: number, height: number) {
    if (!this.app) return;
    this.width = width;
    this.height = height;
    this.app.renderer.resize(width, height);

    if (this.bg) {
      this.bg.width = this.mapWidth;
      this.bg.height = this.mapHeight;
    }
    for (let i = 0; i < this.objectContainers.length; i++) {
      this.objectContainers[i].x = this.pctToPxX(this.objectPcts[i].x);
      this.objectContainers[i].y = this.pctToPxY(this.objectPcts[i].y);
      this.objectContainers[i].zIndex = this.objectContainers[i].y;
    }
    const px = this.pctToPxX(this.animPos.x);
    const py = this.pctToPxY(this.animPos.y);
    this.player?.setWorldPosition(px, py);
    if (this.player) this.player.container.zIndex = py;
    this._updateCamera(px, py);
  }

  destroy() {
    this.unsubscribe?.();
    this.player?.destroy();
    this.app?.destroy(false, { children: true });
    this.app = null;
  }
}
