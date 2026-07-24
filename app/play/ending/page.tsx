"use client";

import { useEffect, useState } from "react";
import { EndingDTO } from "@/application/usecases/ending/dtos";
import {
  FADE_STEP_DURATION,
  TOAST_DELAY,
  TOTAL_FADE_DURATION,
} from "@/constants";
import { toast } from "sonner";
import { EndingImage, EndingScriptBox } from "@/app/play/ending/_components";
import { useRouter } from "next/navigation";

const EndingPage = () => {
  const [endingData, setEndingData] = useState<EndingDTO | null>(null);
  const [fadeStep, setFadeStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const initializeData = async () => {
      try {
        const response = await fetch("/api/ending", { credentials: "include" });

        if (!response.ok) {
          throw new Error("엔딩 정보를 가져오는데 실패했습니다.");
        }

        const data = await response.json();
        setEndingData(data);

        // 단계적 페이드인 시작
        const fadeInterval = setInterval(() => {
          setFadeStep((prev) => {
            if (prev >= 7) {
              clearInterval(fadeInterval);
              return 7;
            }
            return prev + 1;
          });
        }, FADE_STEP_DURATION);

        // 토스트는 첫 view (아직 "확인" 클릭 안 한 상태) 일 때만 표시
        // 새로고침해도 checkedAt 없으면 다시 뜨긴 하지만, addCount 부수효과는 없음
        if (data.isFirstView) {
          setTimeout(() => {
            toast("새로운 칭호를 획득했습니다!", {
              duration: 3000,
            });
            setTimeout(() => {
              toast(
                <div className="flex flex-col gap-2">
                  <p className="text-lg font-bold">
                    {data.achievableTitle.titleName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {data.achievableTitle.description}
                  </p>
                </div>
              );
            }, 1000);
          }, TOTAL_FADE_DURATION + TOAST_DELAY);
        }

        return () => clearInterval(fadeInterval);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다."
        );
        setFadeStep(7);
      }
    };

    initializeData();
  }, []);

  // 엔딩 확인 완료 처리
  const handleConfirm = async () => {
    try {
      await fetch("/api/ending", {
        method: "PATCH",
      });
      router.push("/play/character");
    } catch {
      console.error("엔딩 확인 처리 실패");
    }
  };

  const getOverlayClass = () => {
    switch (fadeStep) {
      case 0:
        return "opacity-100";
      case 1:
        return "opacity-90";
      case 2:
        return "opacity-75";
      case 3:
        return "opacity-60";
      case 4:
        return "opacity-45";
      case 5:
        return "opacity-30";
      case 6:
        return "opacity-15";
      case 7:
        return "opacity-0";
      default:
        return "opacity-100";
    }
  };

  return (
    <div className="relative min-h-screen bg-black">
      <div className="is-center min-h-screen space-y-8">
        {error ? (
          <div className="is-center min-h-screen">
            <p className="text-red-500">{error}</p>
          </div>
        ) : !endingData ? (
          <div className="is-center min-h-screen">
            <p className="text-white">로딩 중...</p>
          </div>
        ) : (
          <>
            <EndingImage image={endingData.endingImage} />
            <EndingScriptBox
              name={endingData.endingName}
              dialogue={endingData.endingDialogue}
            />
            <div
              className={`transition-opacity duration-1000 z-10 relative ${
                fadeStep >= 7 ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              {endingData.endingState === 3 ? (
                <button
                  onClick={() => router.push("/play/character")}
                  className="px-8 py-3 bg-brand text-white font-galmuri11-bold border-[3px] border-ink cursor-pointer shadow-[3px_3px_0_0_theme(colors.ink)] transition-all active:bg-brand-active active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_theme(colors.ink)]"
                >
                  돌아가기
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  className="px-8 py-3 bg-brand text-white font-galmuri11-bold border-[3px] border-ink cursor-pointer shadow-[3px_3px_0_0_theme(colors.ink)] transition-all active:bg-brand-active active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_theme(colors.ink)]"
                >
                  확인
                </button>
              )}
            </div>
            <div
              className={`absolute inset-0 bg-black pointer-events-none transition-opacity duration-500 ${getOverlayClass()}`}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default EndingPage;
