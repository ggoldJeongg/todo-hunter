// 칭호명 → 이모지 아이콘 매핑
// Title 모델에 icon 필드가 없으므로 클라이언트 측에서 매핑
// (DB 마이그레이션 없이 빠르게 적용)

const TITLE_ICON_BY_NAME: Record<string, string> = {
  // STR — 체력 계열
  "초보 모험가": "💪",
  "단련된 전사": "🛡️",
  "강철의 용사": "⚔️",

  // INT — 지력 계열
  "호기심 많은 학생": "📚",
  "지식의 탐구자": "🔬",
  "현명한 현자": "🧙",

  // EMO — 감성 계열
  "감성의 씨앗": "🌱",
  "공감하는 마음": "💝",
  "영혼의 시인": "🎭",

  // FIN — 경제력 계열
  "절약하는 견습생": "🪙",
  "수완 좋은 상인": "💰",
  "황금의 대부호": "👑",

  // LIV — 생활력 계열
  "정돈된 일상": "🧹",
  "생활의 달인": "⭐",
  "완벽한 수호자": "🏠",

  // 기본 (엔딩 default)
  "방랑자": "🧭",
};

// reqStat 기반 fallback (혹시 DB에 새 칭호가 추가됐을 때 대비)
const TITLE_ICON_BY_STAT: Record<string, string> = {
  str: "🛡️",
  int: "📚",
  emo: "🌸",
  fin: "💰",
  liv: "⭐",
};

const DEFAULT_TITLE_ICON = "👑";

/**
 * 칭호명 + reqStat 으로 아이콘 결정
 * 1) 이름 직접 매핑 우선
 * 2) reqStat 기반 fallback
 * 3) 그래도 없으면 기본 왕관
 */
export function getTitleIcon(titleName: string | null | undefined, reqStat?: string | null): string {
  if (!titleName) return DEFAULT_TITLE_ICON;
  if (TITLE_ICON_BY_NAME[titleName]) return TITLE_ICON_BY_NAME[titleName];
  if (reqStat && TITLE_ICON_BY_STAT[reqStat]) return TITLE_ICON_BY_STAT[reqStat];
  return DEFAULT_TITLE_ICON;
}
