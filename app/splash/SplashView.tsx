"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SPLASH_DURATION_MS = 1500;

export default function SplashView({ nextPath }: { nextPath: string }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(nextPath);
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [nextPath, router]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        // manifest.json 의 background_color 와 일치시켜 OS 스플래시 → 이 화면 전환을 자연스럽게
        backgroundColor: "#ffffff",
      }}
    >
      <Image
        src="/images/logo.png"
        width={320}
        height={120}
        alt="TODO HUNTER"
        priority
        unoptimized
        className="splash-logo"
      />
      <style>{`
        .splash-logo {
          opacity: 0;
          animation: splash-fade-in 0.6s ease-out 0.1s forwards;
        }
        @keyframes splash-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
