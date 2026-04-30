"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  loadLayers,
  renderLayers,
  type LayerConfig,
  type SpriteSheet,
} from "@/utils/sprite/SpriteLayerRenderer";
import { useUserStore } from "@/utils/stores/userStore";
import {
  getOutfitSrc,
  getHairSrc,
  getHatSrc,
  DEFAULT_OUTFIT_ID,
  DEFAULT_HAIR_ID,
} from "@/constants/appearance";

const BASE_PATH = "/images/asprites/char_a_p1";
const BODY_SRC = `${BASE_PATH}/char_a_p1_0bas_humn_v00.png`;

const CANVAS_SIZE = 250;
const FRAMES_PER_ROW = 8;
const WALK_FRAME_INTERVAL = 150; // ms

type Direction = "down" | "up" | "right" | "left";

// 스프라이트 시트 행 매핑
//  5행(idx 4): 앞으로 걷기 (down, 앞모습)
//  6행(idx 5): 뒤로 걷기 (up, 뒷모습)
//  7행(idx 6): 오른쪽 걷기
//  8행(idx 7): 왼쪽 걷기
const ROW_BY_DIRECTION: Record<Direction, number> = {
  down: 4,
  up: 5,
  right: 6,
  left: 7,
};

interface CharacterProps {
  direction?: Direction;
  isWalking?: boolean;
}

const Character = ({ direction = "down", isWalking = false }: CharacterProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetsRef = useRef<SpriteSheet[]>([]);
  const frameRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const lastFrameTime = useRef(0);

  // userStore 의 외형
  const outfitId = useUserStore((s) => s.outfitId);
  const hairId = useUserStore((s) => s.hairId);
  const hatId = useUserStore((s) => s.hatId);

  // 절대 프레임 인덱스로 렌더 (idle 용 — [0][0] 고정)
  const renderAbsoluteFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || sheetsRef.current.length === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    renderLayers(ctx, sheetsRef.current, frameIndex, CANVAS_SIZE, CANVAS_SIZE);
    ctx.restore();
  }, []);

  // 걸을 때 — direction 행의 col 컬럼을 그림
  const renderWalkFrame = useCallback(
    (col: number) => {
      const row = ROW_BY_DIRECTION[direction];
      renderAbsoluteFrame(row * FRAMES_PER_ROW + col);
    },
    [direction, renderAbsoluteFrame]
  );

  // 스프라이트 로드 (외형 변경 시)
  useEffect(() => {
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
      sheetsRef.current = sheets;
      // 로드 직후 idle = 절대 [0][0] 프레임
      renderAbsoluteFrame(0);
    });
    return () => {
      cancelled = true;
    };
  }, [outfitId, hairId, hatId, renderAbsoluteFrame]);

  // 걷는 중 direction 바뀌면 즉시 재렌더 (정지 중엔 idle 유지)
  useEffect(() => {
    if (isWalking) {
      renderWalkFrame(frameRef.current);
    }
  }, [direction, isWalking, renderWalkFrame]);

  // 걷기 애니메이션
  useEffect(() => {
    if (!isWalking) {
      // 정지 = 절대 [0][0] 프레임 (sprite sheet 시작 자세)
      frameRef.current = 0;
      renderAbsoluteFrame(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTime.current >= WALK_FRAME_INTERVAL) {
        lastFrameTime.current = timestamp;
        frameRef.current = (frameRef.current + 1) % FRAMES_PER_ROW;
        renderWalkFrame(frameRef.current);
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isWalking, renderAbsoluteFrame, renderWalkFrame]);

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
