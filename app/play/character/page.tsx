"use client";

import Status from "@/app/play/character/_components/status";
import styles from "./_components/character.module.css";
import Character from "./_components/character";
import StatsTabs from "./_components/StatsTabs";
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
        <div className={styles["cozy-page"]}>
            {/* ===== 상단 헤더 — 설정 (sticky) ===== */}
            <header className="sticky top-0 z-50 mx-auto flex w-[92%] max-w-[460px] items-center justify-end gap-2 px-[2px] pt-[max(10px,env(safe-area-inset-top,10px))] pb-2">
                <button
                    type="button"
                    onClick={() => router.push("/settings")}
                    className="inline-flex cursor-pointer items-center gap-[5px] border-2 border-ink bg-paper py-[6px] pl-[11px] pr-[13px] text-[13px] font-bold text-ink shadow-[2px_2px_0_0_theme(colors.ink)] transition-none [image-rendering:pixelated] hover:bg-[#DED7C8] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    aria-label="설정"
                >
                    <span className="text-[14px] leading-none" aria-hidden="true">⚙</span>
                    설정
                </button>
            </header>

            {/* ===== 캐릭터 카드 + 레벨/정보 패널 ===== */}
            <section className="mx-auto mt-1 flex w-[92%] max-w-[460px] gap-2">
                {/* 좌: 초상 · 닉네임 · Lv (단일 카드, 내부 가로 구분선) */}
                <div className="flex w-[150px] shrink-0 flex-col overflow-hidden pixel-card">
                    {/* canvas 원본 250px → 표시 크기 명시 */}
                    <div className="flex h-[160px] items-center justify-center overflow-hidden [&_canvas]:!h-[140px] [&_canvas]:!w-[140px]">
                        <Suspense>
                            <Character direction="down" isWalking={false} />
                        </Suspense>
                    </div>
                    <p className="border-t-2 border-ink px-2 py-[7px] text-center font-galmuri11-bold text-[15px] text-ink">
                        {nickname ?? "모험가"}
                    </p>
                    <div className="border-t-2 border-ink px-2 py-[8px] text-center text-[11px] font-bold leading-snug text-ink break-keep">
                        {selectedTitle?.titleName ?? "아직 칭호 없음"}
                    </div>
                </div>

                {/* 우: 레벨(작게) → 컨디션 → 성격·특성 세로 스택 (왼쪽 카드 높이만큼 채움) */}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {/* 레벨 패널 (compact) */}
                    <div className="pixel-card flex items-center gap-3 px-3 py-2">
                        <div className="grid h-[46px] w-[46px] shrink-0 place-items-center bg-ink">
                            <span className="flex flex-col items-center leading-none">
                                <span className="text-[8px] font-bold tracking-wide text-stone">LV</span>
                                <span className="font-galmuri11-bold text-[18px] text-paper">{currentLevel}</span>
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-stone">다음 레벨까지</p>
                            <p className="text-[11px] font-bold tabular-nums text-ink">
                                EXP {currentExp} / {expToNext}
                            </p>
                            <div
                                className="relative mt-[4px] h-[10px] w-full overflow-hidden bg-ink"
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
                        <div className="pixel-card flex flex-1 flex-col items-center justify-center px-2 py-3 text-center">
                            <p className="text-[11px] font-bold text-ink">컨디션</p>
                            <span className="mt-2 text-[24px] leading-none" aria-hidden="true">🍀</span>
                            <p className="mt-2 font-galmuri11-bold text-[15px] text-ink">{condition.label}</p>
                            <div
                                className="mt-2 h-[8px] w-full overflow-hidden bg-ink"
                                role="meter"
                                aria-label="컨디션"
                                aria-valuenow={condition.value}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            >
                                <div className="h-full bg-[#6AAF6A]" style={{ width: `${condition.value}%` }} />
                            </div>
                            <p className="mt-1 text-[9px] tabular-nums text-stone">{condition.value}점 / 100점</p>
                        </div>

                        {/* 성격·특성 — 제목 가운데, 목록은 왼쪽 정렬 블록을 중앙 배치 */}
                        <div className="pixel-card flex flex-1 flex-col items-center justify-center px-2 py-3">
                            <p className="text-center text-[11px] font-bold text-ink">성격·특성</p>
                            <ul className="mx-auto mt-2 flex w-fit flex-col gap-[6px]">
                                {traits.length === 0 ? (
                                    <li className="flex items-center gap-[5px]">
                                        <span className="grid h-[16px] w-[16px] shrink-0 place-items-center bg-stone/30 text-[9px]">🔒</span>
                                        <span className="truncate text-[10px] text-stone">분석 중</span>
                                    </li>
                                ) : (
                                    <>
                                        {traits.map((t) => {
                                            const d = TRAIT_DISPLAY[t] ?? DEFAULT_TRAIT_DISPLAY;
                                            return (
                                                <li key={t} className="flex items-center gap-[5px]">
                                                    <span
                                                        className="grid h-[16px] w-[16px] shrink-0 place-items-center text-[9px]"
                                                        style={{ background: d.bg }}
                                                    >
                                                        {d.icon}
                                                    </span>
                                                    <span className="truncate text-[10px] font-bold text-ink">{t}</span>
                                                </li>
                                            );
                                        })}
                                        {traits.length < 3 && (
                                            <li className="flex items-center gap-[5px]">
                                                <span className="grid h-[16px] w-[16px] shrink-0 place-items-center bg-stone/30 text-[9px]">🔒</span>
                                                <span className="truncate text-[10px] text-stone">??????</span>
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
            <section className="mx-auto mt-2 w-[92%] max-w-[460px] pixel-card p-3">
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
