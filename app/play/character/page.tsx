"use client";

import Status from "@/app/play/character/_components/status";
import "@/app/play/character/_components/character.css";
import Character from "./_components/character";
import TitleLoot from "./_components/TitleLoot";
import { useUserStore } from "@/utils/stores/userStore";
import { Button } from "@/components/common";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, Suspense } from "react";
import Image from "next/image";
import { EXP_TO_LEVEL_UP } from "@/constants/game";

function getProgressMessage(progress: number | undefined): string {
    const p = progress ?? 0;
    if (p === 0) return "새로운 모험을 시작해볼까?";
    if (p <= 30) return "천천히 하고 있어!";
    if (p <= 60) return "좋은 페이스야!";
    if (p <= 90) return "거의 다 왔어!";
    return "오늘의 모험 완료!";
}

export default function CharacterPage() {
    const router = useRouter();
    const pathname = usePathname();
    const { id, nickname, progress, str, int, emo, fin, liv, level, exp, willpower, maxWillpower, fetchUser } = useUserStore();

    useEffect(() => {
        if (pathname === "/play/character" && id) {
            fetchUser();
        }
    }, [pathname, id, fetchUser]);

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/signout", { method: "POST" });
            router.push("/");
        } catch (error) {
            console.error("로그아웃 실패:", error);
        }
    };

    const currentLevel = level ?? 1;
    const currentExp = exp ?? 0;
    const expToNext = EXP_TO_LEVEL_UP(currentLevel);
    const expPercent = Math.min((currentExp / expToNext) * 100, 100);
    const progressValue = progress ?? 0;

    return (
        <div className="cozy-page">
            {/* 배경 */}
            <Image
                src="/images/backgrounds/bg_01.png"
                alt="배경"
                fill
                loading="eager"
                className="object-cover z-0"
                unoptimized
            />

            <div className="relative flex flex-col items-center w-full">
                {/* 로그아웃 */}
                <div className="w-full flex justify-end px-4 pt-3 absolute top-0 right-0 z-20">
                    <Button size={"S"} state={"error"} onClick={handleLogout}>
                        로그아웃
                    </Button>
                </div>

                {/* ===== 양피지 패널 영역 ===== */}
                <div className="parchment-wrap">
                    {/* 양피지 패널 */}
                    <div className="parchment-panel">
                        <div className="parchment-content">
                            {/* 상단 row: 레벨 배지 (우측정렬) */}
                            <div className="parchment-level-row">
                                <div className="info-badge level-badge">
                                    Lv.{currentLevel} {nickname ?? "모험가"}
                                </div>
                            </div>

                            {/* 중간 row: 능력치 제목(좌) + 의지력/EXP(우) */}
                            <div className="parchment-header-row">
                                <h2 className="parchment-title">능력치</h2>
                                <div className="parchment-badge-row">
                                    <div className="info-badge wp-badge">
                                        의지력 {willpower ?? 100}/{maxWillpower ?? 100}
                                    </div>
                                    <div className="info-badge exp-badge">
                                        EXP {currentExp}/{expToNext}
                                    </div>
                                </div>
                            </div>

                            {/* 언더바 */}
                            <div className="parchment-divider" />

                            {/* 능력치 리스트 */}
                            <Suspense>
                                <Status
                                    str={str ?? 0}
                                    int={int ?? 0}
                                    emo={emo ?? 0}
                                    fin={fin ?? 0}
                                    liv={liv ?? 0}
                                />
                            </Suspense>
                        </div>
                    </div>
                </div>

                {/* ===== 오늘의 진척도 ===== */}
                <div className="cozy-card progress-card">
                    <div className="progress-card-header">
                        <span className="progress-card-title">오늘의 모험</span>
                        <span className="progress-card-pct">{progressValue}%</span>
                    </div>
                    <div className="progress-card-track">
                        <div
                            className="progress-card-fill"
                            style={{ width: `${progressValue}%` }}
                        />
                    </div>
                    <p className="progress-card-msg">{getProgressMessage(progress)}</p>
                </div>

                {/* ===== 캐릭터 스프라이트 (풀밭 위) + 전리품 ===== */}
                <div className="char-sprite-area">
                    <Suspense>
                        <Character />
                    </Suspense>
                </div>
                <Suspense>
                    <TitleLoot />
                </Suspense>

                {/* 하단 여백 */}
                <div className="pb-24" />
            </div>
        </div>
    );
}
