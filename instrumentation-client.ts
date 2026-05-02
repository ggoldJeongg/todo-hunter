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
  ],
});

// App Router 라우터 트랜지션 추적 (Next.js 15 권장)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
