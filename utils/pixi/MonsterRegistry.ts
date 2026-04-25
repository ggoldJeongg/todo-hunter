export interface MonsterDef {
  id: string;
  name: string;
  frames: string[];
  scale?: number; // 스프라이트 크기 배율 (기본 1.0)
  hp: number; // 몬스터 최대 체력
}

/** 퀘스트 난이도별 데미지 */
export const QUEST_DAMAGE: Record<string, number> = {
  easy: 10,
  normal: 20,
  hard: 30,
};

export const MONSTERS: MonsterDef[] = [
  {
    id: "mushroom",
    name: "Mushroom",
    hp: 30,
    scale: 0.5,
    frames: [
      "/images/characters/mushroom/0__0000_Layer-1.png",
      "/images/characters/mushroom/0__0001_Layer-2.png",
      "/images/characters/mushroom/0__0002_Layer-3.png",
      "/images/characters/mushroom/0__0003_Layer-4.png",
      "/images/characters/mushroom/0__0004_Layer-5.png",
      "/images/characters/mushroom/0__0005_Layer-6.png",
      "/images/characters/mushroom/0__0006_Layer-7.png",
      "/images/characters/mushroom/0__0007_Layer-8.png",
      "/images/characters/mushroom/0__0008_Layer-9.png",
      "/images/characters/mushroom/0__0009_Layer-10.png",
    ],
  },
  {
    id: "snake",
    name: "Snake",
    hp: 50,
    scale: 0.5,
    frames: [
      "/images/characters/snake/_0000_Layer-1.png",
      "/images/characters/snake/_0001_Layer-2.png",
      "/images/characters/snake/_0002_Layer-3.png",
      "/images/characters/snake/_0003_Layer-4.png",
    ],
  },
  {
    id: "flying-bird",
    name: "Flying Bird",
    hp: 70,
    scale: 0.5,
    frames: [
      "/images/characters/flying-bird/frame1.png",
      "/images/characters/flying-bird/frame2.png",
      "/images/characters/flying-bird/frame3.png",
      "/images/characters/flying-bird/frame4.png",
      "/images/characters/flying-bird/frame5.png",
      "/images/characters/flying-bird/frame6.png",
      "/images/characters/flying-bird/frame7.png",
    ],
  },
  {
    id: "werewolf",
    name: "Werewolf",
    hp: 100,
    scale: 0.5,
    frames: [
      "/images/characters/werewolf/werewolf-idle1.png",
      "/images/characters/werewolf/werewolf-idle2.png",
      "/images/characters/werewolf/werewolf-idle3.png",
      "/images/characters/werewolf/werewolf-idle4.png",
      "/images/characters/werewolf/werewolf-idle5.png",
    ],
  },
];

/** killCount 기반으로 다음 몬스터를 순환 반환 */
export function getMonsterByKillCount(killCount: number): MonsterDef {
  return MONSTERS[killCount % MONSTERS.length];
}
