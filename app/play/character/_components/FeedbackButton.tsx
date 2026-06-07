"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useRef } from "react";

// 캐릭터 페이지 좌측 상단 피드백 진입 버튼 (도트 픽셀 톤).
// instrumentation-client.ts 의 feedbackIntegration({ autoInject: false }) 설정과 짝.
// 클릭 시 Sentry 가 한국어 피드백 모달 띄움 → 제출 시 URL/browser/replay/user 자동 첨부.
// dev 환경에선 Sentry 가 disabled 라서 버튼은 보이되 동작 안 함 (prod 빌드에서만 작동).
export default function FeedbackButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const feedback = Sentry.getFeedback();
    if (!feedback || !buttonRef.current) return;

    const unsubscribe = feedback.attachTo(buttonRef.current);
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="피드백 보내기"
      title="피드백 보내기"
      className="char-feedback-btn"
    >
      {/* 픽셀 말풍선 (도트 단위 사각형으로만 그려 안티앨리어싱 X) */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {/* 내부 흰색 채움 */}
        <rect x="2" y="2" width="12" height="8" fill="#FFFDF2" />
        {/* 외곽선 — 상 */}
        <rect x="3" y="1" width="10" height="1" fill="#4A3F2F" />
        {/* 외곽선 — 하 (꼬리 시작점에 갭) */}
        <rect x="3" y="10" width="3" height="1" fill="#4A3F2F" />
        <rect x="7" y="10" width="6" height="1" fill="#4A3F2F" />
        {/* 외곽선 — 좌 */}
        <rect x="2" y="2" width="1" height="8" fill="#4A3F2F" />
        {/* 외곽선 — 우 */}
        <rect x="13" y="2" width="1" height="8" fill="#4A3F2F" />
        {/* 꼬리 (계단형) */}
        <rect x="6" y="10" width="1" height="1" fill="#4A3F2F" />
        <rect x="6" y="11" width="1" height="1" fill="#FFFDF2" />
        <rect x="7" y="11" width="1" height="1" fill="#4A3F2F" />
        <rect x="6" y="12" width="1" height="1" fill="#4A3F2F" />
        {/* 점 3개 */}
        <rect x="4" y="5" width="2" height="2" fill="#4A3F2F" />
        <rect x="7" y="5" width="2" height="2" fill="#4A3F2F" />
        <rect x="10" y="5" width="2" height="2" fill="#4A3F2F" />
      </svg>
    </button>
  );
}
