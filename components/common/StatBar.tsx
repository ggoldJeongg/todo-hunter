// 공용 프로그레스 바 (디자인 시스템)
// 둥근 pill 트랙 + 단색 위 세로 광택 그라데이션. HP·경험치·스탯 게이지 모두 재사용.

interface StatBarProps {
  value: number;
  max: number;
  /** 채움 색 (hex 또는 CSS var). 위에 광택 그라데이션이 얹힌다. */
  color: string;
  /** 바 높이(px). 기본 9 */
  height?: number;
  /** 트랙(빈 부분) 색. 기본 어두운 회색 */
  trackColor?: string;
  /** 모서리 반경. 기본 pill(9999px) */
  radius?: number | string;
  /** 외곽 래퍼 클래스 (폭/flex 지정용) */
  className?: string;
  ariaLabel?: string;
}

// 픽셀 게이지 셰이딩: 부드러운 그라데이션 대신 하드 스톱 밴드(하이라이트/기본/그림자)로
// 층을 딱딱 나눠 레트로 도트 느낌을 준다.
const GLOSS =
  "linear-gradient(to bottom," +
  " rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 22%," +
  " rgba(255,255,255,0.15) 22%, rgba(255,255,255,0.15) 44%," +
  " rgba(0,0,0,0) 44%, rgba(0,0,0,0) 70%," +
  " rgba(0,0,0,0.32) 70%, rgba(0,0,0,0.32) 100%)";

export default function StatBar({
  value,
  max,
  color,
  height = 9,
  trackColor = "#141414",
  radius = 9999,
  className,
  ariaLabel,
}: StatBarProps) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const br = typeof radius === "number" ? `${radius}px` : radius;
  return (
    <div
      role="meter"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{
        height,
        borderRadius: br,
        background: trackColor,
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.7)",
      }}
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${ratio * 100}%`,
          borderRadius: br,
          background: color,
          backgroundImage: GLOSS,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}
