import {
  Container,
  Sprite,
  Graphics,
  Text,
  TextStyle,
  Texture,
  RenderTexture,
  type Renderer,
} from "pixi.js";
import {
  type SpriteSheetLayer,
  compositeFrame,
  createRenderTexture,
} from "./PixiSpriteCompositor";

export type CharacterState =
  | "idle"
  | "movingForward"
  | "movingBack"
  | "attacking"
  | "shaking"
  | "defeated"
  | "reviving"
  // 광장 자유 이동(free-roam): 위치는 외부(scene)가 setWorldPosition으로 제어하고
  // 여기서는 walk/idle 클립 토글만 담당. 전투 이동 상태머신과 배타적.
  | "roaming";

export interface AnimationConfig {
  moveDuration: number; // 이동 시간 (ms), 기본 500
  moveForwardTarget: { xPercent: number; yPercent: number }; // 전진 목표 (%)
  attackFrameRate: number; // 공격 프레임 간격 (ms), 기본 100
  walkFrameRate: number; // 걷기 프레임 간격 (ms), 기본 80
  shakeAmplitude: number; // 피격 흔들림 크기 (px), 기본 3
  shakeStepDuration: number; // 피격 흔들림 스텝 (ms), 기본 100
  defeatFadeDuration: number; // 처치 페이드 시간 (ms), 기본 700
  defeatTextDelay: number; // CLEAR 텍스트 표시까지 대기 (ms), 기본 400
  defeatFadeOutDelay: number; // 텍스트 후 페이드아웃 시작까지 (ms), 기본 800
  defeatFadeOutDuration: number; // 전체 페이드아웃 시간 (ms), 기본 600
  reviveDuration: number; // 부활 페이드인 시간 (ms), 기본 500
}

const DEFAULT_CONFIG: AnimationConfig = {
  moveDuration: 500,
  moveForwardTarget: { xPercent: 65, yPercent: 60 },
  attackFrameRate: 100,
  walkFrameRate: 60,
  shakeAmplitude: 3,
  shakeStepDuration: 100,
  defeatFadeDuration: 700,
  defeatTextDelay: 400,
  defeatFadeOutDelay: 800,
  defeatFadeOutDuration: 600,
  reviveDuration: 500,
};

const SPRITE_SIZE = 120;
// 스프라이트 클립(swordsman) 표시 크기. 프레임 여백이 커서 SPRITE_SIZE보다 크게 잡아야
// 캐릭터(프레임의 ~1/4)가 적정 크기로 보인다. (값↑ = 캐릭터↑)
const SPRITE_CLIP_DISPLAY = 300;

export class PixiCharacter {
  readonly container = new Container();
  private sprite: Sprite;
  private defeatOverlay: Graphics;
  private clearText: Text;
  private config: AnimationConfig;

  // 홈 위치 (%)
  private homeXPercent: number;
  private homeYPercent: number;
  private flip: boolean;

  // 씬 크기 (px)
  private sceneWidth = 0;
  private sceneHeight = 0;

  // 상태
  private state: CharacterState = "idle";

  // 스프라이트시트 레이어 (플레이어용)
  private idleLayers: SpriteSheetLayer[] = [];
  private attackLayers: SpriteSheetLayer[] = [];
  private walkLayers: SpriteSheetLayer[] = [];
  private idleFrame = 0;
  private attackFrames: number[] = [];
  private walkForwardFrames: number[] = [];
  private walkBackFrames: number[] = [];
  private walkFrameIdx = 0;
  private walkElapsed = 0;
  private renderTexture: RenderTexture | null = null;
  private currentCompositeFrame = -1;

  private isCanvasMode = false;

  // 몬스터 상태 클립 (idle/run/attack/hit/die). 각 상태 = 가로 시트 슬라이스 Texture[].
  // monsterAnim: 현재 재생 중인 동작. idle은 루프, hit/die는 1회(마지막 프레임 유지).
  // run/attack은 보유만 하고 현재 트리거 없음.
  private monsterMode = false;
  private monsterClips: Record<
    "idle" | "run" | "attack" | "hit" | "die",
    Texture[]
  > | null = null;
  private monsterAnim: "idle" | "hit" | "die" = "idle";
  private monsterClipIdx = 0;
  private monsterClipElapsed = 0;
  private monsterClipRate = 90; // ms/frame

  // 스프라이트 클립 모드 (swordsman 등 단일 캐릭터 동작 스트립)
  // idle/walk/attack 클립을 상태에 따라 재생. 합성(canvas)·몬스터 모드와 배타적.
  private spriteMode = false;
  private clipIdle: Texture[] = [];
  private clipWalk: Texture[] = [];
  private clipAttack: Texture[] = [];
  private clipFrameIdx = 0;
  private clipElapsed = 0;
  private clipFrameRate = 110; // ms/frame

  // 광장 free-roam: walk(true)/idle(false) 클립 선택 플래그
  private roamWalking = false;

  // 애니메이션 진행
  private moveElapsed = 0;
  private moveStartX = 0;
  private moveStartY = 0;
  private moveTargetX = 0;
  private moveTargetY = 0;

  private attackFrameIdx = 0;
  private attackElapsed = 0;

  private shakeStep = 0;
  private shakeElapsed = 0;
  private readonly shakeSequence = [-1, 1, -1, 1, 0]; // 방향 계수

  private defeatProgress = 0;


  // defeat 3단계: darken → CLEAR 텍스트 → 전체 페이드아웃
  private defeatPhase: "darken" | "text" | "fadeout" | "done" = "darken";

  // 부활
  private reviveElapsed = 0;


  constructor(
    homeXPercent: number,
    homeYPercent: number,
    flip: boolean = false,
    config: Partial<AnimationConfig> = {},
    // anchorY: 시각적 발 위치를 sprite 텍스처 비율로 지정 (0.0=top, 1.0=bottom).
    // LPC sprite는 frame 안에 padding이 있어 0.85 정도, mushroom처럼 꽉 찬 sprite는 1.0.
    anchorY: number = 1.0
  ) {
    this.homeXPercent = homeXPercent;
    this.homeYPercent = homeYPercent;
    this.flip = flip;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.sprite = new Sprite(Texture.EMPTY);
    this.sprite.width = SPRITE_SIZE;
    this.sprite.height = SPRITE_SIZE;
    this.sprite.anchor.set(0.5, anchorY);

    if (flip) {
      this.sprite.scale.x = -1;
    }

    this.defeatOverlay = new Graphics();
    this.defeatOverlay.rect(
      -SPRITE_SIZE / 2,
      -SPRITE_SIZE,
      SPRITE_SIZE,
      SPRITE_SIZE
    );
    this.defeatOverlay.fill({ color: 0x000000 });
    this.defeatOverlay.alpha = 0;
    this.defeatOverlay.blendMode = "multiply";

    // CLEAR 텍스트
    this.clearText = new Text({
      text: "CLEAR!",
      style: new TextStyle({
        fontFamily: "Galmuri11Bold, monospace",
        fontSize: 20,
        fontWeight: "bold",
        fill: 0xffdd44,
        stroke: { color: 0x000000, width: 3 },
        dropShadow: {
          color: 0x000000,
          blur: 4,
          distance: 2,
        },
      }),
    });
    this.clearText.anchor.set(0.5);
    this.clearText.y = -SPRITE_SIZE / 2;
    this.clearText.alpha = 0;

    this.container.addChild(this.sprite);
    this.container.addChild(this.defeatOverlay);
    this.container.addChild(this.clearText);
  }

  /** 씬 크기 업데이트 시 호출 */
  setSceneSize(width: number, height: number) {
    this.sceneWidth = width;
    this.sceneHeight = height;
    if (this.state === "idle") {
      this.container.x = (this.homeXPercent / 100) * width;
      this.container.y = (this.homeYPercent / 100) * height;
    }
  }

  /** 플레이어: 멀티레이어 idle 설정 */
  setIdleLayers(
    renderer: Renderer,
    layers: SpriteSheetLayer[],
    idleFrame: number
  ) {
    this.isCanvasMode = true;
    this.idleLayers = layers;
    this.idleFrame = idleFrame;

    if (!this.renderTexture) {
      this.renderTexture = createRenderTexture(renderer, SPRITE_SIZE);
    }

    compositeFrame(renderer, layers, idleFrame, SPRITE_SIZE, this.renderTexture);
    this.sprite.texture = this.renderTexture;
    this.currentCompositeFrame = idleFrame;
  }

  /** 플레이어: 멀티레이어 공격 설정 */
  setAttackLayers(layers: SpriteSheetLayer[], frames: number[]) {
    this.attackLayers = layers;
    this.attackFrames = frames;
  }

  /** 플레이어: 멀티레이어 걷기 설정 (전진/후진 프레임 분리) */
  setWalkLayers(
    layers: SpriteSheetLayer[],
    forwardFrames: number[],
    backFrames: number[]
  ) {
    this.walkLayers = layers;
    this.walkForwardFrames = forwardFrames;
    this.walkBackFrames = backFrames;
  }

  /**
   * 몬스터: 상태별 클립 설정 (idle/run/attack/hit/die).
   * 각 클립은 가로 시트를 슬라이스한 Texture[]. 프레임 비율(frameWidth/Height)을
   * 유지해 표시 → 비정사각 프레임(예: 90x64)도 찌그러지지 않음.
   */
  setMonsterClips(
    clips: Record<"idle" | "run" | "attack" | "hit" | "die", Texture[]>,
    frameWidth: number,
    frameHeight: number,
    scale: number = 1.0
  ) {
    this.monsterMode = true;
    this.isCanvasMode = false;
    this.spriteMode = false;
    this.monsterClips = clips;
    this.monsterAnim = "idle";
    this.monsterClipIdx = 0;
    this.monsterClipElapsed = 0;

    if (clips.idle.length > 0) {
      this.sprite.texture = clips.idle[0];
      // 높이 = SPRITE_SIZE*scale, 너비 = 높이 * (frameW/frameH) 로 프레임 비율 유지.
      const displayH = SPRITE_SIZE * scale;
      this.sprite.height = displayH;
      this.sprite.width = displayH * (frameWidth / frameHeight);
      if (this.flip) {
        this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
      }
    }
  }

  // 몬스터 클립 한 프레임 진행 + sprite.texture 교체.
  // loop=false 이면 마지막 프레임에서 멈추고 도달 시 true 반환(1회 재생 종료 신호).
  private _advanceMonsterClip(
    clip: Texture[],
    deltaMS: number,
    loop: boolean
  ): boolean {
    if (!clip || clip.length === 0) return false;
    let finished = false;
    this.monsterClipElapsed += deltaMS;
    if (this.monsterClipElapsed >= this.monsterClipRate) {
      this.monsterClipElapsed = 0;
      let next = this.monsterClipIdx + 1;
      if (next >= clip.length) {
        if (loop) {
          next = 0;
        } else {
          next = clip.length - 1;
          finished = true;
        }
      }
      this.monsterClipIdx = next;
    }
    this.sprite.texture = clip[Math.min(this.monsterClipIdx, clip.length - 1)];
    return finished;
  }

  /**
   * 플레이어: 단일 캐릭터 스프라이트 클립 설정 (swordsman 등).
   * idle/walk/attack 각각 가로 스트립을 슬라이스한 Texture[].
   */
  setSpriteClips(
    clips: { idle: Texture[]; walk: Texture[]; attack: Texture[] },
    frameRate = 110,
    // 표시 크기(px). 전투는 기본 300, 광장은 더 작게 넘겨 캐릭터 크기를 조절한다.
    displaySize = SPRITE_CLIP_DISPLAY
  ) {
    this.spriteMode = true;
    this.isCanvasMode = false;
    this.clipIdle = clips.idle;
    this.clipWalk = clips.walk;
    this.clipAttack = clips.attack;
    this.clipFrameRate = frameRate;
    this.clipFrameIdx = 0;
    this.clipElapsed = 0;

    if (clips.idle.length > 0) {
      this.sprite.texture = clips.idle[0];
      // 프레임(100x100) 안 캐릭터는 작고(~24x22px) 여백이 큼.
      // anchor를 캐릭터 발(프레임 정규화 0.52, 0.6)에 맞추고, 표시 크기를 키워
      // 투명 여백이 화면을 벗어나게 해 캐릭터가 크게 보이도록 한다.
      this.sprite.anchor.set(0.52, 0.6);
      this.sprite.width = displaySize;
      this.sprite.height = displaySize;
      if (this.flip) {
        this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
      }
    }
  }

  // ===== 광장 free-roam 전용 API =====
  // 위치/방향/이동상태를 scene이 매 프레임 직접 제어한다(전투 상태머신 미사용).

  /** 좌우 반전 토글 (방향 전환). 표시 크기는 유지. */
  setFlip(flip: boolean) {
    this.flip = flip;
    const mag = Math.abs(this.sprite.scale.x);
    this.sprite.scale.x = flip ? -mag : mag;
  }

  /** 월드 좌표(px)에 캐릭터 컨테이너 배치 */
  setWorldPosition(x: number, y: number) {
    this.container.x = x;
    this.container.y = y;
  }

  /**
   * free-roam 상태로 전환하고 walk/idle 애니메이션만 토글.
   * 위치 이동은 하지 않는다(scene이 setWorldPosition으로 처리).
   */
  setRoaming(walking: boolean) {
    if (this.state !== "roaming") {
      this.state = "roaming";
      this.clipFrameIdx = 0;
      this.clipElapsed = 0;
    }
    this.roamWalking = walking;
  }

  // 현재 클립의 다음 프레임으로 진행하고 sprite.texture 교체.
  private _advanceClip(clip: Texture[], deltaMS: number, loop: boolean) {
    if (clip.length === 0) return;
    this.clipElapsed += deltaMS;
    if (this.clipElapsed >= this.clipFrameRate) {
      this.clipElapsed = 0;
      let next = this.clipFrameIdx + 1;
      if (next >= clip.length) next = loop ? 0 : clip.length - 1;
      this.clipFrameIdx = next;
    }
    this.sprite.texture = clip[Math.min(this.clipFrameIdx, clip.length - 1)];
  }

  // --- 상태 전환 메서드 ---

  startMoveForward() {
    this.state = "movingForward";
    this.moveElapsed = 0;
    this.moveStartX = this.container.x;
    this.moveStartY = this.container.y;
    this.moveTargetX =
      (this.config.moveForwardTarget.xPercent / 100) * this.sceneWidth;
    this.moveTargetY =
      (this.config.moveForwardTarget.yPercent / 100) * this.sceneHeight;
    // forward는 idle(7행 48)과 같은 행이라 첫 프레임이 idle과 동일 → 두 번째 프레임부터 시작
    // (첫 프레임부터 그리면 정지처럼 보임)
    this.walkFrameIdx = 1;
    // 다음 update 시 즉시 첫 합성 트리거
    this.walkElapsed = this.config.walkFrameRate;
    // 스프라이트 모드: walk 클립 처음부터
    this.clipFrameIdx = 0;
    this.clipElapsed = 0;
  }

  startMoveBack() {
    this.state = "movingBack";
    this.moveElapsed = 0;
    this.moveStartX = this.container.x;
    this.moveStartY = this.container.y;
    this.moveTargetX = (this.homeXPercent / 100) * this.sceneWidth;
    this.moveTargetY = (this.homeYPercent / 100) * this.sceneHeight;
    // back은 idle(8행 56)과 다른 행(7행 좌측 뛰기)이라 idx 0부터 시작해도 즉시 자세 전환됨
    this.walkFrameIdx = 0;
    this.walkElapsed = this.config.walkFrameRate;
    // 스프라이트 모드: walk 클립 처음부터
    this.clipFrameIdx = 0;
    this.clipElapsed = 0;
  }

  startAttack() {
    this.state = "attacking";
    this.attackFrameIdx = 0;
    this.attackElapsed = 0;
    // 스프라이트 모드: attack 클립 처음부터
    this.clipFrameIdx = 0;
    this.clipElapsed = 0;
  }

  startShake() {
    this.state = "shaking";
    this.shakeStep = 0;
    this.shakeElapsed = 0;
    // 몬스터: 피격(hit) 클립 1회 재생 시작
    if (this.monsterMode) {
      this.monsterAnim = "hit";
      this.monsterClipIdx = 0;
      this.monsterClipElapsed = 0;
    }
  }

  setDefeated() {
    this.state = "defeated";
    this.defeatProgress = 0;
    this.defeatPhase = "darken";
    this.clearText.alpha = 0;
    this.clearText.scale.set(1);
    // 몬스터: 사망(die) 클립 1회 재생 시작 (마지막 프레임에서 정지)
    if (this.monsterMode) {
      this.monsterAnim = "die";
      this.monsterClipIdx = 0;
      this.monsterClipElapsed = 0;
    }
  }

  /** 부활: 페이드인으로 복귀 */
  revive() {
    this.state = "reviving";
    this.reviveElapsed = 0;
    this.defeatPhase = "darken";
    this.clearText.alpha = 0;
    this.defeatOverlay.alpha = 0;
    this.container.alpha = 0;
    // 몬스터: idle 클립 첫 프레임으로 복원
    if (this.monsterMode) {
      this.monsterAnim = "idle";
      this.monsterClipIdx = 0;
      this.monsterClipElapsed = 0;
      if (this.monsterClips && this.monsterClips.idle.length > 0) {
        this.sprite.texture = this.monsterClips.idle[0];
      }
    }
  }

  setIdle() {
    this.state = "idle";
    this.container.x = (this.homeXPercent / 100) * this.sceneWidth;
    this.container.y = (this.homeYPercent / 100) * this.sceneHeight;

    // 스프라이트 모드: idle 클립 첫 프레임으로 복원
    if (this.spriteMode) {
      this.clipFrameIdx = 0;
      this.clipElapsed = 0;
      if (this.clipIdle.length > 0) this.sprite.texture = this.clipIdle[0];
      return;
    }

    // idle 프레임 복원
    if (this.isCanvasMode && this.renderTexture && this.idleLayers.length > 0) {
      if (this.currentCompositeFrame !== this.idleFrame) {
        // 렌더러 필요 — 다음 tick에서 처리
        this._needIdleRestore = true;
      }
    }
  }

  private _needIdleRestore = false;

  /** 매 프레임 호출 (Ticker에서) */
  update(renderer: Renderer, deltaMS: number) {
    // idle 프레임 복원 (렌더러 필요)
    if (this._needIdleRestore && this.renderTexture) {
      compositeFrame(
        renderer,
        this.idleLayers,
        this.idleFrame,
        SPRITE_SIZE,
        this.renderTexture
      );
      this.currentCompositeFrame = this.idleFrame;
      this._needIdleRestore = false;
    }

    switch (this.state) {
      case "idle":
        this._updateIdle(deltaMS);
        break;
      case "movingForward":
      case "movingBack":
        this._updateMove(renderer, deltaMS);
        break;
      case "attacking":
        this._updateAttack(renderer, deltaMS);
        break;
      case "shaking":
        this._updateShake(deltaMS);
        break;
      case "defeated":
        this._updateDefeat(deltaMS);
        break;
      case "reviving":
        this._updateRevive(deltaMS);
        break;
      case "roaming":
        this._updateRoaming(deltaMS);
        break;
    }
  }

  private _updateRoaming(deltaMS: number) {
    if (!this.spriteMode) return;
    // 이동 중이면 walk, 정지면 idle 클립을 순환
    this._advanceClip(this.roamWalking ? this.clipWalk : this.clipIdle, deltaMS, true);
  }

  private _updateIdle(deltaMS: number) {
    // 스프라이트 모드: idle 클립 순환
    if (this.spriteMode) {
      this._advanceClip(this.clipIdle, deltaMS, true);
      return;
    }
    // 몬스터: idle 클립 순환
    if (this.monsterMode && this.monsterClips) {
      this._advanceMonsterClip(this.monsterClips.idle, deltaMS, true);
    }
  }

  private _updateMove(renderer: Renderer, deltaMS: number) {
    this.moveElapsed += deltaMS;
    const t = Math.min(this.moveElapsed / this.config.moveDuration, 1);
    // ease-out quadratic
    const eased = 1 - (1 - t) * (1 - t);

    this.container.x =
      this.moveStartX + (this.moveTargetX - this.moveStartX) * eased;
    this.container.y =
      this.moveStartY + (this.moveTargetY - this.moveStartY) * eased;

    // 스프라이트 모드: walk 클립 순환 (전진/후진 동일 클립, facing은 아래에서 flip)
    if (this.spriteMode) {
      this._advanceClip(this.clipWalk, deltaMS, true);
    }

    // 걷기 프레임 순환 (시트 7행=오른쪽 걷기, 8행=왼쪽 걷기)
    if (
      this.isCanvasMode &&
      this.walkLayers.length > 0 &&
      this.renderTexture
    ) {
      const frames =
        this.state === "movingForward"
          ? this.walkForwardFrames
          : this.walkBackFrames;
      if (frames.length > 0) {
        this.walkElapsed += deltaMS;
        if (this.walkElapsed >= this.config.walkFrameRate) {
          this.walkElapsed = 0;
          const fi = frames[this.walkFrameIdx];
          compositeFrame(
            renderer,
            this.walkLayers,
            fi,
            SPRITE_SIZE,
            this.renderTexture
          );
          this.currentCompositeFrame = fi;
          this.walkFrameIdx = (this.walkFrameIdx + 1) % frames.length;
        }
      }
    }

    if (t >= 1) {
      this.state = "idle";
      this.walkFrameIdx = 0;
      this.walkElapsed = 0;
      // 스프라이트 모드: idle 클립 첫 프레임으로 복원
      if (this.spriteMode) {
        this.clipFrameIdx = 0;
        this.clipElapsed = 0;
        if (this.clipIdle.length > 0) this.sprite.texture = this.clipIdle[0];
        return;
      }
      // idle 프레임으로 복원
      if (
        this.isCanvasMode &&
        this.renderTexture &&
        this.idleLayers.length > 0
      ) {
        compositeFrame(
          renderer,
          this.idleLayers,
          this.idleFrame,
          SPRITE_SIZE,
          this.renderTexture
        );
        this.currentCompositeFrame = this.idleFrame;
      }
    }
  }

  private _updateAttack(renderer: Renderer, deltaMS: number) {
    // 스프라이트 모드: attack 클립 재생 (attacking 상태 유지 동안 반복).
    // 상태 종료는 외부(store)에서 isAttacking false → setIdle 호출로 처리.
    if (this.spriteMode) {
      this._advanceClip(this.clipAttack, deltaMS, true);
      return;
    }
    if (!this.isCanvasMode) return;

    this.attackElapsed += deltaMS;
    if (this.attackElapsed >= this.config.attackFrameRate) {
      this.attackElapsed = 0;
      const fi = this.attackFrames[this.attackFrameIdx];

      if (this.renderTexture && this.attackLayers.length > 0) {
        compositeFrame(
          renderer,
          this.attackLayers,
          fi,
          SPRITE_SIZE,
          this.renderTexture
        );
        this.currentCompositeFrame = fi;
      }

      this.attackFrameIdx =
        (this.attackFrameIdx + 1) % this.attackFrames.length;
    }
  }

  private _updateShake(deltaMS: number) {
    // 몬스터: hit 클립 진행(위치 흔들림과 병행)
    if (this.monsterMode && this.monsterClips) {
      this._advanceMonsterClip(this.monsterClips.hit, deltaMS, false);
    }

    this.shakeElapsed += deltaMS;
    if (this.shakeElapsed >= this.config.shakeStepDuration) {
      this.shakeElapsed = 0;
      this.shakeStep++;

      if (this.shakeStep >= this.shakeSequence.length) {
        this.container.x = (this.homeXPercent / 100) * this.sceneWidth;
        this.state = "idle";
        // 몬스터: idle 클립으로 복귀
        if (this.monsterMode) {
          this.monsterAnim = "idle";
          this.monsterClipIdx = 0;
          this.monsterClipElapsed = 0;
        }
        return;
      }
    }

    const baseX = (this.homeXPercent / 100) * this.sceneWidth;
    const direction = this.shakeSequence[this.shakeStep] ?? 0;
    this.container.x = baseX + direction * this.config.shakeAmplitude;
  }

  private _updateDefeat(deltaMS: number) {
    // 몬스터: die 클립 재생(1회, 마지막 프레임 유지). 페이드아웃은 아래 단계에서 처리.
    if (this.monsterMode && this.monsterClips) {
      this._advanceMonsterClip(this.monsterClips.die, deltaMS, false);
    }

    this.defeatProgress += deltaMS;

    switch (this.defeatPhase) {
      case "darken": {
        // 검은 오버레이는 사용 안 함 — 텍스트 등장까지 잠깐의 휴지만 유지.
        this.defeatOverlay.alpha = 0;
        if (this.defeatProgress >= this.config.defeatTextDelay) {
          this.defeatPhase = "text";
        }
        break;
      }
      case "text": {
        // 2단계: CLEAR! 텍스트 팝업 (스케일 + 알파)
        this.defeatOverlay.alpha = 0;
        const textElapsed =
          this.defeatProgress - this.config.defeatTextDelay;
        const textT = Math.min(textElapsed / 200, 1); // 200ms로 팝업
        // bounce-in: 살짝 크게 → 원래 크기
        const scale = textT < 0.6 ? 0.5 + textT * 1.5 : 1.4 - (textT - 0.6) * 1;
        this.clearText.alpha = Math.min(textT * 2, 1);
        this.clearText.scale.set(Math.max(scale, 1));

        if (this.defeatProgress >= this.config.defeatTextDelay + this.config.defeatFadeOutDelay) {
          this.defeatPhase = "fadeout";
        }
        break;
      }
      case "fadeout": {
        // 3단계: 전체 컨테이너 서서히 사라짐
        const fadeStart =
          this.config.defeatTextDelay + this.config.defeatFadeOutDelay;
        const fadeElapsed = this.defeatProgress - fadeStart;
        const fadeT = Math.min(
          fadeElapsed / this.config.defeatFadeOutDuration,
          1
        );
        this.container.alpha = 1 - fadeT;
        if (fadeT >= 1) {
          this.defeatPhase = "done";
        }
        break;
      }
      case "done":
        // 완전히 사라진 상태 유지
        break;
    }
  }

  private _updateRevive(deltaMS: number) {
    this.reviveElapsed += deltaMS;
    const t = Math.min(this.reviveElapsed / this.config.reviveDuration, 1);
    // ease-out 페이드인
    this.container.alpha = 1 - (1 - t) * (1 - t);

    if (t >= 1) {
      this.container.alpha = 1;
      this.state = "idle";
    }
  }

  destroy() {
    this.renderTexture?.destroy(true);
    this.container.destroy({ children: true });
  }
}
