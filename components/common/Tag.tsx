import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { STATUS } from "@/constants";

type StatusKey = keyof typeof STATUS;
type StatusVariant = StatusKey | "default";
type TagSize = "sm" | "lg";

const tagVariants = cva(
  "is-rounded inline-flex items-center justify-center font-semibold",
  {
    variants: {
      variant: {
        default: "bg-white text-black",
        STR: "bg-red-500 text-white",
        INT: "bg-blue-500 text-white",
        EMO: "bg-purple-500 text-white",
        FIN: "bg-green-500 text-white",
        LIV: "bg-yellow-500 text-white",
      } satisfies Record<StatusVariant, string>,
      // sm: 퀘스트 리스트의 인라인 뱃지. 한 줄에 아이콘들과 같이 들어가 작게 보여야 함.
      // lg: 퀘스트 추가/수정 폼의 스탯 선택 버튼. 두 줄(키 + 한글 라벨)이 들어가야 함.
      size: {
        sm: "h-[14px] px-2 text-xs",
        lg: "px-2 py-2 text-xs",
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
