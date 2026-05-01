// 의문의 마법사가 처방하는 휴식 행동 풀
// 클릭 시 랜덤으로 한 가지를 추천. 새 컨텐츠는 여기에 추가만 하면 됨.

export interface RestActivity {
  emoji: string;
  name: string;
  description: string;
  wizardLine: string; // 마법사의 처방 멘트
  durationMin: number; // 예상 소요 시간 (분)
  category: "호흡" | "스트레칭" | "수분" | "시각" | "마음" | "수면" | "환경";
}

export const REST_ACTIVITIES: RestActivity[] = [
  // 호흡
  {
    emoji: "🌬️",
    name: "창문 열고 깊은 호흡",
    description: "코로 4초, 입으로 8초. 5번 반복.",
    wizardLine: "공기에는 작은 마나가 흐른다네. 천천히 들이마셔보게.",
    durationMin: 1,
    category: "호흡",
  },
  {
    emoji: "🫁",
    name: "박스 호흡 (4-4-4-4)",
    description: "들숨 4초 → 멈춤 4초 → 날숨 4초 → 멈춤 4초.",
    wizardLine: "마음이 흐트러질 땐 정사각형의 호흡을. 균형이 돌아온다.",
    durationMin: 2,
    category: "호흡",
  },
  {
    emoji: "🕯️",
    name: "한숨 두 번 내쉬기",
    description: "코로 짧게, 다시 짧게 들이마시고 입으로 길게 내쉰다.",
    wizardLine: "자연이 가르쳐준 가장 빠른 진정 마법이지.",
    durationMin: 1,
    category: "호흡",
  },

  // 스트레칭
  {
    emoji: "🤸",
    name: "어깨 돌리기 10회",
    description: "앞으로 10번, 뒤로 10번 천천히.",
    wizardLine: "앉아있는 그대의 어깨엔 무거운 그림자가 쌓여있어.",
    durationMin: 1,
    category: "스트레칭",
  },
  {
    emoji: "🧘",
    name: "목 좌우로 천천히",
    description: "오른쪽 5초, 왼쪽 5초. 너무 세게 누르지 말 것.",
    wizardLine: "그대의 목은 머리의 무게를 묵묵히 지고 있다네.",
    durationMin: 1,
    category: "스트레칭",
  },
  {
    emoji: "🦵",
    name: "다리 털기 30초",
    description: "앉은 채로 다리를 가볍게 흔들어 혈류를 풀어준다.",
    wizardLine: "고인 물은 썩는 법. 흐르게 하라.",
    durationMin: 1,
    category: "스트레칭",
  },
  {
    emoji: "🚶",
    name: "5분 동네 산책",
    description: "신발만 신고 나가서 천천히 한 바퀴.",
    wizardLine: "땅을 밟는 발걸음이 마음을 단단히 만들어준다.",
    durationMin: 5,
    category: "스트레칭",
  },
  {
    emoji: "🪑",
    name: "의자에서 일어나 기지개",
    description: "양팔을 머리 위로 쭉, 발끝까지 늘려본다.",
    wizardLine: "그대의 몸은 고무줄과 같다네. 늘려야 부드러워지지.",
    durationMin: 1,
    category: "스트레칭",
  },

  // 수분
  {
    emoji: "💧",
    name: "물 한 잔 천천히 마시기",
    description: "차갑지 않은 물로, 한 모금씩 음미하며.",
    wizardLine: "그대의 몸의 70%는 물. 채우지 않으면 마법도 풀린다.",
    durationMin: 2,
    category: "수분",
  },
  {
    emoji: "☕",
    name: "따뜻한 차 한 잔",
    description: "캐모마일·페퍼민트·루이보스 추천. 카페인 X.",
    wizardLine: "이 약초들은 옛 마법사들도 즐겨 마셨지.",
    durationMin: 5,
    category: "수분",
  },

  // 시각
  {
    emoji: "👀",
    name: "20-20-20 법칙",
    description: "20초간 6m(20피트) 이상 먼 곳을 바라본다.",
    wizardLine: "그대의 눈은 가까운 것에 묶여있어. 멀리 풀어주게.",
    durationMin: 1,
    category: "시각",
  },
  {
    emoji: "🌳",
    name: "창밖 풍경 바라보기",
    description: "1분간 가장 먼 나무·구름·건물에 시선을 둔다.",
    wizardLine: "세상은 모니터 너머에도 존재한다네.",
    durationMin: 1,
    category: "시각",
  },
  {
    emoji: "😌",
    name: "눈 감고 1분",
    description: "양손바닥으로 따뜻하게 눈을 덮어본다.",
    wizardLine: "어둠도 그대의 눈에는 약이 된다.",
    durationMin: 1,
    category: "시각",
  },

  // 마음
  {
    emoji: "📓",
    name: "지금 기분 한 줄 쓰기",
    description: "노트나 메모 앱에 솔직하게.",
    wizardLine: "이름 붙지 않은 감정은 그대를 흔든다네.",
    durationMin: 2,
    category: "마음",
  },
  {
    emoji: "🙏",
    name: "감사한 것 3개 떠올리기",
    description: "오늘 있었던 사소한 것이라도.",
    wizardLine: "감사는 마법사들의 가장 오래된 회복 주문이지.",
    durationMin: 2,
    category: "마음",
  },
  {
    emoji: "📵",
    name: "5분 폰 멀리 두기",
    description: "다른 방, 가방 속 — 시야 밖에.",
    wizardLine: "작은 화면 속에 그대의 영혼이 갇혀있는걸 알고 있나?",
    durationMin: 5,
    category: "마음",
  },
  {
    emoji: "🎵",
    name: "좋아하는 노래 한 곡",
    description: "가사 따라 부르거나 가만히 들어도 OK.",
    wizardLine: "음악은 가장 빠른 차원 이동 마법이라네.",
    durationMin: 4,
    category: "마음",
  },
  {
    emoji: "🐾",
    name: "반려동물·식물 관찰",
    description: "근처에 있다면 1분만 가만히 바라본다.",
    wizardLine: "말 없는 존재들이 가장 큰 위로를 주지.",
    durationMin: 1,
    category: "마음",
  },

  // 수면
  {
    emoji: "🛏️",
    name: "10분 파워냅",
    description: "알람 맞추고 어두운 곳에서. 20분 넘기지 말 것.",
    wizardLine: "짧은 잠은 강력한 회복 포션과 같다네.",
    durationMin: 10,
    category: "수면",
  },
  {
    emoji: "🪟",
    name: "햇빛 쬐기",
    description: "창가에 5분 서서 자연광을 받는다.",
    wizardLine: "태양의 빛에는 그대의 시계를 맞추는 힘이 있어.",
    durationMin: 5,
    category: "수면",
  },

  // 환경
  {
    emoji: "🌬️",
    name: "방 환기 1분",
    description: "창문 활짝 열고 공기를 갈아준다.",
    wizardLine: "오래 머문 공기는 마법을 둔하게 만들지.",
    durationMin: 1,
    category: "환경",
  },
  {
    emoji: "🧹",
    name: "책상 위 3개만 정리",
    description: "딱 3개. 더 하지 말 것.",
    wizardLine: "공간이 어지러우면 마음도 어지러워진다네.",
    durationMin: 2,
    category: "환경",
  },
  {
    emoji: "💡",
    name: "조명 한 단계 어둡게",
    description: "오후 3시 이후엔 점점 따뜻한 빛으로.",
    wizardLine: "그대의 눈도 하루의 흐름을 따라야 한다.",
    durationMin: 1,
    category: "환경",
  },
  {
    emoji: "🌿",
    name: "맨발로 바닥 밟기",
    description: "잠시만이라도. 차가운 감각이 깨운다.",
    wizardLine: "땅의 기운이 발을 통해 그대에게 흐른다.",
    durationMin: 1,
    category: "환경",
  },
];

export function getRandomRestActivity(
  excludeIndex: number | null = null
): { activity: RestActivity; index: number } {
  if (REST_ACTIVITIES.length === 0) {
    throw new Error("REST_ACTIVITIES 가 비어있음");
  }
  if (REST_ACTIVITIES.length === 1) {
    return { activity: REST_ACTIVITIES[0], index: 0 };
  }
  let idx: number;
  do {
    idx = Math.floor(Math.random() * REST_ACTIVITIES.length);
  } while (idx === excludeIndex);
  return { activity: REST_ACTIVITIES[idx], index: idx };
}
