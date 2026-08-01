import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { STATUS } from "@/constants";

type StatusKey = keyof typeof STATUS;
type StatusVariant = StatusKey | "default";
type TagSize = "sm" | "lg";

const tagVariants = cva(
  "inline-flex items-center justify-center font-semibold",
  {
    variants: {
      variant: {
        default: "bg-white text-black",
        STR: "bg-stat-str text-white",
        INT: "bg-stat-int text-white",
        EMO: "bg-stat-emo text-white",
        FIN: "bg-stat-fin text-white",
        LIV: "bg-stat-liv text-white",
      } satisfies Record<StatusVariant, string>,
      // sm: 퀘스트 리스트 인라인 뱃지 — 양피지 카드와 어울리는 부드러운 라운드 + 소프트 그림자.
      //     높이 20px 로 옆 아이콘(20x20)과 정렬, 폭은 글자 길이만큼 auto(pill).
      // lg: 퀘스트 추가/수정 폼의 스탯 선택 버튼 — 픽셀 테두리(is-rounded) 유지. 두 줄(키 + 한글 라벨).
      size: {
        sm: "h-[20px] px-2 text-xs rounded-md shadow-[0_1px_2px_rgba(90,54,22,0.25)]",
        lg: "is-rounded px-2 py-2 text-xs",
      } satisfies Record<TagSize, string>,
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

export interface TagProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tagVariants> {
  variant?: StatusVariant;
  size?: TagSize;
}

function Tag({ className, variant, size, children, ...props }: TagProps) {
  return (
    <div className={cn(tagVariants({ variant, size }), className)} {...props}>
      {children}
    </div>
  );
}

export { Tag, tagVariants };
