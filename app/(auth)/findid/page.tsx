"use client";

import FindIdForm from "@/components/auth/FindIdForm";
import FindIdView from "@/components/auth/FindIdView";
import { PageHeader } from "@/components/common";
import { useCallback, useRef, useState } from "react";

const FindId = () => {
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
        <div
            className="flex flex-col min-h-screen overflow-hidden bg-paper"
        >
            <PageHeader title="아이디 찾기" />

            {/* 폼 영역 — 위로 치우친 중앙정렬(키보드가 가리지 않도록) */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-[22vh]">
                {loginId || error ? <FindIdView loginId={loginId} error={error} onBack={handleBack} /> : <FindIdForm onFindId={handleFindId} onError={handleError} onRegisterSubmit={handleRegisterSubmit} />}
            </div>

        </div>
    );
}

export default FindId;