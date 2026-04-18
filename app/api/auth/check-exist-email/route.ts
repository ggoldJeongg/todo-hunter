import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PriUserRepository } from '@/infrastructure/repositories/PriUserRepository';
import { CheckExistEmailUsecase } from '@/application/usecases/auth/CheckExistEmailUsecase';
import { checkRateLimit, getClientIp } from '@/infrastructure/rate-limiter';

const userRepository = new PriUserRepository(prisma);
const checkExistEmailUsecase = new CheckExistEmailUsecase(userRepository);

const ENUM_RATE_LIMIT = { maxRequests: 10, windowSeconds: 60 };

export async function POST(req: NextRequest) {
    const clientIp = getClientIp(req.headers);
    const rateLimit = await checkRateLimit(
        `check-email:${clientIp}`,
        ENUM_RATE_LIMIT.maxRequests,
        ENUM_RATE_LIMIT.windowSeconds
    );

    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
            { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
        );
    }

    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
        const isExist = await checkExistEmailUsecase.execute({ email });
        return NextResponse.json(isExist, { status: 200 });
    } catch {
        return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
    }
}