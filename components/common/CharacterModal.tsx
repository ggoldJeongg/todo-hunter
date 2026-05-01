"use client";

import { useEffect, Suspense } from "react";
import Image from "next/image";
import Character from "@/app/play/character/_components/character";
import Status from "@/app/play/character/_components/status";
import { useUserStore } from "@/utils/stores/userStore";
import "@/components/common/CharacterModal.css";

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CharacterModal = ({ isOpen, onClose }: CharacterModalProps) => {
  const { nickname, level, willpower, maxWillpower, str, int, emo, fin, liv, fetchUser, id } = useUserStore();

  useEffect(() => {
    if (isOpen && id) {
      fetchUser();
    }
  }, [isOpen, id, fetchUser]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="cm-overlay" onClick={onClose}>
      <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
        {/* 양피지 배경 */}
        <div className="cm-paper-bg">
          <Image
            src="/images/backgrounds/paper-background.png"
            alt="양피지"
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="cm-content">
          {/* 닫기 버튼 */}
          <button className="cm-close" onClick={onClose}>✕</button>

          {/* 캐릭터 스프라이트 + 정보 */}
          <div className="cm-header">
            <div className="cm-sprite">
              <Suspense>
                <Character />
              </Suspense>
            </div>
            <div className="cm-info">
              <span className="cm-name">{nickname ?? "모험가"}</span>
              <span className="cm-level">LV.{level ?? 1}</span>
              <span className="cm-wp">⚡ {willpower ?? 100}/{maxWillpower ?? 100}</span>
            </div>
          </div>

          {/* 구분선 */}
          <div className="cm-divider" />

          {/* 능력치 */}
          <div className="cm-stats">
            <h3 className="cm-section-title">능력치</h3>
            <Suspense>
              <Status
                str={str ?? 0}
                int={int ?? 0}
                emo={emo ?? 0}
                fin={fin ?? 0}
                liv={liv ?? 0}
                stress={Math.max(0, Math.min(100, (maxWillpower ?? 100) - (willpower ?? 100)))}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterModal;
