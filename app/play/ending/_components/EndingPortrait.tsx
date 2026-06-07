"use client";

import { useEffect, useRef } from "react";
import {
  loadLayers,
  renderLayers,
  type LayerConfig,
} from "@/utils/sprite/SpriteLayerRenderer";
import {
  getOutfitSrc,
  getHairSrc,
  getHatSrc,
  DEFAULT_OUTFIT_ID,
  DEFAULT_HAIR_ID,
} from "@/constants/appearance";

const BASE_PATH = "/images/asprites/char_a_p1";
const BODY_SRC = `${BASE_PATH}/char_a_p1_0bas_humn_v00.png`;

// 5행(row 4) col 0 = 앞모습 idle 첫 프레임 — 대화창에서 정면 응시
const FRONT_IDLE_FRAME = 32;

interface EndingPortraitProps {
  outfitId?: string | null;
  hairId?: string | null;
  hatId?: string | null;
  size?: number;
  /** true 이면 좌우 반전 (npc 가 우측에서 좌측 방향 응시) */
  flipX?: boolean;
}

export default function EndingPortrait({
  outfitId,
  hairId,
  hatId,
  size = 96,
  flipX = false,
}: EndingPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.imageSmoothingEnabled = false;

    const layers: LayerConfig[] = [
      { src: BODY_SRC },
      { src: getOutfitSrc(outfitId) ?? getOutfitSrc(DEFAULT_OUTFIT_ID)! },
      { src: getHairSrc(hairId) ?? getHairSrc(DEFAULT_HAIR_ID)! },
    ];
    const hatSrc = getHatSrc(hatId);
    if (hatSrc) layers.push({ src: hatSrc });

    let cancelled = false;
    loadLayers(layers).then((sheets) => {
      if (cancelled) return;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      if (flipX) {
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
      }
      renderLayers(ctx, sheets, FRONT_IDLE_FRAME, size, size);
      ctx.restore();
    });

    return () => {
      cancelled = true;
    };
  }, [outfitId, hairId, hatId, size, flipX]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
