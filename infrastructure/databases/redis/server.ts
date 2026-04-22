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
const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default redisClient;
