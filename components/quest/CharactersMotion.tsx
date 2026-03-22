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
}) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [position, setPosition] = useState({ top, left });
  const [opacity, setOpacity] = useState(1);
  const [shake, setShake] = useState("");

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sheetsRef = useRef<SpriteSheet[]>([]);

  // Canvas 레이어 로드 및 첫 프레임 렌더
  useEffect(() => {
    if (!useCanvas || !spriteLayers) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.imageSmoothingEnabled = false;

    loadLayers(spriteLayers).then((sheets) => {
      sheetsRef.current = sheets;
      renderLayers(ctx, sheets, 0, CANVAS_SIZE, CANVAS_SIZE);
    });
  }, [useCanvas, spriteLayers]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const frames = isAttacking ? attackFrames : idleFrames;

    if (isMoving) {
      setPosition({
        top: "60%",
        left: isMovingForward ? "65%" : "30%",
      });

      if (!isMovingForward) {
        setTimeout(() => {
          setPosition({ top, left });
        }, 600);
      }
    }

    if (isAttacking) {
      interval = setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % frames.length);
      }, frameRate);
    }

    if (isDefeated) {
      setOpacity(1);
      setTimeout(() => {
        setOpacity(0);
      }, 500);
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
  }, [isAttacking, isDefeated, isMoving, isMovingForward, isShaking, attackFrames, frameRate, idleFrames, left, top]);

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
        <Image src={isAttacking ? attackFrames[currentFrame] : idleFrames[currentFrame]} alt={alt} width={120} height={120} />
      )}
    </div>
  );
};

export default CharacterMotion;
