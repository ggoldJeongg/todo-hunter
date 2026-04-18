"use client";

import FindIdForm from "@/components/auth/FindIdForm";
import FindIdView from "@/components/auth/FindIdView";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

const FindId = () => {
    const router = useRouter();
    const [loginId, setLoginId] = useState<string |  null>(null);
    const [error, setError] = useState<string |  null>(null);
    const submitFnRef = useRef<(() => void) | null>(null);

    const handleRegisterSubmit = useCallback((fn: () => void) => {
        submitFnRef.current = fn;
    }, []);

    const handleFindId = (id: string) => {
        setLoginId(id);
        setError(null);
    };

    const handleError = (error: string) => {
        setError(error);
        setLoginId(null);
    };

    const handleBack = () => {
        setLoginId(null);
        setError(null);
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#2a2a2a]">
            {/* 상단 헤더 */}
            <div className="flex items-center px-4 pt-6 pb-4">
                <button onClick={() => router.back()} className="text-white text-2xl cursor-pointer">←</button>
                <h1 className="flex-1 text-center text-xl font-galmuri11-bold text-white mr-6">
                    아이디 찾기
                </h1>
            </div>

            {/* 폼 영역 */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
                {loginId || error ? <FindIdView loginId={loginId} error={error} onBack={handleBack} /> : <FindIdForm onFindId={handleFindId} onError={handleError} onRegisterSubmit={handleRegisterSubmit} />}
            </div>

            {/* 성 이미지 - 바닥 배경 */}
            <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
                <Image
                    src="/images/backgrounds/landing-page-castle2.png"
                    width={320}
                    height={320}
                    alt=""
                    className="w-full max-w-[320px] h-auto opacity-60"
                    unoptimized
                />
            </div>
        </div>
    );
}

export default FindId;