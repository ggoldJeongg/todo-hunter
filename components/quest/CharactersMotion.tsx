import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  loadLayers,
  renderLayers,
  type LayerConfig,
  type SpriteSheet,
} from "@/utils/sprite/SpriteLayerRenderer";

interface CharacterProps {
  idleFrames: string[];
  attackFrames: string[];
  alt: string;
  top: string;
  left: string;
  flip?: boolean;
  frameRate?: number;
  isMoving?: boolean;
  isMovingForward?: boolean;
  isAttacking?: boolean;
  isDefeated?: boolean;
  isShaking?: boolean;
  useCanvas?: boolean;
  spriteLayers?: LayerConfig[];
  spriteIdleFrame?: number;
  attackSpriteLayers?: LayerConfig[];
  attackSpriteFrames?: number[];
}

const CANVAS_SIZE = 120;

const CharacterMotion: React.FC<CharacterProps> = ({
  idleFrames,
  attackFrames,
  alt,
  top,
  left,
  flip = false,
  frameRate = 100,
  isMoving = false,
  isMovingForward = true,
  isAttacking = false,
  isDefeated = false,
  isShaking = false,
  useCanvas = false,
  spriteLayers,
  spriteIdleFrame = 0,
  attackSpriteLayers,
  attackSpriteFrames = [0, 1, 2, 3, 4, 5, 6, 7],
}) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [position, setPosition] = useState({ top, left });
  const [opacity, setOpacity] = useState(1);
  const [shake, setShake] = useState("");

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const idleSheetsRef = useRef<SpriteSheet[]>([]);
  const attackSheetsRef = useRef<SpriteSheet[]>([]);
  const attackFrameIdxRef = useRef(0);
  const attackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // idle 레이어 로드 및 첫 프레임 렌더
  useEffect(() => {
    if (!useCanvas || !spriteLayers) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.imageSmoothingEnabled = false;

    loadLayers(spriteLayers).then((sheets) => {
      idleSheetsRef.current = sheets;
      renderLayers(ctx, sheets, spriteIdleFrame, CANVAS_SIZE, CANVAS_SIZE);
    });
  }, [useCanvas, spriteLayers, spriteIdleFrame]);

  // 공격 레이어 사전 로드
  useEffect(() => {
    if (!useCanvas || !attackSpriteLayers) return;
    loadLayers(attackSpriteLayers).then((sheets) => {
      attackSheetsRef.current = sheets;
    });
  }, [useCanvas, attackSpriteLayers]);

  // 공격 애니메이션 (canvas)
  useEffect(() => {
    if (!useCanvas) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    if (isAttacking && attackSheetsRef.current.length > 0) {
      attackFrameIdxRef.current = 0;
      attackTimerRef.current = setInterval(() => {
        ctx.imageSmoothingEnabled = false;
        const fi = attackSpriteFrames[attackFrameIdxRef.current];
        renderLayers(ctx, attackSheetsRef.current, fi, CANVAS_SIZE, CANVAS_SIZE);
        attackFrameIdxRef.current =
          (attackFrameIdxRef.current + 1) % attackSpriteFrames.length;
      }, frameRate);
    } else {
      // 공격 끝 → idle 프레임 복귀
      if (idleSheetsRef.current.length > 0) {
        ctx.imageSmoothingEnabled = false;
        renderLayers(ctx, idleSheetsRef.current, spriteIdleFrame, CANVAS_SIZE, CANVAS_SIZE);
      }
    }

    return () => {
      if (attackTimerRef.current) {
        clearInterval(attackTimerRef.current);
        attackTimerRef.current = null;
      }
    };
  }, [useCanvas, isAttacking, attackSpriteFrames, frameRate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const frames = isAttacking ? attackFrames : idleFrames;

    if (isMoving) {
      setPosition({
        top: "60%",
        left: isMovingForward ? "65%" : left,
      });

      if (!isMovingForward) {
        setTimeout(() => {
          setPosition({ top, left });
        }, 600);
      }
    }

    // 비-canvas 모드에서만 Image 프레임 순환
    if (!useCanvas && isAttacking) {
      interval = setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % frames.length);
      }, frameRate);
    }

    if (isDefeated) {
      // 사라지지 않고 검은색 오버레이 상태 유지
    }

    if (isShaking) {
      setShake("translateX(-3px)");
      setTimeout(() => setShake("translateX(3px)"), 100);
      setTimeout(() => setShake("translateX(-3px)"), 200);
      setTimeout(() => setShake("translateX(3px)"), 300);
      setTimeout(() => setShake("translateX(0)"), 400);
    } else {
      setShake("");
    }

    return () => clearInterval(interval);
  }, [useCanvas, isAttacking, isDefeated, isMoving, isMovingForward, isShaking, attackFrames, frameRate, idleFrames, left, top]);

  return (
    <div
      className="absolute cursor-pointer transition-all duration-500"
      style={{
        top: position.top,
        left: position.left,
        transform: `translate(-50%, -50%) ${flip ? "scaleX(-1)" : ""} ${shake}`,
        opacity,
        animation: isShaking ? "shake 0.5s infinite" : "none",
      }}
    >
      {useCanvas && spriteLayers ? (
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <div className="relative">
          <Image src={isAttacking ? attackFrames[currentFrame] : idleFrames[currentFrame]} alt={alt} width={120} height={120} />
          {isDefeated && (
            <div
              className="absolute inset-0 bg-black rounded transition-opacity duration-700"
              style={{ opacity: 0.6, mixBlendMode: "multiply" }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CharacterMotion;
