"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common";
import { useUserStore } from "@/utils/stores/userStore";

export default function DeleteAccountPage() {
  const router = useRouter();
  const clearUser = useUserStore((state) => state.clearUser);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, confirmText }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "회원 탈퇴에 실패했습니다.");
      }

      clearUser();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원 탈퇴에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col overflow-hidden bg-paper px-5 py-6 text-[#4A3F2F]"
    >
      <div className="mx-auto flex w-full max-w-[520px] items-center pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-2xl text-ink"
          aria-label="뒤로가기"
        >
          ←
        </button>
        <h1 className="flex-1 pr-6 text-center font-galmuri11-bold text-xl text-ink">회원 탈퇴</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-[520px] border-[3px] border-[#4A3F2F] bg-[#fffdf2] p-5 text-[13px] leading-6 shadow-[4px_4px_0_#c9b178]"
      >
        <h2 className="mb-3 text-[17px] font-bold text-brand">탈퇴 전 꼭 확인해주세요</h2>
        <ul className="mb-5 list-disc space-y-2 pl-5">
          <li>캐릭터, 스탯, 퀘스트, 완료 기록, 칭호, 엔딩 기록이 모두 삭제됩니다.</li>
          <li>삭제는 일괄 처리되며 실패 시 일부 데이터만 삭제된 상태로 남지 않습니다.</li>
        </ul>

        <label className="mb-4 block">
          <span className="mb-1 block font-bold">이메일 계정 비밀번호 확인</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full border-2 border-[#4A3F2F] bg-white px-3 py-2 outline-none"
            autoComplete="current-password"
            placeholder="이메일 가입 계정만 입력"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block font-bold">소셜 계정 확인 문구</span>
          <input
            type="text"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            className="w-full border-2 border-[#4A3F2F] bg-white px-3 py-2 outline-none"
            placeholder="회원탈퇴"
          />
        </label>

        {error && <p className="mb-4 border-2 border-brand bg-[#FDE9E6] p-3 text-brand">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" size="M" state="outline" onClick={() => router.back()} disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" size="M" state="error" disabled={isSubmitting}>
            {isSubmitting ? "처리 중" : "탈퇴하기"}
          </Button>
        </div>
      </form>
    </div>
  );
}
