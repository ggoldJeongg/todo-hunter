"use client";

import { useEffect } from "react";

// 데스크톱 우클릭 + 모바일 길게누르기에서 발생하는 contextmenu 이벤트, 이미지 드래그 이벤트 차단.
// 단, 폼 입력 요소는 붙여넣기/복사를 위해 예외 처리.
export default function ContextMenuGuard() {
  useEffect(() => {
    const ctxHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
    };

    const dragHandler = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      // 폼 입력 요소(예: 파일 첨부 드롭존 등)는 정상 동작 유지
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA"
      ) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener("contextmenu", ctxHandler);
    document.addEventListener("dragstart", dragHandler);
    return () => {
      document.removeEventListener("contextmenu", ctxHandler);
      document.removeEventListener("dragstart", dragHandler);
    };
  }, []);

  return null;
}
