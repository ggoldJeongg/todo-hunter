import redisClient from "@/infrastructure/databases/redis/server";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Redis 기반 Sliding Window Rate Limiter
 * IP별로 일정 시간 내 최대 요청 수를 제한한다.
 *
 * @upstash/redis 파이프라인은 ioredis와 달리 [err, val] 튜플이 아닌
 * 결과값 배열을 바로 반환한다.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redisKey = `rate_limit:${key}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const pipeline = redisClient.pipeline();
  // 윈도우 밖의 오래된 요청 기록 제거
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  // 현재 요청 추가
  pipeline.zadd(redisKey, { score: now, member: `${now}:${Math.random()}` });
  // 현재 윈도우 내 요청 수 조회
  pipeline.zcard(redisKey);
  // TTL 설정 (윈도우 시간 후 자동 삭제)
  pipeline.expire(redisKey, windowSeconds);

  const results = await pipeline.exec();
  const requestCount = (results[2] as number) ?? 0;

  if (requestCount > maxRequests) {
    // 가장 오래된 요청의 만료 시점 계산
    // withScores=true 시 [member, score, ...] 형태로 반환 (score는 number)
    const oldestEntries = await redisClient.zrange(redisKey, 0, 0, {
      withScores: true,
    });
    const oldestTimestamp =
      oldestEntries.length >= 2 ? Number(oldestEntries[1]) : now;
    const retryAfter = Math.ceil(
      (oldestTimestamp + windowSeconds * 1000 - now) / 1000
    );

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(retryAfter, 1),
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - requestCount,
    retryAfterSeconds: 0,
  };
}

/**
 * IP 추출 헬퍼
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
