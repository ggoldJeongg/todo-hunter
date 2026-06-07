"use client"; // This tells Next.js to treat this as a client-side component

import Image from "next/image";
import { useEffect, useState } from "react";
import Loading from "./loading";

const setCookie = (name: string, value: string, maxAge: number) => {
  document.cookie = `${name}=${value}; max-age=${maxAge}; path=/; ${
    process.env.NODE_ENV === "production" ? "secure; " : ""
  }httpOnly`;
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [hasRefreshToken, setHasRefreshToken] = useState(false);

  // 서버에서 헤더를 가져오기 위해 초기 요청
  // 실패/타임아웃 시 비로그인 상태로 간주하고 시작 화면을 띄운다 (무한 로딩 방지).
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const checkTokens = async () => {
      try {
        const response = await fetch("/", {
          credentials: "include",
          signal: controller.signal,
        });
        setHasAccessToken(response.headers.get("X-Has-AccessToken") === "true");
        setHasRefreshToken(response.headers.get("X-Has-RefreshToken") === "true");
      } catch (err) {
        // AbortError는 정상 cleanup(언마운트/Strict Mode 이중 실행)이라 무시
        if ((err as Error).name !== "AbortError") {
          console.error("[Home] token check failed:", err);
        }
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };
    checkTokens();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const handleStartClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // 기본 링크 동작 방지

    if (hasAccessToken) {
      // accessToken이 있으면 /play/character로 이동
      window.location.href = "/play/character";
      // refreshToken만 있고 accessToken이 없으면 토큰 갱신 시도
    } else if (hasRefreshToken) {
      // refreshToken이 존재하면 서버에서 헤더 값을 가져와 refresh 요청
      const response = await fetch("/", { credentials: "include" });
      // Access-Control-Request-Headers로 전달받은 디코드된 리프레시 토큰의 id값을 저장
      const id = response.headers.get("X-Id");
      // Access-Control-Request-Headers로 전달받은 디코드된 리프레시 토큰의 loginId값을 저장
      const loginId = response.headers.get("X-LoginId");
      // Access-Control-Request-Headers로 전달받은 디코드된 리프레시 토큰 값을 저장
      const refreshToken = response.headers.get("X-RefreshToken");

      if (id && loginId && refreshToken) {
        // '/api/auth/refresh'로 id, loginId, refreshToken 전송
        const refreshResponse = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, loginId, refreshToken }),
          credentials: "include",
        });

        if (refreshResponse.ok) {
          const { newAccessToken } = await refreshResponse.json();
          if (newAccessToken) {
            setCookie("accessToken", newAccessToken, parseInt(process.env.ACCESS_TOKEN_EXPIRES || "3600", 10));
            window.location.href = "/play/character"; // 액세스 토큰 발급 성공 시 '/play/character'로 이동
          } else {
            window.location.href = "/signin"; // 액세스 토큰 발급 실패 시 로그인 페이지로
          }
        } else {
          window.location.href = "/signin"; // API 응답 에러 시 로그인 페이지로
        }
      } else {
        // 헤더에서 필요한 값이 없으면 signin으로 이동
        window.location.href = "/signin";
      }
    } else {
      // accessToken도 없고 refreshToken도 없으면 /signin으로 이동
      window.location.href = "/signin";
    }
  };

  if (isLoading) {
    return <Loading color={"black"} />; // 쿠키 값을 기다리는 동안 로딩 상태 표시
  }

  // 이미지 로딩이 완료되면 로딩 상태를 false로 변경
  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen overflow-hidden"
      style={{
        backgroundImage: "url('/images/backgrounds/bg_01.png')",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
      }}
    >
       <div className="flex flex-col items-center justify-end pb-10" style={{ height: "60vh" }}>
        {/* 로고 */}
        <Image
          src="/images/logo.png"
          width={350}
          height={120}
          alt="TODO HUNTER"
          className="mb-6"
          unoptimized
          priority
          onLoad={handleImageLoad}
        />
      </div>

      {/* 하단 밝은 영역 */}
      <div className="flex flex-col items-center justify-between flex-1">
        {/* PRESS TO START */}
        <div className="group relative mt-8">
          <button
            onClick={handleStartClick}
            className="flex items-center justify-center cursor-pointer transition-transform group-hover:scale-105"
            style={{
              width: "250px",
              height: "65px",
              backgroundImage: "url('/svgs/btn-L.svg')",
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
            }}
          >
            <span className="text-base sm:text-lg font-bold tracking-wider text-gray-100 font-galmuri11-bold">
              게임같은 하루 시작
            </span>
          </button>
          {/* hover 시 버튼 밖(오른쪽)에 나타나는 pick 아이콘 */}
          <Image
            src="/icons/pick.png"
            width={32}
            height={32}
            alt=""
            unoptimized
            className="absolute left-full top-1/2 ml-2 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 pointer-events-none"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

      </div>
    </div>
  );
}
