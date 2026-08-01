"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ChoiceButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/**
 * 픽셀 토글/선택 버튼 — 활성 시 브라운 채움(bg-brand + ring), 비활성은 양피지.
 * 레이아웃(패딩·정렬)은 className 으로 넘긴다. (일간/주간·요일·난이도 선택 등)
 */
export function ChoiceButton({ active, className, ...props }: ChoiceButtonProps) {
  return (
    <button
      className={cn(
        "pixel-round pixel-bevel cursor-pointer transition-all",
        active ? "bg-brand text-white" : "bg-[#DBD0BA] text-stone",
        className
      )}
      {...props}
    />
  );
}
