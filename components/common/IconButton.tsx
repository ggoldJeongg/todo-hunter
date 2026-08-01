"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  src: string;
  alt: string;
  /** 아이콘 한 변 px (정사각). 기본 20 */
  size?: number;
}

/**
 * 아이콘 버튼 — shrink-0 정사각 아이콘 + 클릭. (퀘스트 리스트 완료/수정/삭제/쪼개기 등)
 * onClick·disabled·title 등은 그대로 전달된다.
 */
export function IconButton({ src, alt, size = 20, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn("shrink-0 cursor-pointer disabled:cursor-not-allowed", className)}
      {...props}
    >
      <Image src={src} width={size} height={size} alt={alt} />
    </button>
  );
}
