import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PriUserRepository } from '@/infrastructure/repositories/PriUserRepository';
import { CheckExistLoginIdUsecase } from '@/application/usecases/auth/CheckExistLoginIdUsecase';
import { checkRateLimit, getClientIp } from '@/infrastructure/rate-limiter';

const userRepository = new PriUserRepository(prisma);
const checkExistLoginIdUsecase = new CheckExistLoginIdUsecase(userRepository);

const ENUM_RATE_LIMIT = { maxRequests: 10, windowSeconds: 60 };

export async function POST(req: NextRequest) {
    const clientIp = getClientIp(req.headers);
    const rateLimit = await checkRateLimit(
        `check-loginid:${clientIp}`,
        ENUM_RATE_LIMIT.maxRequests,
        ENUM_RATE_LIMIT.windowSeconds
    );

    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
            { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
        );
    }

    const { loginId } = await req.json();

    if (!loginId || typeof loginId !== 'string') {
        return NextResponse.json({ error: 'Login ID is required' }, { status: 400 });
    }

    try {
        const isExist = await checkExistLoginIdUsecase.execute({ loginId });
        return NextResponse.json(isExist, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
    }
}