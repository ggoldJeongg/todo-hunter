"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUserStore } from "@/utils/stores/userStore";
import type { RenderTitleDTO, TitleDexDTO } from "@/application/usecases/title/dtos/RenderTitleDTO";
import EquippedCard from "./_components/EquippedCard";
import FilterChips, { type FilterValue } from "./_components/FilterChips";
import TitleCell from "./_components/TitleCell";
import TitleDetailModal from "./_components/TitleDetailModal";
import PageNav from "./_components/PageNav";
import { isStatKey, type StatKey } from "./_components/statMeta";

const PAGE_SIZE = 9;

const EMPTY_BY_STAT: Record<StatKey, number> = { str: 0, int: 0, emo: 0, fin: 0, liv: 0 };

export default function TitlePage() {
  const { str, int, emo, fin, liv, fetchUser } = useUserStore();

  const userStats: Record<StatKey, number> = useMemo(() => ({
    str: str ?? 0, int: int ?? 0, emo: emo ?? 0, fin: fin ?? 0, liv: liv ?? 0,
  }), [str, int, emo, fin, liv]);

  const [titles, setTitles] = useState<RenderTitleDTO[]>([]);
  const [equippedTitleId, setEquippedTitleId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadDex = useCallback(async () => {
    try {
      const res = await fetch("/api/title", { credentials: "include" });
      if (!res.ok) return;
      const data: TitleDexDTO = await res.json();
      setTitles(data.titles);
      setEquippedTitleId(data.equippedTitleId);
    } catch {
      // 칭호 도감 조회 실패 시 빈 상태 유지
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    loadDex();
  }, [loadDex]);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  const filtered = useMemo(
    () => (filter === "all" ? titles : titles.filter(t => t.reqStat === filter)),
    [titles, filter],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const totalAll = titles.length;
  const totalUnlocked = titles.filter(t => t.unlocked).length;
  const percent = totalAll > 0 ? Math.round((totalUnlocked / totalAll) * 100) : 0;

  const totalByStat = useMemo(() => {
    const acc: Record<StatKey, number> = { ...EMPTY_BY_STAT };
    for (const t of titles) {
      if (isStatKey(t.reqStat)) acc[t.reqStat] += 1;
    }
    return acc;
  }, [titles]);

  const unlockedByStat = useMemo(() => {
    const acc: Record<StatKey, number> = { ...EMPTY_BY_STAT };
    for (const t of titles) {
      if (t.unlocked && isStatKey(t.reqStat)) acc[t.reqStat] += 1;
    }
    return acc;
  }, [titles]);

  const equipped = equippedTitleId != null
    ? titles.find(t => t.titleId === equippedTitleId) ?? null
    : null;

  const selectedTitle = selectedId != null
    ? titles.find(t => t.titleId === selectedId) ?? null
    : null;

  const openDetail = (t: RenderTitleDTO) => {
    setSelectedId(t.titleId);
    setModalOpen(true);
  };

  const handleToggleEquip = async (id: number) => {
    const next = equippedTitleId === id ? null : id;
    // 낙관적 업데이트
    const prevTitles = titles;
    const prevEquipped = equippedTitleId;
    setEquippedTitleId(next);
    setTitles(ts => ts.map(t => ({ ...t, equipped: t.titleId === next })));
    setModalOpen(false);

    try {
      const res = await fetch("/api/title/equip", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleId: next }),
      });
      if (!res.ok) throw new Error("equip failed");
    } catch {
      // 롤백
      setTitles(prevTitles);
      setEquippedTitleId(prevEquipped);
    }
  };

  const handleFilter = (v: FilterValue) => {
    if (v === "all" || isStatKey(v)) setFilter(v);
  };

  return (
    <div
      className="font-galmuri9 flex flex-col flex-1 min-h-screen relative overflow-hidden bg-paper"
      style={{ imageRendering: "pixelated" }}
    >
      {/* 헤더 — 카운터만 우측 상단 */}
      <div
        className="flex items-center justify-end"
        style={{
          padding: "12px 16px 8px",
          color: "#151413",
        }}
      >
        {/* 수집 진행 카운터 — 골드 강조 유지 (희귀도/달성감) */}
        <div
          className="font-galmuri11-bold flex items-center"
          style={{
            gap: 6,
            background: "#151413",
            padding: "5px 10px",
            border: "2px solid #b8862c",
          }}
        >
          <span style={{ color: "#ffd96b", fontSize: 13 }}>{totalUnlocked}</span>
          <span style={{ fontSize: 10, color: "#E9E3D7", opacity: 0.7 }}>/ {totalAll}</span>
          <span style={{ fontSize: 9, color: "#ffd96b", marginLeft: 2 }}>{percent}%</span>
        </div>
      </div>

      {/* 장착 슬롯 */}
      <EquippedCard
        equipped={equipped}
        onClick={equipped ? () => openDetail(equipped) : undefined}
      />

      {/* 필터 칩 */}
      <FilterChips
        value={filter}
        onChange={handleFilter}
        totalAll={totalAll}
        totalByStat={totalByStat}
        unlockedByStat={unlockedByStat}
      />

      {/* 두루마리 그리드 */}
      <div
        className="pixel-card flex flex-col relative flex-1"
        style={{
          margin: "0 12px 90px",
          padding: "16px",
        }}
      >
        {/* 패널 상단 타이틀 */}
        <div
          className="font-galmuri11-bold text-center"
          style={{ fontSize: 17, color: "#151413", marginBottom: 10 }}
        >
          칭호 도감
        </div>

        <div
          className="flex-1 grid"
          style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 6, alignContent: "start" }}
        >
          {Array.from({ length: PAGE_SIZE }).map((_, i) => {
            const t = visible[i];
            if (!t) return <div key={`empty-${i}`} />;
            return (
              <TitleCell
                key={t.titleId}
                title={t}
                onClick={() => openDetail(t)}
              />
            );
          })}
        </div>

        <PageNav page={page} pages={pages} onChange={setPage} />
      </div>

      <TitleDetailModal
        title={selectedTitle}
        open={modalOpen}
        onOpenChange={setModalOpen}
        userStats={userStats}
        onToggleEquip={handleToggleEquip}
      />
    </div>
  );
}
