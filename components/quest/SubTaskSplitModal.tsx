"use client";

import React, { useEffect, useState } from "react";
import { useQuestStore, type SubTask } from "@/utils/stores/questStore";
import { MAX_SUBTASKS_PER_QUEST } from "@/constants/game";

interface SubTaskSplitModalProps {
  questId: number;
  questName: string;
  questTagged: "STR" | "INT" | "EMO" | "FIN" | "LIV";
  questDifficulty?: string;
  /** 이미 등록된 기존 서브태스크 (읽기 전용 표시) */
  existingSubTasks?: SubTask[];
  onClose: () => void;
}

const SUBTASK_NAME_MAX = 40;

// 칭호도감 모달 톤에 맞춘 갈색 책 페이지 팔레트
const COLOR = {
  ink: "#2a1d10",        // 메인 텍스트 (가장 진한 갈색)
  inkSoft: "#3a2a18",    // 보더/보조 텍스트 (살짝 옅은 진한 갈색)
  muted: "#5a4a38",      // 캡션/라벨
  faded: "#7a6850",      // 비활성 텍스트
  dashed: "#b59a6a",     // 점선 베이지
  cream: "#fff7e0",      // 밝은 양피지 강조
  gold: "#ffd96b",       // 노랑 강조 (추천 받기)
  primary: "#C84B3A",    // 빨강 강조
};

const SubTaskSplitModal = ({
  questId,
  questName,
  questTagged,
  questDifficulty,
  existingSubTasks = [],
  onClose,
}: SubTaskSplitModalProps) => {
  const { addSubTasks } = useQuestStore();

  // 한 퀘스트당 서브태스크 최대 개수: 기존 + 새로 추가 ≤ MAX_SUBTASKS_PER_QUEST
  const remainingSlots = Math.max(0, MAX_SUBTASKS_PER_QUEST - existingSubTasks.length);
  const limitReached = remainingSlots === 0;

  // 신규로 추가할 서브태스크 입력 목록.
  // 기본값은 빈 입력 1개(여유 슬롯이 있을 때만). 추천을 받으면 채워짐.
  const [drafts, setDrafts] = useState<string[]>(() => (limitReached ? [] : [""]));
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const updateDraft = (idx: number, value: string) =>
    setDrafts((prev) => prev.map((v, i) => (i === idx ? value : v)));

  const addDraft = () =>
    setDrafts((prev) => (prev.length >= remainingSlots ? prev : [...prev, ""]));

  const removeDraft = (idx: number) =>
    setDrafts((prev) => {
      if (prev.length <= 1) return limitReached ? [] : [""];
      return prev.filter((_, i) => i !== idx);
    });

  const handleSuggest = async () => {
    if (suggestLoading) return;
    try {
      setSuggestLoading(true);
      setError(null);
      const res = await fetch("/api/quest/suggest-split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: questName,
          tagged: questTagged,
          difficulty: questDifficulty ?? "normal",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "추천 실패");

      const names = (json.suggestions ?? [])
        .map((s: { name?: string }) => (s.name ?? "").trim())
        .filter((s: string) => s.length > 0);

      if (names.length === 0) {
        setError("추천 결과가 없습니다. 직접 입력해주세요.");
        return;
      }
      // 기존 입력(비어있지 않은 것) + 추천 결과를 합치되 remainingSlots 만큼만 사용.
      const keep = drafts.filter((d) => d.trim().length > 0);
      const merged = [...keep, ...names].slice(0, remainingSlots);
      setDrafts(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "추천 실패");
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const cleaned = drafts.map((d) => d.trim()).filter((d) => d.length > 0);
    if (cleaned.length === 0) {
      setError("최소 1개 이상의 서브태스크를 입력해주세요.");
      return;
    }
    if (cleaned.length > remainingSlots) {
      setError(`서브태스크는 한 퀘스트당 최대 ${MAX_SUBTASKS_PER_QUEST}개까지 추가할 수 있어요.`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const result = await addSubTasks(questId, cleaned);
      if (result) onClose();
    } finally {
      setSaving(false);
    }
  };

  const newCount = drafts.filter((d) => d.trim().length > 0).length;
  const totalAfter = existingSubTasks.length + newCount;
  const saveDisabled = saving || newCount === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 font-galmuri9"
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: "rgba(26,16,8,0.72)" }} />
      <div
        className="relative z-10 w-full max-w-sm flex flex-col"
        style={{
          maxHeight: "85vh",
          background: "url('/images/backgrounds/titlebook-background_02.png') center/100% 100% no-repeat",
          padding: "32px 36px 28px",
          color: COLOR.ink,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 — 절대위치 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="font-galmuri11-bold absolute cursor-pointer"
          style={{ top: 36, right: 42, fontSize: 14, color: COLOR.inkSoft, background: "none", border: 0 }}
        >
          ✕
        </button>

        {/* 제목 */}
        <h2
          className="font-galmuri11-bold text-center"
          style={{ fontSize: 16, color: COLOR.ink, marginBottom: 12, letterSpacing: 1 }}
        >
          ⚔️ 할일 쪼개기
        </h2>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto" style={{ paddingRight: 2 }}>
          {/* 대상 퀘스트 */}
          <div
            className="text-center"
            style={{
              fontSize: 11,
              color: COLOR.inkSoft,
              background: "rgba(255,255,255,0.5)",
              border: `1.5px dashed ${COLOR.dashed}`,
              padding: "8px 10px",
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            <div className="font-galmuri11-bold" style={{ fontSize: 9, color: COLOR.muted, marginBottom: 2, letterSpacing: 1 }}>
              대상 퀘스트
            </div>
            <div className="font-galmuri11-bold truncate" style={{ fontSize: 12, color: COLOR.ink }}>
              {questName}
            </div>
          </div>

          {/* 기존 서브태스크 */}
          {existingSubTasks.length > 0 && (
            <section style={{ marginBottom: 12 }}>
              <h3
                className="font-galmuri11-bold"
                style={{ fontSize: 10, color: COLOR.muted, marginBottom: 4, letterSpacing: 1 }}
              >
                기존 서브태스크 ({existingSubTasks.length}개)
              </h3>
              <ul>
                {existingSubTasks.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-2"
                    style={{
                      fontSize: 11,
                      color: COLOR.inkSoft,
                      padding: "4px 2px",
                      borderBottom: "1px dashed rgba(58,42,24,0.2)",
                    }}
                  >
                    <span style={{ fontSize: 10, color: COLOR.faded, width: 16, textAlign: "center" }}>
                      {s.order + 1}
                    </span>
                    <span className={`flex-1 truncate ${s.completedAt ? "line-through" : ""}`}>
                      {s.name}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 새 서브태스크 추가 */}
          <section style={{ marginBottom: 10 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <h3
                className="font-galmuri11-bold"
                style={{ fontSize: 10, color: COLOR.muted, letterSpacing: 1 }}
              >
                새 서브태스크 추가{" "}
                <span style={{ color: limitReached ? "#a02a2a" : COLOR.faded, fontWeight: 400 }}>
                  ({drafts.filter((d) => d.trim().length > 0).length}/{remainingSlots})
                </span>
              </h3>
              <button
                type="button"
                onClick={handleSuggest}
                disabled={suggestLoading || limitReached}
                className="font-galmuri11-bold"
                style={{
                  fontSize: 9,
                  background: COLOR.inkSoft,
                  color: COLOR.gold,
                  padding: "2px 7px",
                  border: 0,
                  letterSpacing: 1,
                  opacity: suggestLoading || limitReached ? 0.4 : 1,
                  cursor: suggestLoading || limitReached ? "not-allowed" : "pointer",
                }}
              >
                {suggestLoading ? "분석중..." : "⚡ 추천 받기"}
              </button>
            </div>

            <ul>
              {drafts.map((s, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2"
                  style={{
                    background: "rgba(255,255,255,0.5)",
                    border: `1.5px solid ${COLOR.inkSoft}`,
                    padding: "5px 8px",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 10, color: COLOR.faded, width: 16, textAlign: "center" }}>
                    {existingSubTasks.length + idx + 1}
                  </span>
                  <input
                    type="text"
                    value={s}
                    placeholder={`서브태스크 ${idx + 1}`}
                    onChange={(e) => updateDraft(idx, e.target.value)}
                    maxLength={SUBTASK_NAME_MAX}
                    className="font-galmuri9"
                    style={{
                      flex: 1,
                      background: "transparent",
                      color: COLOR.ink,
                      fontSize: 11,
                      outline: "none",
                      border: 0,
                      minWidth: 0,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeDraft(idx)}
                    aria-label="삭제"
                    style={{
                      color: COLOR.faded,
                      background: "none",
                      border: 0,
                      fontSize: 14,
                      cursor: "pointer",
                      padding: "0 2px",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            {(() => {
              const addDisabled = limitReached || drafts.length >= remainingSlots;
              return (
                <button
                  type="button"
                  onClick={addDraft}
                  disabled={addDisabled}
                  className="font-galmuri11-bold w-full"
                  style={{
                    fontSize: 10,
                    color: addDisabled ? COLOR.faded : COLOR.inkSoft,
                    background: "rgba(255,255,255,0.4)",
                    border: `1.5px dashed ${COLOR.dashed}`,
                    padding: "5px 0",
                    marginTop: 4,
                    letterSpacing: 1,
                    opacity: addDisabled ? 0.5 : 1,
                    cursor: addDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  {limitReached
                    ? `최대 ${MAX_SUBTASKS_PER_QUEST}개까지만 가능`
                    : drafts.length >= remainingSlots
                      ? `남은 자리 없음 (최대 ${MAX_SUBTASKS_PER_QUEST}개)`
                      : "+ 직접 추가"}
                </button>
              );
            })()}
          </section>

          {error && (
            <p
              className="font-galmuri11-bold"
              style={{ fontSize: 10, color: "#a02a2a", marginBottom: 8 }}
            >
              {error}
            </p>
          )}

          {/* 요약 */}
          {newCount > 0 && (
            <p style={{ fontSize: 10, color: COLOR.inkSoft, lineHeight: 1.5 }}>
              저장하면 몬스터 HP{" "}
              <span className="font-galmuri11-bold" style={{ color: COLOR.ink }}>
                {totalAfter * 10}
              </span>
              {", "}
              <span className="font-galmuri11-bold" style={{ color: COLOR.ink }}>
                {totalAfter}회
              </span>{" "}
              공격으로 처치할 수 있어요.
            </p>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-center" style={{ gap: 8, marginTop: 12 }}>
          <button
            type="button"
            onClick={onClose}
            className="font-galmuri11-bold cursor-pointer"
            style={{
              padding: "8px 18px",
              fontSize: 11,
              background: COLOR.cream,
              color: COLOR.inkSoft,
              border: `2px solid ${COLOR.inkSoft}`,
              boxShadow: `0 3px 0 ${COLOR.inkSoft}`,
              letterSpacing: 1,
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveDisabled}
            className="font-galmuri11-bold"
            style={{
              padding: "8px 18px",
              fontSize: 11,
              background: saveDisabled ? "rgba(58,42,24,0.18)" : COLOR.primary,
              color: saveDisabled ? COLOR.faded : "#fff",
              border: `2px solid ${saveDisabled ? COLOR.faded : COLOR.inkSoft}`,
              boxShadow: saveDisabled ? "none" : `0 3px 0 ${COLOR.inkSoft}`,
              letterSpacing: 1,
              cursor: saveDisabled ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "저장중..." : `${newCount}개 추가`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubTaskSplitModal;
