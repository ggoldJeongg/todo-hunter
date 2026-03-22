"use client";

import { useEffect, useRef } from "react";
import {
  loadLayers,
  renderLayers,
  type LayerConfig,
  type SpriteSheet,
} from "@/utils/sprite/SpriteLayerRenderer";

const BASE_PATH = "/images/asprites/char_a_p1";

// 기본 장비 설정 (추후 store 연동)
const DEFAULT_LAYERS: LayerConfig[] = [
  { src: `${BASE_PATH}/char_a_p1_0bas_humn_v00.png` },
  { src: `${BASE_PATH}/1out/char_a_p1_1out_fstr_v01.png` },
  { src: `${BASE_PATH}/4har/char_a_p1_4har_bob1_v01.png` },
];

const CANVAS_SIZE = 250;

const Character = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetsRef = useRef<SpriteSheet[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.imageSmoothingEnabled = false;

    loadLayers(DEFAULT_LAYERS).then((sheets) => {
      sheetsRef.current = sheets;
      renderLayers(ctx, sheets, 0, CANVAS_SIZE, CANVAS_SIZE);
    });
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      style={{ imageRendering: "pixelated" }}
    />
  );
};

export default Character;
