"use client";

import { useEffect, useMemo, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import styles from "./character.module.css";

// 스탯 태그 → 표시 라벨 매핑 (성장 기록 / 생활 리듬 공용)
const TAG_TO_LABEL: Record<string, string> = {
    STR: "체력",
    INT: "지력",
    EMO: "매력",
    FIN: "경제력",
    LIV: "생활력",
};

// 카테고리(태그) 색상 — 앱 전역 스탯 팔레트와 동일
const TAG_ORDER = ["STR", "INT", "EMO", "FIN", "LIV"] as const;
type Tag = (typeof TAG_ORDER)[number];
const TAG_COLOR: Record<Tag, string> = {
    STR: "#C84B3A",
    INT: "#6B8FB8",
    EMO: "#C97B8E",
    FIN: "#B89A4E",
    LIV: "#9B7CB8",
};

interface RhythmHour {
    hour: number;
    total: number;
    byTag: Record<string, number>;
}

export interface RecentCompletedItem {
    successDayId: number;
    questName: string;
    tagged: string;
    difficulty: string;
    statGain: number;
    completedAt: string;
}

interface StatsTabsProps {
    recentCompleted: RecentCompletedItem[];
}

/* ============================================================
   퍼블리싱용 샘플 데이터 (성장정원 잔디는 아직 샘플 — 별도 작업)
   ============================================================ */

// 잔디 — 최근 1년(364일) 결정론적 완료 수
const GRASS_DAYS: number[] = Array.from({ length: 364 }, (_, i) => {
    const dow = i % 7;
    const weekend = dow === 0 || dow === 6 ? 3 : 1;
    // 결정론적 의사난수 (사인 기반)
    const wobble = Math.round((Math.sin(i * 1.7) + Math.sin(i * 0.4) + 2) * 1.6);
    return Math.max(0, weekend + wobble - 1);
});

function grassColor(count: number): string {
    if (count <= 0) return "#EBE3CF";
    if (count < 2) return "#C6E0B4";
    if (count < 4) return "#8FC97A";
    if (count < 6) return "#5B8C5A";
    return "#3A6B3A";
}

export default function StatsTabs({ recentCompleted }: StatsTabsProps) {
    const [tab, setTab] = useState("rhythm");

    // ── 생활 리듬: 실제 완료 데이터 (시각 KST × 카테고리) ──
    const [rhythm, setRhythm] = useState<RhythmHour[] | null>(null);
    const [rhythmTotal, setRhythmTotal] = useState(0);

    useEffect(() => {
        let alive = true;
        fetch("/api/quest/rhythm", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!alive || !data?.hours) return;
                setRhythm(data.hours as RhythmHour[]);
                setRhythmTotal(data.total ?? 0);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, []);

    // 24시간 버킷 (데이터 없으면 0으로 채운 24칸)
    const hourData: RhythmHour[] = useMemo(
        () =>
            rhythm ??
            Array.from({ length: 24 }, (_, hour) => ({
                hour,
                total: 0,
                byTag: {},
            })),
        [rhythm]
    );

    // ── 생활 리듬: 피크 시간 계산 ──
    const peakHour = useMemo(() => {
        let max = -1;
        let idx = 0;
        hourData.forEach((h) => {
            if (h.total > max) {
                max = h.total;
                idx = h.hour;
            }
        });
        return idx;
    }, [hourData]);
    const maxBucket = Math.max(...hourData.map((h) => h.total), 1);
    const peakLabel =
        peakHour < 12 ? "아침형 인간" : peakHour < 18 ? "오후형 인간" : "저녁형 인간";
    const peakEmoji = peakHour < 12 ? "🌅" : peakHour < 18 ? "☀️" : "🌙";

    // ── 잔디: KPI 계산 ──
    const grassStats = useMemo(() => {
        const total = GRASS_DAYS.reduce((a, b) => a + b, 0);
        let cur = 0;
        let best = 0;
        GRASS_DAYS.forEach((c) => {
            if (c > 0) {
                cur += 1;
                best = Math.max(best, cur);
            } else {
                cur = 0;
            }
        });
        const week = GRASS_DAYS.slice(-7).reduce((a, b) => a + b, 0);
        return { total, best, week };
    }, []);

    // ── 잔디 SVG 좌표 ──
    const CELL = 11;
    const GAP = 3;
    const WEEKS = Math.ceil(GRASS_DAYS.length / 7);
    const gridW = 24 + WEEKS * (CELL + GAP);
    const gridH = 16 + 7 * (CELL + GAP);

    // ── 리듬 시계 SVG: 시(0~23)마다 카테고리별로 누적된 스포크 ──
    // 스포크 길이 = 그 시간대 총 완료수 / 카테고리 색 = 어떤 종류를 했는지.
    const CLOCK = 240;
    const CX = CLOCK / 2;
    const CY = CLOCK / 2;
    const INNER = 22; // 가운데 빈 원
    const OUTER = 96; // 최대 스포크 길이 반경
    const spokes = useMemo(
        () =>
            hourData.map(({ hour, total, byTag }) => {
                const angle = (hour / 24) * 2 * Math.PI; // 위(0시)에서 시계방향
                const sin = Math.sin(angle);
                const negCos = -Math.cos(angle);
                let r = INNER;
                const segments = TAG_ORDER.flatMap((tag) => {
                    const count = byTag[tag] ?? 0;
                    if (count <= 0) return [];
                    const r2 = r + (count / maxBucket) * (OUTER - INNER);
                    const seg = {
                        tag,
                        x1: CX + r * sin,
                        y1: CY + r * negCos,
                        x2: CX + r2 * sin,
                        y2: CY + r2 * negCos,
                        color: TAG_COLOR[tag],
                    };
                    r = r2;
                    return [seg];
                });
                return { hour, total, segments };
            }),
        [hourData, maxBucket]
    );

    return (
        <div className={styles["stats-dash"]}>
            <Tabs.Root value={tab} onValueChange={setTab}>
                {/* ===== 패널 본문 (탭을 패널 내부에 삽입) ===== */}
                <div className={styles["stats-panel-frame"]}>
                    {/* 패널 내부 상단 — 세그먼트형 탭 */}
                    <Tabs.List className={styles["stats-tablist"]} aria-label="통계 탭">
                        <Tabs.Trigger value="rhythm" className={styles["stats-tab"]}>
                            🕐 생활 리듬
                        </Tabs.Trigger>
                        <Tabs.Trigger value="growth" className={styles["stats-tab"]}>
                            📜 성장 기록
                        </Tabs.Trigger>
                        <Tabs.Trigger value="grass" className={styles["stats-tab"]}>
                            🌱 성장정원
                        </Tabs.Trigger>
                    </Tabs.List>

                    {/* ── 1. 생활 리듬 시계 ── */}
                    <Tabs.Content value="rhythm" className={styles["stats-tabpanel"]}>
                        <h3 className={styles["stats-section-title"]}>⏰ 생활 리듬 시계</h3>
                        <p className={styles["stats-section-sub"]}>
                            완료한 할일을 시간대·카테고리별로 — 24시간 분포(최근 180일).
                        </p>

                        {rhythmTotal === 0 ? (
                            <div
                                className={styles["growth-item"]}
                                style={{ justifyContent: "center", color: "#8A7D6B", marginTop: 8 }}
                            >
                                <span>아직 완료 기록이 없어요. 퀘스트를 완료하면 리듬이 채워져요.</span>
                            </div>
                        ) : (
                            <>
                                <div className={styles["rhythm-clock-wrap"]}>
                                    <svg
                                        viewBox={`0 0 ${CLOCK} ${CLOCK}`}
                                        className={styles["rhythm-clock-svg"]}
                                        role="img"
                                        aria-label="24시간 완료 분포 시계 (카테고리별)"
                                    >
                                        {/* 바깥 테두리 원 */}
                                        <circle
                                            cx={CX}
                                            cy={CY}
                                            r={OUTER + 14}
                                            fill="none"
                                            stroke="#C8A04E"
                                            strokeWidth={1.5}
                                            opacity={0.6}
                                        />
                                        {/* 시(時)마다 카테고리별로 누적된 스포크 */}
                                        {spokes.flatMap((s) =>
                                            s.segments.map((seg, i) => (
                                                <line
                                                    key={`${s.hour}-${i}`}
                                                    x1={seg.x1}
                                                    y1={seg.y1}
                                                    x2={seg.x2}
                                                    y2={seg.y2}
                                                    stroke={seg.color}
                                                    strokeWidth={6}
                                                    strokeLinecap="butt"
                                                >
                                                    <title>{`${s.hour}시 · 완료 ${s.total}개`}</title>
                                                </line>
                                            ))
                                        )}
                                        {/* 가운데 원 */}
                                        <circle cx={CX} cy={CY} r={INNER} fill="#4A3F2F" />
                                        <text
                                            x={CX}
                                            y={CY + 5}
                                            textAnchor="middle"
                                            fontSize="16"
                                        >
                                            🕐
                                        </text>
                                        {/* 시각 라벨 24 / 6 / 12 / 18 */}
                                        <text x={CX} y={18} textAnchor="middle" className={styles["clock-num"]}>24</text>
                                        <text x={CLOCK - 8} y={CY + 4} textAnchor="end" className={styles["clock-num"]}>6</text>
                                        <text x={CX} y={CLOCK - 6} textAnchor="middle" className={styles["clock-num"]}>12</text>
                                        <text x={10} y={CY + 4} textAnchor="start" className={styles["clock-num"]}>18</text>
                                    </svg>
                                </div>

                                {/* 카테고리 범례 */}
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        justifyContent: "center",
                                        gap: "5px 10px",
                                        margin: "2px 0",
                                    }}
                                >
                                    {TAG_ORDER.map((tag) => (
                                        <span
                                            key={tag}
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: "#6B5C42",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 9,
                                                    height: 9,
                                                    borderRadius: 2,
                                                    background: TAG_COLOR[tag],
                                                    display: "inline-block",
                                                }}
                                            />
                                            {TAG_TO_LABEL[tag]}
                                        </span>
                                    ))}
                                </div>

                                <div className={styles["rhythm-peak"]}>
                                    {peakEmoji} {peakLabel}{" "}
                                    <span className={styles["rhythm-peak-hl"]}>(피크 {peakHour}시)</span>
                                </div>
                                <p className={styles["stats-panel-desc"]}>
                                    바깥쪽으로 길수록 그 시간대에 많이 완료 · 색은 카테고리
                                </p>
                            </>
                        )}
                    </Tabs.Content>

                    {/* ── 2. 성장 기록 ── */}
                    <Tabs.Content value="growth" className={styles["stats-tabpanel"]}>
                        <h3 className={styles["stats-section-title"]}>📜 성장 기록</h3>
                        <p className={styles["stats-section-sub"]}>최근 완료한 퀘스트와 능력치 변화.</p>
                        <div className={styles["growth-list"]}>
                            {recentCompleted.length === 0 ? (
                                <div
                                    className={styles["growth-item"]}
                                    style={{ justifyContent: "center", color: "#8A7D6B" }}
                                >
                                    <span>아직 완료한 퀘스트가 없어요.</span>
                                </div>
                            ) : (
                                recentCompleted.map((item) => {
                                    const date = new Date(item.completedAt);
                                    const dateStr = `${(date.getMonth() + 1)
                                        .toString()
                                        .padStart(2, "0")}.${date
                                        .getDate()
                                        .toString()
                                        .padStart(2, "0")}`;
                                    const statLabel =
                                        TAG_TO_LABEL[item.tagged] ?? item.tagged;
                                    return (
                                        <div key={item.successDayId} className={styles["growth-item"]}>
                                            <span className={styles["growth-date"]}>{dateStr}</span>
                                            <span className={styles["growth-msg"]}>{item.questName}</span>
                                            <span className={styles["growth-gain"]}>
                                                {statLabel} +{item.statGain}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Tabs.Content>

                    {/* ── 3. 성장 정원*/}
                    <Tabs.Content value="grass" className={styles["stats-tabpanel"]}>
                        <div className={styles["grass-kpi-row"]}>
                            <div className={styles["grass-kpi"]}>
                                <div className={styles["grass-kpi-num"]}>{grassStats.total}</div>
                                <div className={styles["grass-kpi-label"]}>총 완료</div>
                            </div>
                            <div className={styles["grass-kpi"]}>
                                <div className={styles["grass-kpi-num"]}>{grassStats.best}</div>
                                <div className={styles["grass-kpi-label"]}>최장 연속(일)</div>
                            </div>
                            <div className={styles["grass-kpi"]}>
                                <div className={styles["grass-kpi-num"]}>{grassStats.week}</div>
                                <div className={styles["grass-kpi-label"]}>이번 주</div>
                            </div>
                        </div>
                        <h3 className={styles["stats-section-title"]}>🌱 완료 잔디 (최근 1년)</h3>
                        <div className={styles["grass-scroll"]}>
                            <svg
                                width={gridW}
                                height={gridH}
                                role="img"
                                aria-label="최근 1년 완료 잔디"
                            >
                                {["", "월", "", "수", "", "금", ""].map((t, i) =>
                                    t ? (
                                        <text
                                            key={i}
                                            x={2}
                                            y={16 + i * (CELL + GAP) + CELL - 1}
                                            className={styles["grass-axis"]}
                                        >
                                            {t}
                                        </text>
                                    ) : null
                                )}
                                {GRASS_DAYS.map((count, i) => {
                                    const week = Math.floor(i / 7);
                                    const dow = i % 7;
                                    return (
                                        <rect
                                            key={i}
                                            x={20 + week * (CELL + GAP)}
                                            y={14 + dow * (CELL + GAP)}
                                            width={CELL}
                                            height={CELL}
                                            rx={2}
                                            fill={grassColor(count)}
                                            className={styles["grass-cell"]}
                                        >
                                            <title>{`완료 ${count}개`}</title>
                                        </rect>
                                    );
                                })}
                            </svg>
                        </div>
                        <div className={styles["grass-legend"]}>
                            <span>적음</span>
                            <span className={styles["grass-sq"]} style={{ background: "#EBE3CF" }} />
                            <span className={styles["grass-sq"]} style={{ background: "#C6E0B4" }} />
                            <span className={styles["grass-sq"]} style={{ background: "#8FC97A" }} />
                            <span className={styles["grass-sq"]} style={{ background: "#5B8C5A" }} />
                            <span className={styles["grass-sq"]} style={{ background: "#3A6B3A" }} />
                            <span>많음</span>
                        </div>
                        <p className={styles["stats-panel-desc"]}>
                            SuccessDay를 날짜별 집계 → 잔디. 칸 호버 시 완료 수.
                        </p>
                    </Tabs.Content>
                </div>
            </Tabs.Root>
        </div>
    );
}
