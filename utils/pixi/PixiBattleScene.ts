import { Application, Container, Graphics } from "pixi.js";
import { PixiCharacter } from "./PixiCharacter";
import { loadSpriteStrip, loadSpriteFrames } from "./PixiSpriteCompositor";
import { useQuestStore } from "@/utils/stores/questStore";
import {
  BATTLE_THEMES,
  type BattleThemeId,
  type BattleTheme,
} from "./BattleThemes";
import { getMonsterByKillCount, type MonsterDef } from "./MonsterRegistry";
import { SWORDSMAN_CLIPS, SWORDSMAN_SHEET } from "@/utils/sprite/swordsman";

// 지면선 확인용 디버그 오버레이. 값이 확정되면 false 로.
const DEBUG_GROUND_LINE = false;

// 플레이어(swordsman) 스프라이트는 발이 살짝 위에 잡혀, 지면선에 맞도록 이만큼 더 내린다(px).
const PLAYER_FOOT_NUDGE_PX = 8;

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

  // 지면선 디버그 오버레이
  private groundLine: Graphics | null = null;

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
    this._drawGroundLine();
    this._startTicker();
    this._subscribeStore();
  }

  /** 지면선(groundY) 디버그 오버레이. 캐릭터 발이 이 선에 닿는지 확인용. */
  private _drawGroundLine() {
    if (!DEBUG_GROUND_LINE || !this.app) return;
    if (this.groundLine) {
      this.app.stage.removeChild(this.groundLine);
      this.groundLine.destroy();
      this.groundLine = null;
    }
    const y = (this.theme.groundY / 100) * this.height;
    const g = new Graphics();
    g.rect(0, y - 1, this.width, 2).fill({ color: 0xff00ff, alpha: 0.9 });
    // 눈금 (10% 간격) — 값 조절 참고용
    for (let p = 70; p <= 98; p += 2) {
      const ty = (p / 100) * this.height;
      g.rect(0, ty, 6, 1).fill({ color: 0xffffff, alpha: 0.5 });
    }
    this.app.stage.addChild(g); // 캐릭터 위에 그려 확인 쉽게
    this.groundLine = g;
  }

  /** 런타임에 테마 변경 */
  setTheme(themeId: BattleThemeId) {
    if (!this.app) return;
    this.theme = BATTLE_THEMES[themeId];

    // 배경색 변경
    this.app.renderer.background.color = this.theme.bgColor;

    // 바닥선(groundY)이 테마마다 다를 수 있으므로 캐릭터 발 위치 갱신
    // 플레이어는 발 보정(3px)을 유지.
    this.player?.setHomeY(this.theme.groundY + (PLAYER_FOOT_NUDGE_PX / this.height) * 100);
    this.monster?.setHomeY(this.theme.groundY);

    // 배경 재구성
    this._rebuildBackground();
    this._drawGroundLine();
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

    // 플레이어·몬스터 모두 테마 바닥선(groundY %)에 발을 맞춘다.
    // anchorY는 초기값일 뿐, setAutoFoot로 실제 발(불투명 최하단)을 측정해 자동 보정한다.
    const groundY = this.theme.groundY;
    // 플레이어만 발 보정: 지면선보다 3px 아래에 발을 두어 선에 딱 맞춘다.
    const playerY = groundY + (PLAYER_FOOT_NUDGE_PX / height) * 100;

    this.player = new PixiCharacter(
      30,
      playerY,
      false,
      { moveForwardTarget: { xPercent: 60, yPercent: playerY } },
      0.9
    );
    this.player.setAutoFoot(true);
    this.player.setSceneSize(width, height);

    // 새 몬스터 시트는 기본적으로 왼쪽(플레이어)을 바라봄 → flip=false
    this.monster = new PixiCharacter(72, groundY, false, {}, 1.0);
    this.monster.setAutoFoot(true);
    this.monster.setSceneSize(width, height);

    // monster 먼저, player 나중에 addChild → 겹칠 때 player가 위에 그려짐
    this.app.stage.addChild(this.monster.container);
    this.app.stage.addChild(this.player.container);

    const initialMonster = getMonsterByKillCount(useQuestStore.getState().killCount);

    // 모든 동작이 한 시트(SWORDSMAN_SHEET)에 행으로 들어있다 → 행(row)별로 슬라이스.
    const [idleClip, walkClip, attackClip, monsterClips] = await Promise.all([
      loadSpriteStrip(SWORDSMAN_SHEET, SWORDSMAN_CLIPS.idle.frames, SWORDSMAN_CLIPS.idle.row),
      loadSpriteStrip(SWORDSMAN_SHEET, SWORDSMAN_CLIPS.walk.frames, SWORDSMAN_CLIPS.walk.row),
      loadSpriteStrip(SWORDSMAN_SHEET, SWORDSMAN_CLIPS.attack.frames, SWORDSMAN_CLIPS.attack.row),
      this._loadMonsterClips(initialMonster),
    ]);

    // idle 순환 / 이동 중 walk 순환 / 공격 시 attack 재생.
    this.player.setSpriteClips({
      idle: idleClip,
      walk: walkClip,
      attack: attackClip,
    });
    this.monster.setMonsterClips(
      monsterClips,
      initialMonster.frameWidth,
      initialMonster.frameHeight,
      initialMonster.scale ?? 1.0
    );
  }

  /** 몬스터 정의의 상태별 시트를 모두 슬라이스해 Texture[] 클립으로 로드 */
  private async _loadMonsterClips(def: MonsterDef) {
    const { frameWidth: fw, frameHeight: fh, clips } = def;
    const [idle, run, attack, hit, die] = await Promise.all([
      loadSpriteFrames(clips.idle.src, clips.idle.frames, fw, fh),
      loadSpriteFrames(clips.run.src, clips.run.frames, fw, fh),
      loadSpriteFrames(clips.attack.src, clips.attack.frames, fw, fh),
      loadSpriteFrames(clips.hit.src, clips.hit.frames, fw, fh),
      loadSpriteFrames(clips.die.src, clips.die.frames, fw, fh),
    ]);
    return { idle, run, attack, hit, die };
  }

  /** 몬스터를 새 상태 클립으로 교체 */
  async swapMonster(killCount: number) {
    if (!this.monster) return;
    const def = getMonsterByKillCount(killCount);
    const clips = await this._loadMonsterClips(def);
    this.monster.setMonsterClips(
      clips,
      def.frameWidth,
      def.frameHeight,
      def.scale ?? 1.0
    );
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

      // 공격 종료 → idle 복원.
      // 단, 같은 set()에서 후퇴(isMoving)가 동시에 시작되면 setIdle이 startMoveBack을
      // 덮어써 back 모션이 사라지므로, 이동이 시작되지 않을 때만 idle 복원한다.
      if (!state.isAttacking && prevState.isAttacking && !state.isMoving) {
        this.player.setIdle();
      }

      // 처치
      if (state.isDefeated && !prevState.isDefeated) {
        this.monster.setDefeated();
      }

      // 부활: defeated가 해제되면(=다음 몬스터 젠) 새 몬스터로 교체 후 페이드인.
      // 교체를 이 시점까지 미뤄야 직전 몬스터의 die 애니메이션이 정상 재생된다.
      // (killCount는 처치 즉시 증가하므로, 교체를 killCount에 묶으면 die가 다음 몬스터 걸로 나옴)
      if (!state.isDefeated && prevState.isDefeated) {
        this.swapMonster(state.killCount).then(() => this.monster?.revive());
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
    this._drawGroundLine();
  }

  destroy() {
    this.unsubscribe?.();
    this.player?.destroy();
    this.monster?.destroy();
    this.app?.destroy(false, { children: true });
    this.app = null;
  }
}
