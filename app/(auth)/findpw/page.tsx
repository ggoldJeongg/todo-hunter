"use client";

import FindPwForm from "@/components/auth/FindPwForm";
import { PageHeader } from "@/components/common";

const FindPw = () => {
    return (
        <div
            className="flex flex-col min-h-screen overflow-hidden bg-paper"
        >
            <PageHeader title="비밀번호 재설정" />

            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-[22vh]">
                <FindPwForm />
            </div>
        </div>
    );
};

export default FindPw;
