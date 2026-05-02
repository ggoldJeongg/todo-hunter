"use client";

import Status from "@/app/play/character/_components/status";
import "@/app/play/character/_components/character.css";
import Character from "./_components/character";
import CustomizeModal from "./_components/CustomizeModal";
import FeedbackButton from "./_components/FeedbackButton";
import { useUserStore } from "@/utils/stores/userStore";
import { Button } from "@/components/common";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, Suspense, useState, useMemo, useCallback } from "react";
import { EXP_TO_LEVEL_UP } from "@/constants/game";
import { deriveCondition, deriveTraits } from "@/constants/characterDerive";
import { getTitleIcon } from "@/constants/titleIcons";

// 스탯 태그 → 표시 라벨 매핑 (성장 기록용)
const TAG_TO_LABEL: Record<string, string> = {
    STR: "체력",
    INT: "지력",
    EMO: "감성",
    FIN: "경제력",
    LIV: "생활력",
};

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

type FacingDirection = "down" | "right" | "up" | "left";

// 좌/우 화살표로 회전 — 시계방향 / 반시계방향
const ROTATE_CLOCKWISE: Record<FacingDirection, FacingDirection> = {
    down: "right",
    right: "up",
    up: "left",
    left: "down",
};
const ROTATE_COUNTERCW: Record<FacingDirection, FacingDirection> = {
    down: "left",
    left: "up",
    up: "right",
    right: "down",
};


export default function CharacterPage() {
    const router = useRouter();
    const pathname = usePathname();
    const {
        id, nickname, str, int, emo, fin, liv,
        level, exp, willpower, maxWillpower, fetchUser,
    } = useUserStore();
    const [customizeOpen, setCustomizeOpen] = useState(false);
    const [selectedTitle, setSelectedTitle] = useState<SelectedTitle | null>(null);
    const [recentCompleted, setRecentCompleted] = useState<RecentCompletedItem[]>([]);
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    const [facing, setFacing] = useState<FacingDirection>("down");
    const [isWalking, setIsWalking] = useState(false);

    // 화살표 클릭 — 방향 회전 + 잠시 walk 애니메이션
    const handleArrowClick = (direction: "left" | "right") => {
        setFacing((prev) =>
            direction === "right" ? ROTATE_CLOCKWISE[prev] : ROTATE_COUNTERCW[prev]
        );
        setIsWalking(true);
        // 600ms 후 idle 로 복귀
        setTimeout(() => setIsWalking(false), 600);
    };

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
        <div className="cozy-page">
            {/* 상단 — 좌: 피드백 / 우: 로그아웃 */}
            <div className="char-logout-area">
                <FeedbackButton />
                <Button size={"S"} state={"error"} onClick={handleLogout}>
                    로그아웃
                </Button>
            </div>

            {/* ===== 메인 양피지 패널 — 캐릭터 + 6 스탯 ===== */}
            <div className="parchment-panel">
                <div className="parchment-content">
                    {/* 좌측: 캐릭터 portrait + 이름 + 설명 */}
                    <div className="char-portrait-frame">
                        <button
                            type="button"
                            onClick={() => setCustomizeOpen(true)}
                            className="char-portrait-bg"
                            aria-label="외형 편집"
                            title="클릭하여 외형 변경"
                            style={{ cursor: "pointer", padding: 0 }}
                        >
                            <Suspense>
                                <Character direction={facing} isWalking={isWalking} />
                            </Suspense>
                        </button>
                        <div className="char-portrait-arrows">
                            <button
                                type="button"
                                className="char-portrait-arrow"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleArrowClick("left");
                                }}
                                aria-label="좌측 회전"
                            >
                                ◀
                            </button>
                            <button
                                type="button"
                                className="char-portrait-arrow"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleArrowClick("right");
                                }}
                                aria-label="우측 회전"
                            >
                                ▶
                            </button>
                        </div>
                        <div className="char-name-banner">{nickname ?? "모험가"}</div>
                        <div className="char-description-row">
                            <span className="desc-icon">
                                {selectedTitle?.titleName
                                    ? getTitleIcon(selectedTitle.titleName, selectedTitle.reqStat)
                                    : "🧭"}
                            </span>
                            <span>
                                {selectedTitle?.titleName ?? "아직 칭호 없음"}
                            </span>
                        </div>
                    </div>

                    {/* 우측: Lv + EXP + 놀이치/XP + 6 스탯 */}
                    <div className="stats-side">
                        <div className="lv-exp-row">
                            <span className="lv-chip">Lv.{currentLevel}</span>
                            <div className="exp-line">
                                <span className="exp-line-text">
                                    EXP {currentExp} / {expToNext}
                                </span>
                                <div className="exp-line-track">
                                    <div
                                        className="exp-line-fill"
                                        style={{ width: `${expPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>

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
                    </div>
                </div>
            </div>

            {/* ===== 미니 카드 row: 컨디션 / 날씨 / 성격 ===== */}
            <div className="mini-card-row">
                {/* 컨디션 — 의지력 60% + 오늘 활동량 40% */}
                <div className="mini-card">
                    <div className="mini-card-title">컨디션</div>
                    <div className="mini-card-icon">🍀</div>
                    <div className="mini-card-value">{condition.label}</div>
                    <div className="mini-card-bar">
                        <div
                            className="mini-card-bar-fill"
                            style={{ width: `${condition.value}%` }}
                        />
                    </div>
                    <div className="mini-card-sub">
                        {condition.sub || `${condition.value}점 / 100점`}
                    </div>
                </div>

                {/* 오늘의 날씨 — Open-Meteo 실시간 (서울 좌표, 1시간 캐싱) */}
                <div className="mini-card">
                    <div className="mini-card-title">
                        오늘의 날씨
                        {weather?.temp !== null && weather?.temp !== undefined && (
                            <span style={{ marginLeft: 4, fontWeight: 600, color: "#6B5C42" }}>
                                {weather.temp}°
                            </span>
                        )}
                    </div>
                    <div className="mini-card-icon">{weather?.emoji ?? "🌥️"}</div>
                    <div className="mini-card-value">{weather?.label ?? "로딩 중..."}</div>
                    <div className="mini-card-sub" style={{ whiteSpace: "pre-line" }}>
                        {weather?.buff ?? ""}
                    </div>
                </div>

                {/* 성격·특성 — derive from stats + 활동량 */}
                <div className="mini-card">
                    <div className="mini-card-title">성격·특성</div>
                    <div className="trait-list">
                        {traits.length === 0 ? (
                            <div className="trait-item">
                                <span className="trait-icon" style={{ background: "#E8E0CC" }}>🔒</span>
                                <span className="trait-text muted">아직 분석 중...</span>
                            </div>
                        ) : (
                            <>
                                {traits.map((t) => {
                                    const d = TRAIT_DISPLAY[t] ?? DEFAULT_TRAIT_DISPLAY;
                                    return (
                                        <div key={t} className="trait-item">
                                            <span className="trait-icon" style={{ background: d.bg }}>
                                                {d.icon}
                                            </span>
                                            <span className="trait-text">{t}</span>
                                        </div>
                                    );
                                })}
                                {/* 잠긴 슬롯 — 다음 특성 잠금 표시 */}
                                {traits.length < 3 && (
                                    <div className="trait-item">
                                        <span className="trait-icon" style={{ background: "#E8E0CC" }}>🔒</span>
                                        <span className="trait-text muted">????????</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ===== 성장 기록 — 최근 5개 완료 퀘스트 ===== */}
            <div className="growth-record-card">
                <h3 className="growth-card-title">━━ 성장 기록 ━━</h3>
                <div className="growth-list">
                    {recentCompleted.length === 0 ? (
                        <div className="growth-item" style={{ justifyContent: "center", color: "#8A7D6B" }}>
                            <span>아직 완료한 퀘스트가 없어요.</span>
                        </div>
                    ) : (
                        recentCompleted.map((item) => {
                            const date = new Date(item.completedAt);
                            const dateStr = `${(date.getMonth() + 1)
                                .toString()
                                .padStart(2, "0")}.${date.getDate().toString().padStart(2, "0")}`;
                            const statLabel = TAG_TO_LABEL[item.tagged] ?? item.tagged;
                            return (
                                <div key={item.successDayId} className="growth-item">
                                    <span className="growth-date">{dateStr}</span>
                                    <span className="growth-msg">{item.questName}</span>
                                    <span className="growth-gain">
                                        {statLabel} +{item.statGain}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 하단 네비바에 가리지 않도록 spacer */}
            <div className="bottom-nav-spacer" />

            {/* 외형 커스터마이징 모달 */}
            <CustomizeModal
                open={customizeOpen}
                onClose={() => setCustomizeOpen(false)}
            />
        </div>
    );
}
