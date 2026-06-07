import { ISplitSuggester, SplitSuggestion } from "@/domain/split/ISplitSuggester";

type Difficulty = "easy" | "normal" | "hard";
type Tagged = "STR" | "INT" | "EMO" | "FIN" | "LIV";

const DIFFICULTY_COUNT: Record<Difficulty, number> = {
  easy: 2,
  normal: 3,
  hard: 5,
};

// 키워드 → 템플릿 패턴 (tagged 자동 결정 포함)
interface KeywordPattern {
  keywords: string[];
  tagged: Tagged;
  steps: string[][];  // [easy(2개), normal(3개), hard(5개)]
}

const KEYWORD_PATTERNS: KeywordPattern[] = [
  // STR — 신체/운동
  {
    keywords: ["운동", "헬스", "헬스장", "gym"],
    tagged: "STR",
    steps: [
      ["워밍업 스트레칭", "본 운동 30분"],
      ["워밍업 스트레칭", "본 운동 40분", "쿨다운 스트레칭"],
      ["워밍업 10분", "유산소 20분", "근력 운동 30분", "쿨다운 10분", "샤워 및 정리"],
    ],
  },
  {
    keywords: ["달리기", "조깅", "러닝", "뛰기"],
    tagged: "STR",
    steps: [
      ["스트레칭 5분", "달리기 20분"],
      ["스트레칭 5분", "달리기 30분", "마무리 걷기 5분"],
      ["스트레칭 10분", "인터벌 달리기 20분", "지속 달리기 10분", "쿨다운 걷기 5분", "스트레칭 마무리"],
    ],
  },
  {
    keywords: ["수영"],
    tagged: "STR",
    steps: [
      ["준비운동", "수영 30분"],
      ["준비운동", "수영 30분", "마무리 샤워"],
      ["준비운동 10분", "자유형 연습", "배영 연습", "접영 연습", "마무리 정리"],
    ],
  },
  {
    keywords: ["자전거", "사이클", "라이딩"],
    tagged: "STR",
    steps: [
      ["장비 점검", "라이딩 30분"],
      ["장비 점검", "라이딩 40분", "마무리 스트레칭"],
      ["장비 점검", "워밍업 10분", "본 라이딩 40분", "쿨다운 10분", "장비 정리"],
    ],
  },
  {
    keywords: ["산책", "걷기", "워킹"],
    tagged: "STR",
    steps: [
      ["준비 스트레칭", "산책 20분"],
      ["준비 스트레칭", "산책 30분", "마무리 스트레칭"],
      ["준비 스트레칭", "빠르게 걷기 10분", "천천히 걷기 20분", "스트레칭 10분", "수분 보충"],
    ],
  },
  {
    keywords: ["요가", "필라테스"],
    tagged: "STR",
    steps: [
      ["호흡 준비", "동작 15분"],
      ["호흡 준비", "워밍업 동작", "본 동작 20분"],
      ["호흡 준비", "워밍업 10분", "균형 동작", "강화 동작", "마무리 호흡"],
    ],
  },

  // INT — 학습/독서/개발
  {
    keywords: ["공부", "학습", "스터디"],
    tagged: "INT",
    steps: [
      ["개념 정리", "문제 풀기"],
      ["개념 정리", "문제 풀기", "복습 및 오답 정리"],
      ["목표 설정", "개념 정리", "핵심 노트 작성", "문제 풀기", "오답 분석"],
    ],
  },
  {
    keywords: ["독서", "책 읽기", "책읽기", "책"],
    tagged: "INT",
    steps: [
      ["전반부 읽기", "후반부 읽기"],
      ["읽기 전 목차 확인", "본문 읽기", "핵심 내용 메모"],
      ["목차 및 개요 파악", "1장 읽기", "2장 읽기", "핵심 내용 요약", "소감 메모"],
    ],
  },
  {
    keywords: ["코딩", "개발", "프로그래밍", "구현", "개발하기"],
    tagged: "INT",
    steps: [
      ["설계 및 계획", "코드 구현"],
      ["요구사항 분석", "코드 구현", "테스트 및 디버깅"],
      ["요구사항 분석", "설계 작성", "코드 구현", "테스트 작성", "리팩토링"],
    ],
  },
  {
    keywords: ["강의", "수업", "인강", "강좌"],
    tagged: "INT",
    steps: [
      ["강의 시청", "핵심 노트 작성"],
      ["강의 시청", "핵심 노트 작성", "복습 퀴즈"],
      ["강의 전 예습", "강의 시청", "노트 정리", "실습 문제", "복습"],
    ],
  },
  {
    keywords: ["영어", "영어공부", "어학"],
    tagged: "INT",
    steps: [
      ["단어 암기", "문장 연습"],
      ["단어 암기", "문법 정리", "문장 읽기/쓰기"],
      ["단어 20개 암기", "문법 학습", "독해 연습", "쓰기 연습", "복습"],
    ],
  },
  {
    keywords: ["자격증", "시험", "수능", "토익", "토플"],
    tagged: "INT",
    steps: [
      ["이론 정리", "문제 풀기"],
      ["이론 정리", "기출 문제 풀기", "오답 분석"],
      ["학습 계획 수립", "이론 정리", "기출 풀기", "오답 분석", "취약 부분 보완"],
    ],
  },

  // EMO — 매력/관계/자기계발
  {
    keywords: ["명상", "마음챙김", "마인드풀"],
    tagged: "EMO",
    steps: [
      ["호흡 준비", "명상 10분"],
      ["조용한 공간 준비", "명상 15분", "오늘 감정 일기"],
      ["호흡 정리 5분", "명상 15분", "감사 일기", "내일 의도 설정", "마무리 스트레칭"],
    ],
  },
  {
    keywords: ["일기", "다이어리", "저널"],
    tagged: "EMO",
    steps: [
      ["오늘 감정 돌아보기", "일기 쓰기"],
      ["오늘 감정 돌아보기", "일기 쓰기", "내일 계획 적기"],
      ["하루 돌아보기", "감사한 일 3가지", "아쉬운 일 기록", "일기 작성", "내일 의도 설정"],
    ],
  },
  {
    keywords: ["친구", "연락", "만남", "약속"],
    tagged: "EMO",
    steps: [
      ["연락하기", "약속 잡기"],
      ["연락하기", "약속 잡기", "만남 준비"],
      ["연락하기", "일정 조율", "장소 정하기", "만남 준비", "만남 후 감사 표현"],
    ],
  },
  {
    keywords: ["취미", "그림", "음악", "악기", "기타", "피아노"],
    tagged: "EMO",
    steps: [
      ["준비 및 세팅", "30분 연습"],
      ["준비 및 세팅", "기초 연습", "응용 연습"],
      ["준비 및 세팅", "기초 연습 10분", "핵심 연습 20분", "응용 연습 10분", "정리 및 복습"],
    ],
  },

  // FIN — 재정/경제
  {
    keywords: ["가계부", "지출", "수입", "예산", "재정"],
    tagged: "FIN",
    steps: [
      ["수입/지출 확인", "가계부 기록"],
      ["수입/지출 확인", "가계부 기록", "예산 대비 분석"],
      ["이번 달 수입 확인", "고정 지출 정리", "변동 지출 정리", "저축 현황 확인", "다음 달 예산 계획"],
    ],
  },
  {
    keywords: ["저축", "적금", "투자"],
    tagged: "FIN",
    steps: [
      ["현재 잔액 확인", "저축 금액 이체"],
      ["현재 잔액 확인", "목표 금액 확인", "저축 이체"],
      ["잔액 확인", "목표 금액 대비 현황", "저축 이체", "투자 수익 확인", "다음 달 계획"],
    ],
  },
  {
    keywords: ["쇼핑", "구매", "구입"],
    tagged: "FIN",
    steps: [
      ["구매 목록 작성", "가격 비교"],
      ["구매 목록 작성", "가격 비교", "구매 결정"],
      ["구매 필요 항목 정리", "예산 확인", "가격 비교", "최저가 탐색", "구매 결정"],
    ],
  },

  // LIV — 생활/집안일
  {
    keywords: ["청소", "집청소", "대청소"],
    tagged: "LIV",
    steps: [
      ["정리정돈", "쓸기/닦기"],
      ["정리정돈", "쓸기/닦기", "쓰레기 버리기"],
      ["정리정돈", "먼지 털기", "바닥 청소", "화장실 청소", "쓰레기 분리수거"],
    ],
  },
  {
    keywords: ["설거지"],
    tagged: "LIV",
    steps: [
      ["그릇 모으기", "설거지하기"],
      ["그릇 모으기", "설거지하기", "물기 제거 및 정리"],
      ["그릇 분류", "기름기 제거", "설거지", "헹굼", "건조대 정리"],
    ],
  },
  {
    keywords: ["빨래", "세탁"],
    tagged: "LIV",
    steps: [
      ["빨래 분류", "세탁기 돌리기"],
      ["빨래 분류", "세탁기 돌리기", "건조/널기"],
      ["빨래 분류", "세탁기 설정", "세탁", "건조기/널기", "개서 정리"],
    ],
  },
  {
    keywords: ["요리", "밥", "식사 준비", "음식"],
    tagged: "LIV",
    steps: [
      ["재료 준비", "조리하기"],
      ["재료 준비", "조리하기", "설거지/정리"],
      ["레시피 확인", "재료 손질", "조리", "플레이팅", "설거지"],
    ],
  },
  {
    keywords: ["장보기", "마트", "시장"],
    tagged: "LIV",
    steps: [
      ["구매 목록 작성", "장보기"],
      ["냉장고 확인", "구매 목록 작성", "장보기"],
      ["냉장고 확인", "필요 항목 정리", "예산 확인", "장보기", "정리 수납"],
    ],
  },
  {
    keywords: ["병원", "진료", "치과", "검진"],
    tagged: "LIV",
    steps: [
      ["예약 확인", "병원 방문"],
      ["준비물 챙기기", "병원 방문", "처방 확인"],
      ["예약 확인", "준비물 챙기기", "병원 방문", "진료 내용 메모", "처방약 수령"],
    ],
  },
];

// 시간 패턴: "30분 독서" → 절반씩 분할
const TIME_PATTERN = /^(\d+)(분|시간)\s*(.+)$/;

function parseTimeKeyword(
  name: string,
  tagged: Tagged,
  count: number
): SplitSuggestion[] | null {
  const match = name.match(TIME_PATTERN);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const activity = match[3];

  const totalMinutes = unit === "시간" ? amount * 60 : amount;
  if (totalMinutes < 10) return null;

  const chunk = Math.round(totalMinutes / count);
  return Array.from({ length: count }, (_, i) => ({
    name: `${activity} ${chunk}분 (${i + 1}/${count})`,
    tagged,
  }));
}

// 태그별 기본 템플릿 (키워드 매칭 실패 시 폴백)
const TAG_DEFAULTS: Record<Tagged, string[][]> = {
  STR: [
    ["준비 스트레칭", "본 활동"],
    ["준비 스트레칭", "본 활동", "마무리 정리"],
    ["목표 설정", "워밍업", "본 활동", "쿨다운", "기록"],
  ],
  INT: [
    ["핵심 개념 정리", "실습/문제 풀기"],
    ["목표 설정", "학습하기", "복습 및 정리"],
    ["목표 설정", "개념 학습", "실습", "복습", "다음 학습 계획"],
  ],
  EMO: [
    ["현재 감정 체크", "감정 표현/해소"],
    ["현재 감정 체크", "활동하기", "소감 기록"],
    ["마음 준비", "감정 체크", "활동하기", "소감 기록", "내일 계획"],
  ],
  FIN: [
    ["현황 파악", "계획 실행"],
    ["현황 파악", "계획 실행", "결과 기록"],
    ["목표 확인", "현황 파악", "계획 실행", "결과 기록", "다음 단계 설정"],
  ],
  LIV: [
    ["준비하기", "실행하기"],
    ["준비하기", "실행하기", "마무리 정리"],
    ["목록 작성", "준비하기", "실행하기", "마무리 정리", "완료 확인"],
  ],
};

function getDifficultyIndex(difficulty: string): number {
  if (difficulty === "easy") return 0;
  if (difficulty === "hard") return 2;
  return 1; // normal
}

export class RuleSplitSuggester implements ISplitSuggester {
  suggest(name: string, tagged: string, difficulty: string): SplitSuggestion[] {
    const tag = (["STR", "INT", "EMO", "FIN", "LIV"].includes(tagged)
      ? tagged
      : "STR") as Tagged;

    const diffKey = (["easy", "normal", "hard"].includes(difficulty)
      ? difficulty
      : "normal") as Difficulty;

    const count = DIFFICULTY_COUNT[diffKey];
    const diffIdx = getDifficultyIndex(diffKey);

    // 1. 시간 키워드 파싱 ("30분 독서" 등)
    const timeSplit = parseTimeKeyword(name, tag, count);
    if (timeSplit) return timeSplit;

    // 2. 키워드 매칭
    const lowerName = name.toLowerCase();
    for (const pattern of KEYWORD_PATTERNS) {
      const matched = pattern.keywords.some((kw) => lowerName.includes(kw));
      if (matched) {
        const steps = pattern.steps[diffIdx];
        const sliced = steps.slice(0, count);
        return sliced.map((s) => ({ name: s, tagged: pattern.tagged }));
      }
    }

    // 3. 태그 기반 기본 템플릿 폴백
    const defaultSteps = TAG_DEFAULTS[tag][diffIdx];
    return defaultSteps.slice(0, count).map((s) => ({
      name: s,
      tagged: tag,
    }));
  }
}
