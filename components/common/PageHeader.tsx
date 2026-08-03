"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  /** 뒤로가기 동작 override. 없으면 router.back() */
  onBack?: () => void;
  /** 제출 중 등 뒤로가기 비활성화 */
  backDisabled?: boolean;
  /** 우측 액션 (예: 저장 버튼). 없으면 좌측 뒤로가기와 균형 맞춰 타이틀 중앙 정렬 */
  right?: React.ReactNode;
  className?: string;
}

/**
 * 공통 페이지 헤더 — 뒤로가기(←) + 가운데 타이틀 + (선택) 우측 액션.
 * 좌우 슬롯을 같은 최소폭으로 둬서 우측 액션이 없어도 타이틀이 정확히 중앙에 온다.
 */
export function PageHeader({ title, onBack, backDisabled, right, className }: PageHeaderProps) {
  const router = useRouter();
  return (
    <div className={cn("flex items-center px-4 pt-6 pb-4", className)}>
      <button
        type="button"
        onClick={onBack ?? (() => router.back())}
        disabled={backDisabled}
        aria-label="뒤로가기"
        className="shrink-0 min-w-[2rem] text-left text-2xl text-ink cursor-pointer disabled:opacity-40"
      >
        ←
      </button>
      <h1 className="flex-1 truncate px-1 text-center text-xl font-galmuri11-bold text-ink">
        {title}
      </h1>
      <div className="flex min-w-[2rem] shrink-0 justify-end">{right}</div>
    </div>
  );
}
