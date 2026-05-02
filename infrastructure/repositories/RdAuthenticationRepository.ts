// infrastructure/repositories/RdAuthenticationRepository.ts
import { IRdAuthenticationRepository } from '@/domain/repositories/IRdAuthenticationRepository';
import redisClient from '@/infrastructure/databases/redis/server';

const REFRESH_KEY_PREFIX = 'refresh:';

// "2592000s" / "30d" / "60m" / "1h" → 초(seconds)
function parseExpiryToSeconds(exp: string): number {
    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid REFRESH_TOKEN_EXPIRES format: ${exp}`);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[unit];
}

// JWT 만료(REFRESH_TOKEN_EXPIRES)와 Redis TTL을 일치시켜 mismatch 제거
const REFRESH_TTL_SECONDS = parseExpiryToSeconds(process.env.REFRESH_TOKEN_EXPIRES ?? '2592000s');

export class RdAuthenticationRepository implements IRdAuthenticationRepository {
    async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
        await redisClient.set(REFRESH_KEY_PREFIX + userId, refreshToken, { ex: REFRESH_TTL_SECONDS });
    }

    async getRefreshToken(userId: string): Promise<string | null> {
        return await redisClient.get<string>(REFRESH_KEY_PREFIX + userId);
    }

    async deleteRefreshToken(userId: string): Promise<void> {
        await redisClient.del(REFRESH_KEY_PREFIX + userId);
    }

    // Access Token은 Redis에 저장하지 않습니다.
    // Access Token은 JWT로 발급되며, 검증만 수행합니다.
}
