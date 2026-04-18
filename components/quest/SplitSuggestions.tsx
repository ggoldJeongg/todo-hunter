"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/common/Button";
import { Tag } from "@/components/common/Tag";

interface Suggestion {
  name: string;
  tagged: string;
}

interface SplitSuggestionsProps {
  suggestions: Suggestion[];
  loading: boolean;
  error: string | null;
  onConfirm: (selected: Suggestion[]) => void;
  onCancel: () => void;
  /** 원본 퀘스트 삭제 확인 (조회 화면에서만 사용) */
  showDeleteOriginal?: boolean;
  onDeleteOriginal?: () => void;
}

const SplitSuggestions = ({
  suggestions,
  loading,
  error,
  onConfirm,
  onCancel,
  showDeleteOriginal = false,
  onDeleteOriginal,
}: SplitSuggestionsProps) => {
  const [checked, setChecked] = useState<boolean[]>(
    () => suggestions.map(() => true)
  );
  const [names, setNames] = useState<string[]>(
    () => suggestions.map((s) => s.name)
  );
  const [deleteOriginal, setDeleteOriginal] = useState(false);

  React.useEffect(() => {
    setChecked(suggestions.map(() => true));
    setNames(suggestions.map((s) => s.name));
  }, [suggestions]);

  const toggleAll = () => {
    const allChecked = checked.every(Boolean);
    setChecked(checked.map(() => !allChecked));
  };

  const toggleOne = (idx: number) => {
    setChecked((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const updateName = (idx: number, value: string) => {
    setNames((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };

  const handleConfirm = () => {
    const selected = suggestions
      .map((s, i) => ({ ...s, name: names[i] }))
      .filter((_, i) => checked[i]);

    if (selected.length === 0) return;
    onConfirm(selected);

    if (deleteOriginal && onDeleteOriginal) {
      onDeleteOriginal();
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 is-rounded p-4 mt-3">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="animate-spin">&#9881;</span>
          할일을 분석하고 있습니다...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 is-rounded p-4 mt-3">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={onCancel}
          className="text-gray-400 text-xs mt-2 underline cursor-pointer"
        >
          닫기
        </button>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  const selectedCount = checked.filter(Boolean).length;

  return (
    <div className="bg-gray-800 is-rounded p-4 mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
          <span className="text-yellow-400">&#9889;</span> 쪼개기 추천
        </h4>
        <button
          onClick={toggleAll}
          className="text-[11px] text-gray-400 underline cursor-pointer"
        >
          {checked.every(Boolean) ? "전체 해제" : "전체 선택"}
        </button>
      </div>

      <div className="space-y-2">
        {suggestions.map((s, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 is-rounded p-2.5 transition-all ${
              checked[idx] ? "bg-gray-700" : "bg-gray-700/40 opacity-50"
            }`}
          >
            <button
              className="shrink-0 cursor-pointer"
              onClick={() => toggleOne(idx)}
            >
              <Image
                src={checked[idx] ? "/icons/check_on.svg" : "/icons/check_off.svg"}
                width={20}
                height={20}
                alt={checked[idx] ? "선택됨" : "미선택"}
              />
            </button>
            <input
              type="text"
              value={names[idx]}
              onChange={(e) => updateName(idx, e.target.value)}
              className="flex-1 bg-transparent text-white text-sm outline-none border-b border-transparent focus:border-gray-500"
              maxLength={40}
            />
            <Tag variant={s.tagged as "STR" | "INT" | "EMO" | "FIN" | "LIV"} className="text-[10px]">
              {s.tagged}
            </Tag>
          </div>
        ))}
      </div>

      {showDeleteOriginal && (
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={deleteOriginal}
            onChange={(e) => setDeleteOriginal(e.target.checked)}
            className="accent-red-500"
          />
          원본 퀘스트 삭제
        </label>
      )}

      <div className="flex gap-2">
        <Button
          state="primary"
          size="S"
          onClick={handleConfirm}
          disabled={selectedCount === 0}
          className={selectedCount === 0 ? "opacity-40" : ""}
        >
          {selectedCount}개 퀘스트 생성
        </Button>
        <Button size="S" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
};

export default SplitSuggestions;
