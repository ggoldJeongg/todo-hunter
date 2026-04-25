import { Application, Container } from "pixi.js";
import { PixiCharacter } from "./PixiCharacter";
import { loadSpriteLayers, loadTexture } from "./PixiSpriteCompositor";
import { useQuestStore } from "@/utils/stores/questStore";
import {
  BATTLE_THEMES,
  type BattleThemeId,
  type BattleTheme,
} from "./BattleThemes";
import { getMonsterByKillCount } from "./MonsterRegistry";

// 스프라이트 경로
const IDLE_PATH = "/images/asprites/char_a_p1";
const ATTACK_PATH = "/images/asprites/char_a_pONE1";

const PLAYER_IDLE_LAYERS = [
  `${IDLE_PATH}/char_a_p1_0bas_humn_v00.png`,
  `${IDLE_PATH}/1out/char_a_p1_1out_fstr_v01.png`,
  `${IDLE_PATH}/4har/char_a_p1_4har_bob1_v01.png`,
  // idle 시트(char_a_p1)에는 무기 폴더가 없어서 attack 시트의 sword 레이어를 빌려옴.
  // 두 시트가 같은 8행 매핑이라 frame 48(오른쪽 idle) 위치에 칼이 정상 합성됨.
  `${ATTACK_PATH}/6tla/char_a_pONE1_6tla_sw01_v01.png`,
];

const PLAYER_ATTACK_LAYERS = [
  `${ATTACK_PATH}/char_a_pONE1_0bas_humn_v00.png`,
  `${ATTACK_PATH}/1out/char_a_pONE1_1out_fstr_v01.png`,
  `${ATTACK_PATH}/4har/char_a_pONE1_4har_bob1_v01.png`,
  `${ATTACK_PATH}/6tla/char_a_pONE1_6tla_sw01_v01.png`,
];

// 화면 셰이크 설정
const SCREEN_SHAKE_INTENSITY = 4;
const SCREEN_SHAKE_DURATION = 300;
const SCREEN_SHAKE_FREQUENCY = 30;

export type PositionCallback = (
  playerPos: { x: number; y: number },
  monsterPos: { x: number; y: number }
) => void;

export class PixiBattleScene {
  private app: Application | null = null;
  private player: PixiCharacter | null = null;
  private monster: PixiCharacter | null = null;
  private unsubscribe: (() => void) | null = null;
  private width = 0;
  private height = 0;

  // 위치 콜백
  private onPositionUpdate: PositionCallback | null = null;

  // 테마
  private theme: BattleTheme = BATTLE_THEMES.night;
  private bgContainer: Container | null = null;

  // 화면 셰이크
  private screenShakeActive = false;
  private screenShakeElapsed = 0;

  setPositionCallback(cb: PositionCallback) {
    this.onPositionUpdate = cb;
  }

  async init(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    themeId: BattleThemeId = "night"
  ) {
    this.width = width;
    this.height = height;
    this.theme = BATTLE_THEMES[themeId];

    this.app = new Application();
    await this.app.init({
      canvas,
      width,
      height,
      background: this.theme.bgColor,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
    });

    this._buildBackground(width, height);
    await this._buildCharacters(width, height);
    this._startTicker();
    this._subscribeStore();
  }

  /** 런타임에 테마 변경 */
  setTheme(themeId: BattleThemeId) {
    if (!this.app) return;
    this.theme = BATTLE_THEMES[themeId];

    // 배경색 변경
    this.app.renderer.background.color = this.theme.bgColor;

    // 배경 재구성
    this._rebuildBackground();
  }

  private _buildBackground(width: number, height: number) {
    if (!this.app) return;

    this.bgContainer = this.theme.buildBackground(width, height);
    this.app.stage.addChildAt(this.bgContainer, 0);
  }

  private _rebuildBackground() {
    if (!this.app) return;

    // 기존 배경 제거
    if (this.bgContainer) {
      this.app.stage.removeChild(this.bgContainer);
      this.bgContainer.destroy({ children: true });
    }

    this.bgContainer = this.theme.buildBackground(this.width, this.height);
    this.app.stage.addChildAt(this.bgContainer, 0);
  }

  private async _buildCharacters(width: number, height: number) {
    if (!this.app) return;

    // player yPercent를 monster보다 아래로 둠 — LPC 64x64 frame 안에서 캐릭터가
    // 위쪽에 그려져 anchor 1.0(frame bottom)이 시각적 발보다 아래쪽 padding을 가짐.
    // 그래서 같은 yPercent면 player가 위에 떠보임. yPercent를 키워 frame bottom을
    // 그라운드 라인 아래로 보내면 시각적 발이 그라운드와 일치.
    // 둘 다 yPercent 90 (화면 밑에서 10% 위)에 발 정렬.
    // player는 LPC frame 안 캐릭터가 위쪽~중간에 그려져 있으므로 anchorY=0.85
    // (frame bottom의 15% 위가 시각적 발). monster는 mushroom이 이미지를 꽉 채워 anchorY=1.0.
    this.player = new PixiCharacter(
      30,
      90,
      false,
      { moveForwardTarget: { xPercent: 65, yPercent: 90 } },
      0.8
    );
    this.player.setSceneSize(width, height);

    this.monster = new PixiCharacter(72, 90, true, {}, 1.2);
    this.monster.setSceneSize(width, height);

    // monster 먼저, player 나중에 addChild → 겹칠 때 player가 위에 그려짐
    this.app.stage.addChild(this.monster.container);
    this.app.stage.addChild(this.player.container);

    const initialMonster = getMonsterByKillCount(useQuestStore.getState().killCount);

    const [idleLayers, attackLayers, monsterTextures] = await Promise.all([
      loadSpriteLayers(PLAYER_IDLE_LAYERS),
      loadSpriteLayers(PLAYER_ATTACK_LAYERS),
      Promise.all(initialMonster.frames.map(loadTexture)),
    ]);

    const renderer = this.app.renderer;

    // 시트 매핑 (8행 × 8열, 행 단위 동작):
    //   1행 [0~7]   점프
    //   2행 [8~15]  사다리
    //   3행 [16~23] 오른쪽 때리기  ← 공격 (캐릭터가 오른쪽 몬스터를 침)
    //   4행 [24~31] 왼쪽 때리기
    //   5행 [32~39] 앞으로 전진
    //   6행 [40~47] 뒤로
    //   7행 [48~55] 오른쪽 걷기/뛰기 ← walk forward (몬스터 쪽으로) + idle 첫 프레임을 오른쪽 보는 자세로 사용
    //   8행 [56~63] 왼쪽 걷기/뛰기   ← walk back (홈 복귀)
    this.player.setIdleLayers(renderer, idleLayers, 48);
    this.player.setAttackLayers(attackLayers, [16, 17, 18, 19, 20, 21, 22, 23]);
    this.player.setWalkLayers(
      idleLayers,
      [48, 49, 50, 51, 52, 53, 54, 55],
      [56, 57, 58, 59, 60, 61, 62, 63]
    );
    this.monster.setMonsterFrames(monsterTextures, initialMonster.scale ?? 1.0);
  }

  /** 몬스터를 새 프레임으로 교체 */
  async swapMonster(killCount: number) {
    if (!this.monster) return;
    const monsterDef = getMonsterByKillCount(killCount);
    const textures = await Promise.all(monsterDef.frames.map(loadTexture));
    this.monster.setMonsterFrames(textures, monsterDef.scale ?? 1.0);
  }

  private _startScreenShake() {
    this.screenShakeActive = true;
    this.screenShakeElapsed = 0;
  }

  private _startTicker() {
    if (!this.app) return;

    this.app.ticker.add((ticker) => {
      const deltaMS = ticker.deltaMS;
      const renderer = this.app!.renderer;

      this.player?.update(renderer, deltaMS);
      this.monster?.update(renderer, deltaMS);

      // 위치 콜백
      if (this.onPositionUpdate && this.player && this.monster) {
        this.onPositionUpdate(
          { x: this.player.container.x, y: this.player.container.y },
          { x: this.monster.container.x, y: this.monster.container.y }
        );
      }

      // 화면 셰이크
      if (this.screenShakeActive) {
        this.screenShakeElapsed += deltaMS;
        if (this.screenShakeElapsed >= SCREEN_SHAKE_DURATION) {
          this.screenShakeActive = false;
          this.app!.stage.x = 0;
          this.app!.stage.y = 0;
        } else {
          const decay =
            1 - this.screenShakeElapsed / SCREEN_SHAKE_DURATION;
          const intensity = SCREEN_SHAKE_INTENSITY * decay;
          const phase =
            (this.screenShakeElapsed / SCREEN_SHAKE_FREQUENCY) * Math.PI * 2;
          this.app!.stage.x = Math.sin(phase) * intensity;
          this.app!.stage.y = Math.cos(phase * 1.3) * intensity * 0.6;
        }
      }
    });
  }

  private _subscribeStore() {
    this.unsubscribe = useQuestStore.subscribe((state, prevState) => {
      if (!this.player || !this.monster) return;

      // 이동 시작
      if (state.isMoving && !prevState.isMoving) {
        if (state.isMovingForward) {
          this.player.startMoveForward();
        } else {
          this.player.startMoveBack();
        }
      }

      // 이동 중 방향 전환
      if (
        state.isMoving &&
        prevState.isMoving &&
        state.isMovingForward !== prevState.isMovingForward
      ) {
        if (state.isMovingForward) {
          this.player.startMoveForward();
        } else {
          this.player.startMoveBack();
        }
      }

      // 공격 시작 → 화면 셰이크 + 히트 플래시 + 몬스터 피격
      if (state.isAttacking && !prevState.isAttacking) {
        this.player.startAttack();
        this.monster.startShake();
        this._startScreenShake();
      }

      // 공격 종료 → idle 복원
      if (!state.isAttacking && prevState.isAttacking) {
        this.player.setIdle();
      }

      // 처치
      if (state.isDefeated && !prevState.isDefeated) {
        this.monster.setDefeated();
      }

      // 부활: defeated가 해제되면 몬스터 페이드인 복귀
      if (!state.isDefeated && prevState.isDefeated) {
        this.monster.revive();
      }
    });
  }

  resize(width: number, height: number) {
    if (!this.app) return;

    this.width = width;
    this.height = height;
    this.app.renderer.resize(width, height);

    this.player?.setSceneSize(width, height);
    this.monster?.setSceneSize(width, height);

    // 배경 재구성
    this._rebuildBackground();
  }

  destroy() {
    this.unsubscribe?.();
    this.player?.destroy();
    this.monster?.destroy();
    this.app?.destroy(false, { children: true });
    this.app = null;
  }
}
