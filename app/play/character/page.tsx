"use client";

import Status from "@/app/play/character/_components/status";
import styles from "./_components/character.module.css";
import Character from "./_components/character";
import StatsTabs from "./_components/StatsTabs";
import { Button } from "@/components/common";
import { useUserStore } from "@/utils/stores/userStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, Suspense, useState, useMemo, useCallback } from "react";
import { EXP_TO_LEVEL_UP } from "@/constants/game";
import { deriveCondition, deriveTraits } from "@/constants/characterDerive";

// 특성 라벨 → (아이콘, 배경색) 매핑
const TRAIT_DISPLAY: Record<string, { icon: string; bg: string }> = {
    "학구파": { icon: "📚", bg: "#C5DAEC" },
    "활동가": { icon: "⚡", bg: "#F8C9C0" },
    "감수성 풍부": { icon: "🌸", bg: "#F4D2E4" },
    "현실주의자": { icon: "💰", bg: "#FAE5B5" },
    "꼼꼼한": { icon: "🔍", bg: "#D7EFC9" },
    "성실함": { icon: "🛡️", bg: "#C5DAEC" },
    "꾸준함": { icon: "🌱", bg: "#D7EFC9" },
    "균형잡힌": { icon: "⚖️", bg: "#E8E0CC" },
    "다재다능": { icon: "🎨", bg: "#F4D2E4" },
    "수집가": { icon: "👑", bg: "#FAE5B5" },
};
const DEFAULT_TRAIT_DISPLAY = { icon: "⭐", bg: "#E8E0CC" };

interface SelectedTitle {
    titleId?: number;
    titleName: string | null;
    description: string | null;
    reqStat?: string | null;
}

interface RecentCompletedItem {
    successDayId: number;
    questName: string;
    tagged: string;
    difficulty: string;
    statGain: number;
    completedAt: string;
}

interface WeatherInfo {
    ok: boolean;
    temp: number | null;
    code: number;
    label: string;
    emoji: string;
    buff: string;
    /** -5 ~ +5: 컨디션 += moodEffect, 스트레스 -= moodEffect */
    moodEffect: number;
}

export default function CharacterPage() {
    const router = useRouter();
    const pathname = usePathname();
    const {
        id, nickname, str, int, emo, fin, liv,
        level, exp, willpower, maxWillpower, fetchUser,
    } = useUserStore();
    const [selectedTitle, setSelectedTitle] = useState<SelectedTitle | null>(null);
    const [recentCompleted, setRecentCompleted] = useState<RecentCompletedItem[]>([]);
    const [weather, setWeather] = useState<WeatherInfo | null>(null);

    // 장착 칭호 + 최근 완료 퀘스트 + 날씨 fetch
    const fetchExtras = useCallback(async () => {
        try {
            const [titleRes, recentRes, weatherRes] = await Promise.all([
                fetch("/api/title/selected", { credentials: "include" }),
                fetch("/api/quest/recent-completed?limit=5", { credentials: "include" }),
                fetch("/api/weather"),
            ]);
            if (titleRes.ok) {
                const data = await titleRes.json();
                setSelectedTitle(data);
            }
            if (recentRes.ok) {
                const data = await recentRes.json();
                setRecentCompleted(data.items ?? []);
            }
            if (weatherRes.ok) {
                const data = await weatherRes.json();
                setWeather(data);
            }
        } catch (err) {
            console.error("[character] extras fetch 실패:", err);
        }
    }, []);

    useEffect(() => {
        if (pathname === "/play/character" && id) {
            fetchUser();
            fetchExtras();
        }
    }, [pathname, id, fetchUser, fetchExtras]);

    const currentLevel = level ?? 1;
    const currentExp = exp ?? 0;
    const expToNext = EXP_TO_LEVEL_UP(currentLevel);
    const expPercent = Math.min((currentExp / expToNext) * 100, 100);
    const wp = willpower ?? 100;
    const wpMax = maxWillpower ?? 100;

    // 오늘 완료한 퀘스트 수 (recentCompleted 에서 오늘 날짜만 카운트)
    const todayCompletedCount = useMemo(() => {
        const today = new Date();
        const isSameDay = (d: Date) =>
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate();
        return recentCompleted.filter((it) => isSameDay(new Date(it.completedAt))).length;
    }, [recentCompleted]);

    // 오늘 활동량 비율 — 5개 완료 시 100% 로 정규화
    const todayActivityRatio = Math.min(todayCompletedCount / 5, 1);

    // 날씨 mood 보정값 (-5 ~ +5) — 스탯에는 영향 없음, derived 표시값에만 반영
    const weatherMood = weather?.moodEffect ?? 0;

    // derived: 컨디션 (의지력 60% + 오늘 활동량 40% + 날씨 보정)
    const condition = useMemo(
        () => deriveCondition(wp, wpMax, todayActivityRatio, weatherMood),
        [wp, wpMax, todayActivityRatio, weatherMood]
    );

    // 스트레스 = willpower 의 역계산 (의지력 100 = 스트레스 0)
    //   + 날씨 보정 (좋은 날씨 → 스트레스 ↓ / 나쁜 날씨 → 스트레스 ↑)
    const baseStress = wpMax - wp;
    const stress = Math.max(0, Math.min(100, baseStress - weatherMood));

    // derived: 성격·특성 (스탯 + 활동량 기반)
    const traits = useMemo(
        () =>
            deriveTraits(
                {
                    str: str ?? 0,
                    int: int ?? 0,
                    emo: emo ?? 0,
                    fin: fin ?? 0,
                    liv: liv ?? 0,
                },
                recentCompleted.length
            ),
        [str, int, emo, fin, liv, recentCompleted.length]
    );

    return (
        <div
            className={styles["cozy-page"]}
            style={{
                background:
                    "linear-gradient(hsla(0, 0%, 79%, 0.50), rgba(55, 42, 31, 0.3)), url('/images/backgrounds/character_room.png') center bottom 64px / cover no-repeat, var(--pixel-paper)",
            }}
        >
            {/* ===== 상단 헤더 — 설정 (sticky) ===== */}
            <header className="sticky top-0 z-50 mx-auto flex w-[92%] max-w-[460px] items-center justify-end gap-2 px-[2px] pt-[max(10px,env(safe-area-inset-top,10px))] pb-2">
                <Button
                    type="button"
                    onClick={() => router.push("/settings")}
                    state="outline"
                    aria-label="설정"
                    className="w-auto m-0 gap-[5px] px-3 py-1 text-[13px] font-bold bg-paper text-ink outline-0"
                >
                    <span className="text-[14px] leading-none" aria-hidden="true">⚙</span>
                    설정
                </Button>
            </header>

            {/* ===== 캐릭터 카드 + 레벨/정보 패널 ===== */}
            <section className="mx-auto mt-1 flex w-[92%] max-w-[460px] gap-2">
                {/* 좌: 캐릭터 스프라이트 + 하단 닉네임 (구분선·칭호 없음) */}
                <div className="frame-portrait flex aspect-[3/4] w-[150px] shrink-0 flex-col self-center overflow-hidden">
                    {/* 캐릭터 영역 — 배경패턴 / 그림자 / 스프라이트 3레이어 (뒤→앞).
                        스프라이트가 프레임 높이를 꽉 채우고(정사각, 좌우는 잘림), 발끝은 캔버스 94% 지점. */}
                    <div className="relative flex flex-1 overflow-hidden">
                        {/* 1) 배경 엠블럼 패턴 — 맨 뒤, 옅게. portrait_emblem.png 를 넣으면 표시됨 */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 z-0 bg-center bg-no-repeat opacity-10 [background-size:75%] [image-rendering:pixelated]"
                            style={{ backgroundImage: "url('/images/frames/portrait_emblem.png')" }}
                        />
                        {/* 2) 스프라이트 — 높이에 꽉 차게(정사각), 좌우 넘침은 잘림. translate-y 로 아래로 */}
                        <div className="absolute inset-0 z-[2] flex translate-y-[14px] items-center justify-center [&_canvas]:!h-full [&_canvas]:!w-auto [&_canvas]:!max-w-none">
                            <Suspense>
                                <Character direction="down" isWalking={false} />
                            </Suspense>
                        </div>
                    </div>
                    {/* 닉네임 — 카드 하단, 양옆 대괄호 장식 (프레임 안쪽으로 여백 확보) */}
                    <p className="shrink-0 px-2 pt-1 pb-5 text-center font-galmuri11-bold text-[15px] text-paper">
                        [ {nickname ?? "모험가"} ]
                    </p>
                </div>

                {/* 우: 레벨(작게) → 컨디션 → 성격·특성 세로 스택 (왼쪽 카드 높이만큼 채움) */}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {/* 레벨 패널 (compact) */}
                    <div className="frame-card frame-tint-level flex items-center gap-3 p-6">
                        <div className="grid h-[46px] w-[46px] shrink-0 place-items-center bg-ink">
                            <span className="flex flex-col items-center leading-none">
                                <span className="text-[8px] font-bold tracking-wide text-stone">LV</span>
                                <span className="font-galmuri11-bold text-[18px] text-paper">{currentLevel}</span>
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-[#5A5651]"> 다음 레벨까지</p>
                            <p className="text-[11px] font-bold tabular-nums text-ink">
                                EXP {currentExp} / {expToNext}
                            </p>
                            <div
                                className="relative mt-[4px] h-[10px] w-full overflow-hidden border border-ink bg-ink [image-rendering:pixelated]"
                                role="meter"
                                aria-label="경험치"
                                aria-valuenow={currentExp}
                                aria-valuemin={0}
                                aria-valuemax={expToNext}
                            >
                                <div className="h-full bg-[#E89BB5]" style={{ width: `${expPercent}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* 컨디션 | 성격·특성 가로 2열 (남는 높이 채움) */}
                    <div className="flex flex-1 gap-2">
                        {/* 컨디션 — 가운데 정렬 (제목 / 이모지 / 값 / 바 / 점수) */}
                        <div className="frame-card frame-tint-condition flex flex-1 flex-col items-center justify-center p-[1.2rem] text-center">
                            <p className="text-[11px] font-bold text-ink">컨디션</p>
                            <span className="mt-2 text-[24px] leading-none" aria-hidden="true">🍀</span>
                            <p className="mt-2 font-galmuri11-bold text-[15px] text-ink">{condition.label}</p>
                            <div
                                className="mt-2 h-[8px] w-full overflow-hidden border border-ink bg-ink [image-rendering:pixelated]"
                                role="meter"
                                aria-label="컨디션"
                                aria-valuenow={condition.value}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            >
                                <div className="h-full bg-[#6AAF6A]" style={{ width: `${condition.value}%` }} />
                            </div>
                            <p className="mt-1 text-[9px] tabular-nums text-[#5A5651]">{condition.value}점 / 100점</p>
                        </div>

                        {/* 성격·특성 — 제목 아래 전체폭 세로 목록 + 행 사이 점선 구분선 */}
                        <div className="frame-card flex flex-1 flex-col p-[1.2rem]">
                            <p className="text-center text-[11px] font-bold text-paper">성격·특성</p>
                            <ul className="mt-[8px] flex w-full flex-1 flex-col">
                                {traits.length === 0 ? (
                                    <li className="flex flex-1 items-center gap-[8px]">
                                        <span className="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-[4px] bg-stone/30 text-[12px]">🔒</span>
                                        <span className="truncate text-[11px] text-stone">분석 중</span>
                                    </li>
                                ) : (
                                    <>
                                        {traits.map((t) => {
                                            const d = TRAIT_DISPLAY[t] ?? DEFAULT_TRAIT_DISPLAY;
                                            return (
                                                <li key={t} className="flex flex-1 items-center gap-[8px]">
                                                    <span
                                                        className="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-[4px] text-[12px]"
                                                        style={{ background: d.bg }}
                                                    >
                                                        {d.icon}
                                                    </span>
                                                    <span className="truncate text-[11px] font-bold text-paper">{t}</span>
                                                </li>
                                            );
                                        })}
                                        {traits.length < 3 && (
                                            <li className="flex flex-1 items-center gap-[8px]">
                                                <span className="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-[4px] bg-stone/30 text-[12px]">🔒</span>
                                                <span className="truncate text-[11px] text-stone">??????</span>
                                            </li>
                                        )}
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
            {/* ===== 스탯 패널 ===== */}
            <section className="frame-card mx-auto mt-2 w-[92%] max-w-[460px] p-6">
                <Suspense>
                    <Status
                        str={str ?? 0}
                        int={int ?? 0}
                        emo={emo ?? 0}
                        fin={fin ?? 0}
                        liv={liv ?? 0}
                        stress={stress}
                    />
                </Suspense>
            </section>

            {/* ===== 모험 통계 — 생활 리듬 / 성장 기록 / 성장정원 탭 ===== */}
            <div className="mt-2">
                <StatsTabs recentCompleted={recentCompleted} />
            </div>

            {/* 하단 네비바에 가리지 않도록 spacer */}
            <div className={styles["bottom-nav-spacer"]} />
        </div>
    );
}
