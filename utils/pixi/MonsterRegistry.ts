// 몬스터 정의. 각 몬스터는 상태별(idle/run/attack/hit/die) 가로 스프라이트 시트를 가진다.
// 한 시트 = 한 동작, 가로로 프레임 나열(1행). 프레임 크기는 몬스터마다 다름(frameWidth/Height).
// 현재 전투 흐름에서 트리거되는 상태: idle(평소)·hit(피격)·die(처치).
// run/attack은 에셋·데이터로 보유만 하고 트리거는 추후(이동/반격 로직 도입 시) 연결.

export type MonsterStateName = "idle" | "run" | "attack" | "hit" | "die";

export interface MonsterClip {
  src: string;
  frames: number; // 가로 프레임 개수
}

export interface MonsterDef {
  id: string;
  name: string;
  hp: number; // 몬스터 최대 체력
  scale?: number; // 표시 크기 배율 (기본 1.0) — 프레임 높이 기준
  frameWidth: number; // 시트 한 프레임 너비(px)
  frameHeight: number; // 시트 한 프레임 높이(px)
  clips: Record<MonsterStateName, MonsterClip>;
}

/** 퀘스트 난이도별 데미지 */
export const QUEST_DAMAGE: Record<string, number> = {
  easy: 10,
  normal: 20,
  hard: 30,
};

const SLIME = "/images/characters/orange-slime";
const BUSH = "/images/characters/bush-monster";

export const MONSTERS: MonsterDef[] = [
  {
    id: "orange-slime",
    name: "Orange Slime",
    hp: 30,
    scale: 1.8,
    frameWidth: 64,
    frameHeight: 64,
    clips: {
      idle: { src: `${SLIME}/Orange_Slime-Idle.png`, frames: 7 },
      run: { src: `${SLIME}/Orange_Slime-Run.png`, frames: 6 },
      attack: { src: `${SLIME}/Orange_Slime-Attack_Ground.png`, frames: 12 },
      hit: { src: `${SLIME}/Orange_Slime-Hit_Ground.png`, frames: 4 },
      die: { src: `${SLIME}/Orange_Slime-Die_Ground.png`, frames: 11 },
    },
  },
  {
    id: "bush-monster",
    name: "Bush Monster",
    hp: 60,
    scale: 1.5,
    frameWidth: 90,
    frameHeight: 64,
    clips: {
      idle: { src: `${BUSH}/Bush_Monster-Idle.png`, frames: 8 },
      run: { src: `${BUSH}/Bush_Monster-Run.png`, frames: 7 },
      attack: { src: `${BUSH}/Bush_Monster-Attack.png`, frames: 18 },
      hit: { src: `${BUSH}/Bush_Monster-Hit.png`, frames: 4 },
      die: { src: `${BUSH}/Bush_Monster-Die.png`, frames: 14 },
    },
  },
];

/** killCount 기반으로 다음 몬스터를 순환 반환 */
export function getMonsterByKillCount(killCount: number): MonsterDef {
  return MONSTERS[killCount % MONSTERS.length];
}
