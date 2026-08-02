"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PixelTabItem {
  key: string;
  label: React.ReactNode;
}

interface PixelTabsProps {
  tabs: PixelTabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * 픽셀 탭 바 — 활성 탭 브라운 채움, 하단 잉크 라인. (퀘스트 일간/주간 등)
 * ※ 기존 components/common/Tabs.tsx 는 Radix 기반 범용 탭(Navigation용)이라 별개.
 */
export function PixelTabs({ tabs, active, onChange, className }: PixelTabsProps) {
  return (
    <div className={cn("flex shrink-0 border-b-2 border-ink", className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            "flex-1 cursor-pointer py-3 text-center font-galmuri11-bold text-sm transition-colors",
            active === t.key ? "bg-brand text-white" : "bg-paper text-stone"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
