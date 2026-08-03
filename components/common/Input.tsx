import * as React from "react";
import { cva, VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  // 폼 인풋 기본: 픽셀 라운드 테두리(is-rounded-form) + full width + box-shadow 제거.
  // (기존 모든 폼 사용처가 공통으로 쓰던 값을 내장 — DialogButton 데모 제외)
  "is-rounded-form w-full shadow-none p-1 outline-none",
  {
    variants: {
      state: {
        default: "input-border bg-white",
        current: "input-border state-current bg-white",
        success: "input-border state-success bg-white",
        warning: "input-border state-warning bg-white",
        error: "input-border state-error bg-white",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

export type InputProps = React.ComponentProps<"input"> & VariantProps<typeof inputVariants>;

// eslint-disable-next-line react/display-name
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, state, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(inputVariants({ state }), className)}
        {...props}
      />
    );
  }
);

export { Input };
