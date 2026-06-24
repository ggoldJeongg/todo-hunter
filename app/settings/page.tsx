"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/utils/stores/userStore";

// 설정 페이지 — 캐릭터 화면 우상단 "설정" 칩에서 진입.
// 약관/개인정보 링크 + 로그아웃 + (맨 아래) 회원 탈퇴를 한곳에 모음.
export default function SettingsPage() {
  const router = useRouter();
  const clearUser = useUserStore((state) => state.clearUser);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      clearUser();
      router.push("/");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col overflow-hidden"
      style={{
        backgroundImage: "url('/images/backgrounds/bg_01.png')",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex items-center px-4 pb-4 pt-6">
        <button
          onClick={() => router.back()}
          className="cursor-pointer text-2xl text-white"
          aria-label="뒤로가기"
        >
          ←
        </button>
        <h1 className="mr-6 flex-1 text-center font-galmuri11-bold text-xl text-white">설정</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-10">
        <div className="mx-auto w-full max-w-[520px]">
          {/* 약관 · 정책 */}
          <p className="mb-1.5 ml-1 text-[11px] font-bold text-[#6e5a37]">약관 · 정책</p>
          <div className="mb-5 border-[3px] border-[#4A3F2F] bg-[#fffdf2] shadow-[4px_4px_0_#c9b178]">
            <Link
              href="/terms"
              className="flex items-center gap-3 border-b border-[#E6D9B6] px-4 py-3.5 text-[14px] text-[#4A3F2F]"
            >
              <span className="flex-1">서비스 이용약관</span>
              <span className="text-[#B7A77F]">›</span>
            </Link>
            <Link
              href="/privacy"
              className="flex items-center gap-3 px-4 py-3.5 text-[14px] text-[#4A3F2F]"
            >
              <span className="flex-1">개인정보처리방침</span>
              <span className="text-[#B7A77F]">›</span>
            </Link>
          </div>

          {/* 계정 */}
          <p className="mb-1.5 ml-1 text-[11px] font-bold text-[#6e5a37]">계정</p>
          <div className="border-[3px] border-[#4A3F2F] bg-[#fffdf2] shadow-[4px_4px_0_#c9b178]">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[14px] font-bold text-[#C84B3A]"
            >
              <span className="flex-1">로그아웃</span>
            </button>
          </div>

          {/* 회원 탈퇴 — 그룹 밖, 맨 아래 약화 배치 */}
          <div className="mt-5 flex justify-center">
            <Link
              href="/account/delete"
              className="text-[12px] text-[#9A9080] underline underline-offset-[3px]"
            >
              회원 탈퇴
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
