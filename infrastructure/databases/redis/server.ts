import { Redis } from "@upstash/redis";

/**
 * Upstash Redis REST API 클라이언트
 *
 * HTTPS(443) 기반이라 Cloudflare Tunnel/사내망/공용 Wi-Fi 등
 * 6379 차단 환경에서도 연결 가능.
 *
 * 환경변수:
 *   UPSTASH_REDIS_REST_URL   — https://<db-name>.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN — Upstash 대시보드에서 발급
 *
 * 둘 다 설정 안 돼 있으면 생성자에서 throw.
 */
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  // 빈 url 로 init 되면 fetch 시 "/pipeline" 만 사용해 URL 파싱 에러가 나며
  // 모든 redis 호출 경로(예: rate-limiter, auth)가 500 으로 깨진다.
  // 빠른 진단 위해 init 시점에 명확히 throw.
  throw new Error(
    "[redis] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 환경변수가 비어있습니다. .env 또는 GitHub Secrets 확인 필요."
  );
}

const redisClient = new Redis({ url, token });

export default redisClient;
