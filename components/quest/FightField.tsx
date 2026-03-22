"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import CharacterMotion from "./CharactersMotion";
import { useQuestStore } from "@/utils/stores/questStore";
import useProgressStore from "@/utils/stores/useProgressStore";
import type { LayerConfig } from "@/utils/sprite/SpriteLayerRenderer";

const BASE_PATH = "/images/asprites/char_a_p1";

// FightField에서 상태 추가
const FightField = () => {
  const { isMoving, isMovingForward, isAttacking, isDefeated, setDefeated } = useQuestStore();
  const { progress } = useProgressStore();

  React.useEffect(() => {
    if (progress >= 100) {
      setDefeated(true);
    }
  }, [progress, setDefeated]);

  const playerSpriteLayers: LayerConfig[] = useMemo(() => [
    { src: `${BASE_PATH}/char_a_p1_0bas_humn_v00.png` },
    { src: `${BASE_PATH}/1out/char_a_p1_1out_fstr_v01.png` },
    { src: `${BASE_PATH}/4har/char_a_p1_4har_bob1_v01.png` },
  ], []);

  const playerIdleFrames = [
    "/images/characters/player/idle01.png",
    "/images/characters/player/idle02.png",
    "/images/characters/player/idle03.png",
    "/images/characters/player/idle04.png",
  ];

  const playerAttackFrames = [
    "/images/characters/player/attack1.png",
    "/images/characters/player/attack2.png",
    "/images/characters/player/attack3.png",
    "/images/characters/player/attack4.png",
  ];

  const werewolfIdleFrames = [
    "/images/characters/werewolf/werewolf-idle1.png",
    "/images/characters/werewolf/werewolf-idle2.png",
    "/images/characters/werewolf/werewolf-idle3.png",
  ];

  return (
    <div className="relative w-full h-[35vw] max-h-[150px]">
      <Image
        src="/images/backgrounds/underwater-fantasy-background3.png"
        alt="field image"
        fill
        style={{ objectFit: "cover" }}
        priority
      />

      {/* 플레이어 (Canvas 레이어 합성) */}
      <CharacterMotion
        idleFrames={playerIdleFrames}
        attackFrames={playerAttackFrames}
        alt="Player"
        top="60%"
        left="30%"
        isMoving={isMoving}
        isMovingForward={isMovingForward}
        isAttacking={isAttacking}
        useCanvas={true}
        spriteLayers={playerSpriteLayers}
      />

      {/* 몬스터 (werewolf) */}
      {!isDefeated && (
        <CharacterMotion
          idleFrames={werewolfIdleFrames}
          alt="Werewolf"
          top="60%"
          left="70%"
          flip={true}
          isShaking={isAttacking}
          isDefeated={isDefeated} attackFrames={[]}        />
      )}
    </div>
  );
};

export default FightField;
