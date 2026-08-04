"use client";

import { useEffect, useRef } from "react";
import {
  SWORDSMAN_CLIPS,
  SWORDSMAN_SHEET,
  loadSpriteImage,
  drawSpriteFrame,
} from "@/utils/sprite/swordsman";

// 대화창 초상화.
// - imageSrc 지정 시: 해당 PNG 를 캔버스에 contain-fit 으로 렌더 (엔딩별 NPC 초상화)
// - imageSrc 없거나 로드 실패 시: swordsman idle 첫 프레임으로 폴백
// outfitId/hairId/hatId props 는 하위 호환을 위해 받기만 하고 사용하지 않음(단일 외형).
interface EndingPortraitProps {
  outfitId?: string | null;
  hairId?: string | null;
  hatId?: string | null;
  size?: number;
  /** true 이면 좌우 반전 (검사 스프라이트가 우측에서 좌측 방향 응시) */
  flipX?: boolean;
  /** 엔딩별 NPC 초상화 PNG 경로. 없거나 로드 실패 시 검사 스프라이트로 폴백 */
  imageSrc?: string;
}

// 이미지를 캔버스 안에 비율 유지하며 꽉 차게(contain) 그림. 픽셀아트라 스무딩 끔.
function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number,
  flipX: boolean
): void {
  const scale = Math.min(size / img.width, size / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flipX) {
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

export default function EndingPortrait({
  size = 96,
  flipX = false,
  imageSrc,
}: EndingPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    // 검사 스프라이트 폴백 (idle 첫 프레임)
    const drawSwordsman = () => {
      loadSpriteImage(SWORDSMAN_SHEET).then((img) => {
        if (cancelled) return;
        drawSpriteFrame(ctx, img, SWORDSMAN_CLIPS.idle, 0, size, size, flipX);
      });
    };

    if (imageSrc) {
      loadSpriteImage(imageSrc)
        .then((img) => {
          if (cancelled) return;
          drawContain(ctx, img, size, flipX);
        })
        .catch(() => {
          // NPC 초상화 PNG 아직 없음 → 검사 스프라이트로 폴백
          if (!cancelled) drawSwordsman();
        });
    } else {
      drawSwordsman();
    }

    return () => {
      cancelled = true;
    };
  }, [size, flipX, imageSrc]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
