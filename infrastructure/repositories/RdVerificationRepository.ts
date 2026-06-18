import  redisClient from '@/infrastructure/databases/redis/server';

import { IVerificationRepository } from '@/domain/repositories/IVerificationRepository';

const SIGNUP_VERIFIED_KEY_PREFIX = 'signup-verified:';

export class RdVerificationRepository implements IVerificationRepository {

    async saveVerificationCode(email: string, code: string, expiresIn: number = 300): Promise<void> {
        await redisClient.set(`email:${email}`, code, { ex: expiresIn });
    };

    async getVerificationCode(email: string): Promise<string | null> {
        return await redisClient.get<string>(`email:${email}`);
    }

    async deleteVerificationCode(email: string): Promise<void> {
        await redisClient.del(`email:${email}`);
    }

    async saveSignupVerifiedEmail(email: string, expiresIn: number = 600): Promise<void> {
        await redisClient.set(SIGNUP_VERIFIED_KEY_PREFIX + email, 'true', { ex: expiresIn });
    }

    async hasSignupVerifiedEmail(email: string): Promise<boolean> {
        const verified = await redisClient.get<string>(SIGNUP_VERIFIED_KEY_PREFIX + email);
        return verified === 'true';
    }

    async deleteSignupVerifiedEmail(email: string): Promise<void> {
        await redisClient.del(SIGNUP_VERIFIED_KEY_PREFIX + email);
    }

    async getVerificationCodeExpiration(email: string): Promise<number | null> {
        // Redis에서 키의 TTL을 가져옵니다.
        const ttl = await redisClient.ttl(`email:${email}`);
        if (ttl === -2) {
            // 키가 존재하지 않으면 null을 반환하여 예외를 처리하도록 합니다.
            return null;
        }
        if (ttl === -1) {
            // 만료 시간이 설정되지 않은 경우, -1을 반환하여 예외를 처리하도록 합니다.
            return null;
        }
        const expirationTime = Date.now() + ttl * 1000;
        return expirationTime;
    }

    async saveResetPasswordCode(email: string, code: string, expiresIn: number = 300): Promise<void> {
        await redisClient.set(`email-reset:${email}`, code, { ex: expiresIn });
    }

    async getResetPasswordCode(email: string): Promise<string | null> {
        return await redisClient.get<string>(`email-reset:${email}`);
    }

    async deleteResetPasswordCode(email: string): Promise<void> {
        await redisClient.del(`email-reset:${email}`);
    }

    async getResetPasswordCodeExpiration(email: string): Promise<number | null> {
        const ttl = await redisClient.ttl(`email-reset:${email}`);
        if (ttl === -2 || ttl === -1) return null;
        return Date.now() + ttl * 1000;
    }
}
