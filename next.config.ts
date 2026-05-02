import { withSentryConfig } from "@sentry/nextjs";
import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // 베타 단계: PWA 설치 + manifest 작동만 필요. 오프라인 캐시는 Phase 2.
    // catch-all NetworkOnly로 fetch handler 등록(Chrome 인스톨 조건) + 응답 캐시 X
    runtimeCaching: [
      {
        urlPattern: /.*/,
        handler: "NetworkOnly",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/instrumentation"],
};

export default withSentryConfig(withPWA(nextConfig), {
  org: "todo-hunter",
  project: "todo-hunter",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
  },
});
