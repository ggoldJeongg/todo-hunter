"use client";

import { Button, Input } from "@/components/common";
import { useUserStore } from "@/utils/stores/userStore";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SignIn = () => {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const { fetchUser } = useUserStore(); // zustand에서 fetchUser 가져오기

  const handleSignIn = async () => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loginId, password }),
        credentials: "include", // 쿠키 포함
      });
      if (response.ok) {
        // 로그인 성공 시 fetchUser 호출
        await fetchUser();
        router.push("/play/character"); // 인게임으로 이동
      }
    } catch (error) {
      console.error('로그인 중 오류 발생:', error);
    }
  };
  
  const handleMove = (value: string) => {
    router.push(`/${value}`); // URL 해시 변경
  };
  
  return (
    <div
      className="flex flex-col min-h-screen overflow-hidden"
      style={{
        backgroundImage: "url('/images/backgrounds/landing-page-background1.png')",
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
          <Input className="is-rounded-form w-full shadow-none" type="text"
            placeholder="Email"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)} />
          <Input className="is-rounded-form w-full shadow-none" type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>

      {/* 하단 밝은 영역 - 버튼 + 링크 + 카카오 */}
      <div className="flex flex-col items-center flex-1 px-6" style={{ paddingTop: "70px" }}>
        <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
          <Button value={"play"} onClick={handleSignIn} className="w-full" state="primary" size="L">로그인하기</Button>
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
        <a href="/api/auth/kakao">
          <Image
            src="/icons/kakao_login_medium_narrow.png"
            alt="카카오 로그인"
            width={183}
            height={45}
            priority
            unoptimized
          />
        </a>
      </div>
    </div>
  );
};

export default SignIn;