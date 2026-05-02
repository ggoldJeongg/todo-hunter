// 클라이언트 사이드 Sentry 초기화.
// (sentry.client.config.ts 는 Turbopack 환경에서 작동하지 않아 이 파일로 통합됨)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 성능 모니터링 (10% 샘플링 — 무료 플랜 이벤트 절약)
  tracesSampleRate: 0.1,

  // 개발 환경에서는 비활성화
  enabled: process.env.NODE_ENV === "production",

  // 세션 리플레이 (에러 발생 시에만 녹화)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    // 사용자 피드백 위젯 — 우하단 floating 버튼으로 노출.
    // 제출 시 URL/browser/replay 등 컨텍스트가 자동 첨부되어 Sentry 대시보드로 전송됨.
    Sentry.feedbackIntegration({
      colorScheme: "light",
      // autoInject: false — 우하단 floating 버튼 자동 주입 끔.
      // 캐릭터 페이지 좌측 상단의 커스텀 버튼에 attachTo 로 직접 바인딩.
      autoInject: false,
      showBranding: false,
      // 스크린샷 첨부 비활성화 — getDisplayMedia 권한 거부 시 노출되는
      // "Permission denied by user" 에러 텍스트가 SDK 차원에서 커스터마이징 불가.
      // 베타 단계엔 텍스트 피드백만으로 충분.
      enableScreenshot: false,
      // 한국어 라벨 (게임 톤 유지)
      triggerLabel: "피드백",
      formTitle: "의견을 들려주세요",
      submitButtonLabel: "보내기",
      cancelButtonLabel: "취소",
      nameLabel: "닉네임",
      namePlaceholder: "선택 입력",
      emailLabel: "이메일",
      emailPlaceholder: "답변 받을 이메일 (선택)",
      messageLabel: "내용",
      messagePlaceholder: "버그 / 개선 제안 / 칭찬 무엇이든 환영합니다",
      successMessageText: "보내주셔서 감사합니다!",
      isRequiredLabel: " (필수)",
      // 테마 — 에러 색을 게임 톤(연한 갈색)으로 통일
      themeLight: {
        error: "#A37853",
      },
    }),
  ],
});

// App Router 라우터 트랜지션 추적 (Next.js 15 권장)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
