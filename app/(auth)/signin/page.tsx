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
    <div className={
        `
        flex
            flex-col
            justify-center
            items-center
        px-4 sm:px-6
        min-h-screen
        `
        .replace(/\s+/g, ' ').trim()
        }>
      <h1 className={
        `
        mb-6 sm:mb-10
        text-center
        text-2xl sm:text-4xl
        `
        .replace(/\s+/g, ' ').trim()
        }>
        <span>로그인</span>
      </h1>
      <div className="block w-full max-w-[320px] mb-2">
        <span className="block mb-2">ID</span>
        <Input className="is-rounded-form w-full shadow-none" type="text"
        value={loginId}
        onChange={(e) => setLoginId(e.target.value)} />
      </div>
      <div className="block w-full max-w-[320px] mb-2">
        <span className="block mb-2">PASSWORD</span>
        <Input className="is-rounded-form w-full shadow-none" type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="flex flex-col items-center gap-2 mt-8 w-full">
        <Button value={"play"} onClick={handleSignIn} className="w-full max-w-[320px]" state="success" size="L">로그인하기</Button>
        <Button value={"signup"} onClick={(e) => handleMove(e.currentTarget.value)} className="w-full max-w-[320px]" state="warning" size="L">회원가입</Button>
      </div>
      <div className="text-center mt-3 w-full">
        <Link href="/findid" className="text-sm text-gray-500 hover:text-gray-700">아이디 찾기 &gt;</Link>
      </div>
      {/* 구분선 */}
      <div className="flex items-center w-full max-w-[320px] mt-6 mb-4">
        <div className="flex-1 h-px bg-gray-300"></div>
        <span className="px-3 text-sm text-gray-500">또는</span>
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
  );
};

export default SignIn;