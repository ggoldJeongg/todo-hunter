"use client";

import FindPwForm from "@/components/auth/FindPwForm";
import { useRouter } from "next/navigation";

const FindPw = () => {
    const router = useRouter();

    return (
        <div
            className="flex flex-col min-h-screen overflow-hidden bg-paper"
        >
            <div className="flex items-center px-4 pt-6 pb-4">
                <button onClick={() => router.back()} className="text-ink text-2xl cursor-pointer">←</button>
                <h1 className="flex-1 text-center text-xl font-galmuri11-bold text-ink mr-6">
                    비밀번호 재설정
                </h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6">
                <FindPwForm />
            </div>
        </div>
    );
};

export default FindPw;
