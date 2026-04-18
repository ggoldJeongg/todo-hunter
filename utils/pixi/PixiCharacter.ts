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
  | "reviving";

export interface AnimationConfig {
  moveDuration: number; // 이동 시간 (ms), 기본 500
  moveForwardTarget: { xPercent: number; yPercent: number }; // 전진 목표 (%)
  attackFrameRate: number; // 공격 프레임 간격 (ms), 기본 100
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
  shakeAmplitude: 3,
  shakeStepDuration: 100,
  defeatFadeDuration: 700,
  defeatTextDelay: 400,
  defeatFadeOutDelay: 800,
  defeatFadeOutDuration: 600,
  reviveDuration: 500,
};

const SPRITE_SIZE = 120;

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
  private idleFrame = 0;
  private attackFrames: number[] = [];
  private renderTexture: RenderTexture | null = null;
  private currentCompositeFrame = -1;

  // 몬스터 프레임 (이미지 기반)
  private monsterTextures: Texture[] = [];
  private monsterFrameIdx = 0;
  private monsterFrameElapsed = 0;
  private isCanvasMode = false;

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
    config: Partial<AnimationConfig> = {}
  ) {
    this.homeXPercent = homeXPercent;
    this.homeYPercent = homeYPercent;
    this.flip = flip;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.sprite = new Sprite(Texture.EMPTY);
    this.sprite.width = SPRITE_SIZE;
    this.sprite.height = SPRITE_SIZE;
    this.sprite.anchor.set(0.5, 1.0); // 바닥 중앙 기준

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
        fontFamily: "Galmuri11, monospace",
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

  /** 몬스터: 이미지 프레임 설정 */
  setMonsterFrames(textures: Texture[], scale: number = 1.0) {
    this.isCanvasMode = false;
    this.monsterTextures = textures;
    if (textures.length > 0) {
      this.sprite.texture = textures[0];
      // 몬스터는 flip이면 scale.x가 이미 -1
      const absScaleX = (SPRITE_SIZE / textures[0].width) * scale;
      const absScaleY = (SPRITE_SIZE / textures[0].height) * scale;
      this.sprite.scale.set(
        this.flip ? -absScaleX : absScaleX,
        absScaleY
      );
    }
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
  }

  startMoveBack() {
    this.state = "movingBack";
    this.moveElapsed = 0;
    this.moveStartX = this.container.x;
    this.moveStartY = this.container.y;
    this.moveTargetX = (this.homeXPercent / 100) * this.sceneWidth;
    this.moveTargetY = (this.homeYPercent / 100) * this.sceneHeight;
  }

  startAttack() {
    this.state = "attacking";
    this.attackFrameIdx = 0;
    this.attackElapsed = 0;
  }

  startShake() {
    this.state = "shaking";
    this.shakeStep = 0;
    this.shakeElapsed = 0;
  }

  setDefeated() {
    this.state = "defeated";
    this.defeatProgress = 0;
    this.defeatPhase = "darken";
    this.clearText.alpha = 0;
    this.clearText.scale.set(1);
  }

  /** 부활: 페이드인으로 복귀 */
  revive() {
    this.state = "reviving";
    this.reviveElapsed = 0;
    this.defeatPhase = "darken";
    this.clearText.alpha = 0;
    this.defeatOverlay.alpha = 0;
    this.container.alpha = 0;
  }

  setIdle() {
    this.state = "idle";
    this.container.x = (this.homeXPercent / 100) * this.sceneWidth;
    this.container.y = (this.homeYPercent / 100) * this.sceneHeight;

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
        this._updateMove(deltaMS);
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
    }
  }

  private _updateIdle(deltaMS: number) {
    // 몬스터: 프레임 순환
    if (!this.isCanvasMode && this.monsterTextures.length > 1) {
      this.monsterFrameElapsed += deltaMS;
      if (this.monsterFrameElapsed >= 150) {
        this.monsterFrameElapsed = 0;
        this.monsterFrameIdx =
          (this.monsterFrameIdx + 1) % this.monsterTextures.length;
        this.sprite.texture = this.monsterTextures[this.monsterFrameIdx];
      }
    }
  }

  private _updateMove(deltaMS: number) {
    this.moveElapsed += deltaMS;
    const t = Math.min(this.moveElapsed / this.config.moveDuration, 1);
    // ease-out quadratic
    const eased = 1 - (1 - t) * (1 - t);

    this.container.x =
      this.moveStartX + (this.moveTargetX - this.moveStartX) * eased;
    this.container.y =
      this.moveStartY + (this.moveTargetY - this.moveStartY) * eased;

    if (t >= 1) {
      this.state = "idle";
    }
  }

  private _updateAttack(renderer: Renderer, deltaMS: number) {
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
    this.shakeElapsed += deltaMS;
    if (this.shakeElapsed >= this.config.shakeStepDuration) {
      this.shakeElapsed = 0;
      this.shakeStep++;

      if (this.shakeStep >= this.shakeSequence.length) {
        this.container.x = (this.homeXPercent / 100) * this.sceneWidth;
        this.state = "idle";
        return;
      }
    }

    const baseX = (this.homeXPercent / 100) * this.sceneWidth;
    const direction = this.shakeSequence[this.shakeStep] ?? 0;
    this.container.x = baseX + direction * this.config.shakeAmplitude;
  }

  private _updateDefeat(deltaMS: number) {
    this.defeatProgress += deltaMS;

    switch (this.defeatPhase) {
      case "darken": {
        // 1단계: 검은 오버레이 서서히 적용
        const t = Math.min(
          this.defeatProgress / this.config.defeatFadeDuration,
          1
        );
        this.defeatOverlay.alpha = t * 0.6;
        if (this.defeatProgress >= this.config.defeatTextDelay) {
          this.defeatPhase = "text";
        }
        break;
      }
      case "text": {
        // 2단계: CLEAR! 텍스트 팝업 (스케일 + 알파)
        this.defeatOverlay.alpha = 0.6;
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
