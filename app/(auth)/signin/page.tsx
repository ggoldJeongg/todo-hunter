"use client";

import { Button, Input } from "@/components/common";
import { useUserStore } from "@/utils/stores/userStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type FieldErrors = {
  loginId?: string;
  password?: string;
};

const SignIn = () => {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { fetchUser } = useUserStore();

  const showToast = (message: string) => {
    toast.error(message, {
      id: "signin-error",
      className:
        "!text-base !break-keep !whitespace-normal !text-center !leading-snug !py-3",
    });
  };

  const clearAllErrors = () => {
    setErrors({});
    setFormError(null);
  };

  const handleSignIn = async () => {
    if (isSubmitting) return;

    const trimmedLoginId = loginId.trim();
    const nextErrors: FieldErrors = {};
    if (!trimmedLoginId) nextErrors.loginId = "아이디를 입력해주세요.";
    if (!password) nextErrors.password = "비밀번호를 입력해주세요.";

    if (nextErrors.loginId || nextErrors.password) {
      setErrors(nextErrors);
      setFormError(null);
      return;
    }

    clearAllErrors();
    setIsSubmitting(true);

    let response: Response;
    try {
      response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: trimmedLoginId, password }),
        credentials: "include",
      });
    } catch (error) {
      console.error("로그인 네트워크 오류:", error);
      showToast("네트워크 연결을 확인하고 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    if (response.ok) {
      try {
        await fetchUser();
        router.push("/play/character");
      } catch (error) {
        console.error("로그인 후 유저 정보 조회 실패:", error);
        showToast("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        setIsSubmitting(false);
      }
      return;
    }

    if (response.status === 401 || response.status === 400) {
      setFormError("아이디 또는 비밀번호가 올바르지 않습니다.");
    } else if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const seconds = retryAfter ? Number(retryAfter) : NaN;
      showToast(
        Number.isFinite(seconds) && seconds > 0
          ? `로그인 시도가 너무 많습니다. ${seconds}초 후 다시 시도해주세요.`
          : "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요."
      );
    } else if (response.status >= 500) {
      showToast("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } else {
      showToast("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }

    setIsSubmitting(false);
  };

  const handleMove = (value: string) => {
    router.push(`/${value}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSignIn();
  };

  return (
    <div
      className="flex flex-col min-h-screen overflow-hidden"
      style={{
        backgroundImage: "url('/images/backgrounds/bg_01.png')",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* 상단 다크 영역 - 제목 + 입력폼 */}
      <div className="flex flex-col items-center justify-end pb-8 px-6" style={{ height: "55vh" }}>
        <h1
          className="mb-10 text-center text-3xl sm:text-4xl font-galmuri11-bold"
          style={{ textShadow: "-4px -4px 0 #555, 4px -4px 0 #555, -4px 4px 0 #555, 4px 4px 0 #555, 0 -4px 0 #555, 0 4px 0 #555, -4px 0 0 #555, 4px 0 0 #555" }}
        >
          <span className="text-white">로그인</span>
        </h1>

        <div className="w-full max-w-[320px] space-y-4">
          {formError && (
            <div
              role="alert"
              className="w-full rounded-md bg-red-500/90 text-white text-sm text-center px-3 py-2 break-keep leading-snug"
            >
              {formError}
            </div>
          )}
          <div>
            <Input
              className="is-rounded-form w-full shadow-none"
              type="text"
              placeholder="ID"
              value={loginId}
              state={errors.loginId ? "error" : "default"}
              aria-invalid={!!errors.loginId}
              aria-describedby={errors.loginId ? "loginId-error" : undefined}
              onChange={(e) => {
                setLoginId(e.target.value);
                if (errors.loginId) setErrors((prev) => ({ ...prev, loginId: undefined }));
                if (formError) setFormError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
            />
            {errors.loginId && (
              <p id="loginId-error" className="mt-1 text-xs text-red-500 pl-2">
                {errors.loginId}
              </p>
            )}
          </div>
          <div>
            <Input
              className="is-rounded-form w-full shadow-none"
              type="password"
              placeholder="PASSWORD"
              value={password}
              state={errors.password ? "error" : "default"}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                if (formError) setFormError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
            />
            {errors.password && (
              <p id="password-error" className="mt-1 text-xs text-red-500 pl-2">
                {errors.password}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 하단 밝은 영역 - 버튼 + 링크 + 카카오 */}
      <div className="flex flex-col items-center flex-1 px-6" style={{ paddingTop: "70px" }}>
        <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
          <Button
            value={"play"}
            onClick={handleSignIn}
            className="w-full"
            state="primary"
            size="L"
            disabled={isSubmitting}
          >
            {isSubmitting ? "로그인 중..." : "로그인하기"}
          </Button>
          <Button value={"signup"} onClick={(e) => handleMove(e.currentTarget.value)} className="w-full" state="outline" size="L">이메일 회원가입</Button>
        </div>

        <div className="text-center mt-4 w-full">
          <Link href="/findid" className="text-sm text-gray-500 hover:text-gray-700">아이디 찾기 &gt;</Link>
        </div>

        {/* 구분선 */}
        <div className="flex items-center w-full max-w-[320px] my-6">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">또는</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* 카카오 로그인 */}
        <a
          href="/api/auth/kakao"
          aria-label="카카오 로그인"
          className="w-full max-w-[320px] h-12 flex items-center justify-center gap-2 bg-[#FEE500] text-[#191919] font-bold text-base rounded-md hover:bg-[#FDD800] active:bg-[#F5D000] transition-colors shadow-[0_2px_0_rgba(0,0,0,0.15)]"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 18 18"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9 0.5C4.029 0.5 0 3.717 0 7.685c0 2.583 1.708 4.851 4.273 6.123-.187.703-.679 2.55-.778 2.946-.121.491.18.484.38.353.156-.103 2.482-1.687 3.484-2.367a11.6 11.6 0 0 0 1.641.116c4.971 0 9-3.217 9-7.171S13.971 0.5 9 0.5z" />
          </svg>
          카카오 로그인
        </a>
      </div>
    </div>
  );
};

export default SignIn;
