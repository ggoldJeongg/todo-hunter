"use client";

import { Button, Input } from "@/components/common";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Step = "request" | "verify" | "newPassword" | "done";

const FindPwForm = () => {
    const router = useRouter();

    const [step, setStep] = useState<Step>("request");
    const [loginId, setLoginId] = useState("");
    const [email, setEmail] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const showToast = (message: string) => {
        toast.error(message, {
            id: "findpw-error",
            className:
                "!text-base !break-keep !whitespace-normal !text-center !leading-snug !py-3",
        });
    };

    /* Step 1: 인증코드 발송 */
    const handleRequestCode = async () => {
        if (!loginId.trim() || !email.trim()) {
            setError("아이디와 이메일을 모두 입력해주세요.");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("올바른 이메일 형식이 아닙니다.");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/auth/send-reset-password-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loginId: loginId.trim(), email: email.trim() }),
            });

            if (response.status === 429) {
                const retryAfter = response.headers.get("Retry-After");
                showToast(`요청이 너무 많습니다. ${retryAfter ?? ""}초 후 다시 시도해주세요.`);
                return;
            }
            if (!response.ok) {
                showToast("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            // 보안상 유저 존재 여부와 무관하게 동일 응답 → 다음 단계 이동
            setStep("verify");
        } catch (err) {
            console.error("Reset code request error:", err);
            showToast("네트워크 연결을 확인해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    /* Step 2: 인증코드 확인 */
    const handleVerifyCode = async () => {
        if (!verificationCode.trim()) {
            setError("인증코드를 입력해주세요.");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/auth/check-reset-password-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), verificationCode: verificationCode.trim() }),
            });

            if (response.status === 410) {
                setError("인증코드가 만료되었습니다. 처음부터 다시 시도해주세요.");
                return;
            }
            if (response.status === 429) {
                const retryAfter = response.headers.get("Retry-After");
                showToast(`인증 시도가 너무 많습니다. ${retryAfter ?? ""}초 후 다시 시도해주세요.`);
                return;
            }

            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.isVerified) {
                setError("인증코드가 일치하지 않습니다.");
                return;
            }

            setStep("newPassword");
        } catch (err) {
            console.error("Reset code verify error:", err);
            showToast("네트워크 연결을 확인해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    /* Step 3: 새 비밀번호 제출 */
    const handleSubmitNewPassword = async () => {
        if (!newPassword || !confirmPassword) {
            setError("비밀번호를 입력해주세요.");
            return;
        }
        if (newPassword.length < 8) {
            setError("비밀번호는 8자 이상이어야 합니다.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("비밀번호가 일치하지 않습니다.");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    loginId: loginId.trim(),
                    email: email.trim(),
                    verificationCode: verificationCode.trim(),
                    newPassword,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                if (response.status === 410) {
                    setError("인증코드가 만료되었습니다. 처음부터 다시 시도해주세요.");
                    return;
                }
                setError(data.error ?? "비밀번호 변경에 실패했습니다.");
                return;
            }

            setStep("done");
        } catch (err) {
            console.error("Reset password error:", err);
            showToast("네트워크 연결을 확인해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    /* 화면별 렌더링 */
    if (step === "done") {
        return (
            <>
                <div className="is-rounded-form w-full max-w-[360px] p-6 text-center bg-white">
                    <p className="font-extrabold text-lg my-2">비밀번호가 변경되었습니다</p>
                    <p className="text-sm text-gray-600">새 비밀번호로 로그인해주세요.</p>
                </div>
                <div className="w-full max-w-[360px] mt-6">
                    <Button
                        className="w-full max-w-none"
                        state="primary"
                        size="L"
                        onClick={() => router.push("/signin")}
                    >
                        로그인하러 가기
                    </Button>
                </div>
            </>
        );
    }

    if (step === "newPassword") {
        return (
            <>
                <div className="w-full max-w-[360px] space-y-4">
                    <Input
                        placeholder="새 비밀번호 (8자 이상)"
                        className="is-rounded-form w-full shadow-none"
                        type="password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                    />
                    <Input
                        placeholder="새 비밀번호 재입력"
                        className="is-rounded-form w-full shadow-none"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                    />
                    {error && <p className="text-sm text-[#A72F35]">{error}</p>}
                </div>
                <div className="w-full max-w-[360px] mt-6">
                    <Button
                        className="w-full max-w-none"
                        state="primary"
                        size="L"
                        onClick={handleSubmitNewPassword}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "변경 중..." : "비밀번호 변경"}
                    </Button>
                </div>
            </>
        );
    }

    if (step === "verify") {
        return (
            <>
                <div className="w-full max-w-[360px] space-y-3">
                    <p className="text-sm text-[#4A3F2F] text-center font-bold">
                        입력하신 이메일로 인증코드를 발송했습니다.<br />
                        (가입 정보가 일치하지 않을 경우 메일이 오지 않습니다)
                    </p>
                    <Input
                        placeholder="인증코드 6자리"
                        className="is-rounded-form w-full shadow-none"
                        value={verificationCode}
                        onChange={(e) => { setVerificationCode(e.target.value); setError(null); }}
                        inputMode="numeric"
                    />
                    {error && <p className="text-sm text-[#A72F35]">{error}</p>}
                </div>
                <div className="w-full max-w-[360px] mt-6 space-y-2">
                    <Button
                        className="w-full max-w-none"
                        state="primary"
                        size="L"
                        onClick={handleVerifyCode}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "확인 중..." : "인증하기"}
                    </Button>
                    <Button
                        className="w-full max-w-none"
                        state="outline"
                        size="L"
                        onClick={() => { setStep("request"); setVerificationCode(""); setError(null); }}
                    >
                        이전으로
                    </Button>
                </div>
            </>
        );
    }

    // step === "request"
    return (
        <>
            <div className="w-full max-w-[360px] space-y-4">
                <Input
                    placeholder="아이디"
                    className="is-rounded-form w-full shadow-none"
                    value={loginId}
                    onChange={(e) => { setLoginId(e.target.value); setError(null); }}
                />
                <Input
                    placeholder="이메일"
                    className="is-rounded-form w-full shadow-none"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                />
                {error && <p className="text-sm text-[#A72F35]">{error}</p>}
            </div>
            <div className="w-full max-w-[360px] mt-6">
                <Button
                    className="w-full max-w-none"
                    state="primary"
                    size="L"
                    onClick={handleRequestCode}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "발송 중..." : "인증코드 받기"}
                </Button>
            </div>
        </>
    );
};

export default FindPwForm;
