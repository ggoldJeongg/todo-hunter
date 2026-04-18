// EndingState는 constants/enum.ts에서 정의됨

// ==================== 배경 이미지 매핑 ====================

const BG = {
  battle: "/endings/fight.png",
  library: "/endings/library.png",
  forest: "/endings/forest.png",
  market: "/endings/square.png",
  village: "/endings/town.png",
  lazy: "/endings/bad_room.png",
  hero: "/endings/hero.png", // TODO: 전용 이미지 생성 후 교체 (현재 town.png 복사본)
} as const;

// ==================== 엔딩 데이터 (endingCode → 이미지, 스토리) ====================

export interface DialogueLine {
  speaker: "narrator" | "player" | "npc";
  text: string;
}

interface EndingInfo {
  name: string;
  story: string[]; // 기존 호환용
  dialogue: DialogueLine[]; // 핑퐁 대화
  image: string;
}

export const ENDING_MAP: Record<string, EndingInfo> = {
  // 특수 엔딩
  LAZY_ADVENTURER: {
    name: "나태한 모험가",
    story: ["여관 침대에서 뒹굴며 한 주가 지나갔다.", "창밖으로 들려오는 모험가들의 발소리가 점점 멀어진다.", '"내일부터 시작하지 뭐..." 라고 중얼거리며 다시 눈을 감는다.'],
    dialogue: [
      { speaker: "narrator", text: "여관 침대에서 뒹굴며 한 주가 지나갔다." },
      { speaker: "npc", text: "자네... 이번 주에 뭘 한 거야?" },
      { speaker: "player", text: "음... 쉬었어요. 아주 열심히." },
      { speaker: "npc", text: "...그건 모험이 아니라 동면이라고 하지." },
      { speaker: "player", text: "내일부터 시작하죠 뭐..." },
      { speaker: "narrator", text: "창밖으로 들려오는 모험가들의 발소리가 점점 멀어진다." },
    ],
    image: BG.lazy,
  },
  TRUE_HERO: {
    name: "진정한 용사",
    story: ["검술도, 마법도, 마음도, 살림도 모두 갈고닦은 한 주.", '마을 사람들이 말한다. "저 사람이야말로 진정한 용사다."', "어떤 위기가 와도 흔들리지 않는, 균형 잡힌 영웅의 모습이 빛난다."],
    dialogue: [
      { speaker: "narrator", text: "검술도, 마법도, 마음도, 살림도 모두 갈고닦은 한 주." },
      { speaker: "npc", text: "자네를 보고 있으면 경이롭군. 못하는 게 뭔가?" },
      { speaker: "player", text: "그냥... 하나씩 하다 보니 여기까지 왔어요." },
      { speaker: "npc", text: "겸손하기까지! 저 사람이야말로 진정한 용사다!" },
      { speaker: "player", text: "아직 갈 길이 멀어요. 다음 주도 힘내야죠." },
      { speaker: "narrator", text: "어떤 위기가 와도 흔들리지 않는, 균형 잡힌 영웅의 모습이 빛난다." },
    ],
    image: BG.hero,
  },
  LEGENDARY: {
    name: "전설의 영웅",
    story: ["모든 분야에서 극에 달한 능력치. 세계가 당신의 이름을 기억한다.", '전설은 이렇게 기록된다 — "그는 모든 것을 해냈다."', "왕국의 기사도, 마법학원의 현자도, 모두가 당신을 우러러본다."],
    dialogue: [
      { speaker: "narrator", text: "모든 분야에서 극에 달한 능력치. 세계가 당신의 이름을 기억한다." },
      { speaker: "npc", text: "전하, 왕국 기사단에서 초청장이 왔습니다." },
      { speaker: "player", text: "마법학원에서도 왔던데... 몸이 열 개라도 모자라겠어." },
      { speaker: "npc", text: "당신은 이미 전설이에요. 모든 것을 해낸 사람." },
      { speaker: "player", text: "전설이라... 아직은 쑥스럽네요." },
      { speaker: "narrator", text: "왕국의 기사도, 마법학원의 현자도, 모두가 당신을 우러러본다." },
    ],
    image: BG.hero,
  },

  // 단일 스탯 엔딩
  STEEL_WARRIOR: {
    name: "강철의 전사",
    story: ["쉬지 않고 몸을 단련한 한 주. 근육에 힘이 넘친다.", "마을을 위협하던 몬스터를 압도적인 힘으로 제압했다.", '"강철의 전사 만세!" 사람들이 환호한다.'],
    dialogue: [
      { speaker: "narrator", text: "쉬지 않고 몸을 단련한 한 주. 근육에 힘이 넘친다." },
      { speaker: "npc", text: "저기! 마을 앞에 몬스터가 나타났어!" },
      { speaker: "player", text: "비켜. 내가 처리할게." },
      { speaker: "narrator", text: "한 방에 몬스터가 나가떨어졌다. 압도적인 힘이다." },
      { speaker: "npc", text: "강철의 전사 만세!" },
      { speaker: "player", text: "별거 아냐. 매일 훈련한 덕분이지." },
    ],
    image: BG.battle,
  },
  SAGE_PATH: {
    name: "현자의 길",
    story: ["지식을 갈구하며 책과 함께한 한 주.", "고대 마법서를 해독해 몬스터의 약점을 간파했다.", "힘이 아닌 지혜로 거둔 승리. 마법학원에서 초청장이 왔다."],
    dialogue: [
      { speaker: "narrator", text: "지식을 갈구하며 책과 함께한 한 주." },
      { speaker: "player", text: "이 고대 문자... 몬스터의 약점이 적혀있어!" },
      { speaker: "npc", text: "정말? 그걸 어떻게 해독한 거야?" },
      { speaker: "player", text: "매일 공부한 보람이 있네요." },
      { speaker: "npc", text: "마법학원에서 초청장이 왔습니다. 현자님." },
      { speaker: "player", text: "힘이 아닌 지혜로 거둔 승리... 나쁘지 않군." },
    ],
    image: BG.library,
  },
  EMPATHY_POET: {
    name: "공감의 시인",
    story: ["마음을 열고 세상과 교감한 한 주.", "몬스터와 대화에 성공했다. 알고 보니 외로운 존재였다.", "칼 대신 말로 해결한 이야기가 마을에 퍼진다."],
    dialogue: [
      { speaker: "narrator", text: "마음을 열고 세상과 교감한 한 주." },
      { speaker: "player", text: "잠깐, 저 몬스터... 울고 있는 거 아냐?" },
      { speaker: "npc", text: "뭐? 위험해! 물러서!" },
      { speaker: "player", text: "괜찮아. 얘기 좀 해보자, 친구." },
      { speaker: "narrator", text: "알고 보니 외로운 존재였다. 대화로 마음을 열었다." },
      { speaker: "npc", text: "칼 대신 말로 해결하다니... 대단하구나." },
    ],
    image: BG.forest,
  },
  GOLDEN_MERCHANT: {
    name: "황금의 상인",
    story: ["재화를 모으고 투자한 한 주. 금화가 쌓여간다.", "용병을 고용해 몬스터를 처리하고, 마을 경제를 부흥시켰다.", '"돈이면 안 되는 게 없지." 자신만만한 미소를 짓는다.'],
    dialogue: [
      { speaker: "narrator", text: "재화를 모으고 투자한 한 주. 금화가 쌓여간다." },
      { speaker: "npc", text: "몬스터가 나타났어요! 어떡하죠?" },
      { speaker: "player", text: "용병 길드에 의뢰 넣어. 돈은 내가 낼 테니." },
      { speaker: "npc", text: "역시 사장님! 마을 경제도 되살아나고 있어요!" },
      { speaker: "player", text: "돈이면 안 되는 게 없지." },
      { speaker: "narrator", text: "자신만만한 미소를 짓는 황금의 상인이 빛난다." },
    ],
    image: BG.market,
  },
  VILLAGE_GUARDIAN: {
    name: "마을의 수호자",
    story: ["마을 곳곳을 정비하며 보낸 한 주.", "성벽을 보강하고 함정을 설치해 몬스터가 접근조차 못 한다.", "마을 사람들이 평화로운 밤을 보낸다. 모두 당신 덕분이다."],
    dialogue: [
      { speaker: "narrator", text: "마을 곳곳을 정비하며 보낸 한 주." },
      { speaker: "player", text: "이쪽 성벽이 약해. 보강해야 해." },
      { speaker: "npc", text: "함정도 설치했더니 몬스터가 얼씬도 못 하네요!" },
      { speaker: "player", text: "당연하지. 매일 점검하고 있으니까." },
      { speaker: "npc", text: "덕분에 오늘도 평화로운 밤이에요. 감사합니다!" },
      { speaker: "narrator", text: "마을 사람들이 편히 잠든다. 모두 당신 덕분이다." },
    ],
    image: BG.village,
  },

  // 듀얼 스탯 엔딩
  MAGIC_SWORDSMAN: {
    name: "마검사",
    story: ["검과 마법, 두 가지 길을 동시에 걸은 한 주.", "전략적 전투로 보스급 몬스터를 단독 격파했다.", "마법 검사의 전설이 시작된다."],
    dialogue: [
      { speaker: "narrator", text: "검과 마법, 두 가지 길을 동시에 걸은 한 주." },
      { speaker: "npc", text: "보스급 몬스터라고? 지원군을 불러야..." },
      { speaker: "player", text: "필요 없어. 검과 마법이면 충분하니까." },
      { speaker: "narrator", text: "마법을 두른 검이 번개처럼 내리꽂혔다." },
      { speaker: "npc", text: "혼자서 보스를...?! 마검사의 전설이 시작됐어!" },
    ],
    image: BG.battle,
  },
  GUARDIAN_KNIGHT: {
    name: "수호기사",
    story: ["힘을 기르되, 지키고 싶은 사람을 떠올린 한 주.", "동료가 위험에 빠졌을 때 몸을 던져 막아냈다.", '"당신이 있어서 든든합니다." 동료의 눈에 눈물이 맺힌다.'],
    dialogue: [
      { speaker: "narrator", text: "힘을 기르되, 지키고 싶은 사람을 떠올린 한 주." },
      { speaker: "npc", text: "위험해! 피해!" },
      { speaker: "player", text: "내가 막을 테니 뒤로 물러나!" },
      { speaker: "narrator", text: "몸을 던져 동료를 지켰다. 방패가 산산조각 났지만." },
      { speaker: "npc", text: "당신이 있어서... 정말 든든합니다." },
      { speaker: "player", text: "지키고 싶은 사람이 있으면 강해지는 법이야." },
    ],
    image: BG.battle,
  },
  ARENA_CHAMPION: {
    name: "투기장의 챔피언",
    story: ["전투력을 갈고닦으며 상금을 노린 한 주.", "투기장에서 연전연승. 명성과 부를 동시에 거머쥐었다.", "관중의 환호 속에서 챔피언 벨트를 들어올린다."],
    dialogue: [
      { speaker: "narrator", text: "전투력을 갈고닦으며 상금을 노린 한 주." },
      { speaker: "npc", text: "다음 상대는 3연승 중인 강자입니다!" },
      { speaker: "player", text: "좋아, 상금이 두둑하겠군." },
      { speaker: "narrator", text: "압도적인 승리! 관중이 열광한다." },
      { speaker: "npc", text: "챔피언! 챔피언! 챔피언!" },
    ],
    image: BG.battle,
  },
  WILD_HUNTER: {
    name: "자급자족 사냥꾼",
    story: ["숲에서 몸을 단련하며 자연과 함께한 한 주.", "몬스터를 사냥하고, 직접 요리하고, 자유롭게 살아간다.", "누구에게도 얽매이지 않는 사냥꾼의 삶."],
    dialogue: [
      { speaker: "narrator", text: "숲에서 몸을 단련하며 자연과 함께한 한 주." },
      { speaker: "player", text: "오늘 사냥감은 이 녀석이군." },
      { speaker: "npc", text: "마을에 돌아오지 않을 거야?" },
      { speaker: "player", text: "숲이 내 집이야. 자유롭게 사는 게 좋아." },
      { speaker: "narrator", text: "누구에게도 얽매이지 않는 사냥꾼의 삶이 계속된다." },
    ],
    image: BG.forest,
  },
  HEALING_MAGE: {
    name: "치유의 마법사",
    story: ["지식과 공감 능력을 함께 키운 한 주.", "치유 마법을 개발해 몬스터에게 상처받은 마을 사람을 치료했다.", '"고마워요, 선생님." 아이의 미소가 보답이다.'],
    dialogue: [
      { speaker: "narrator", text: "지식과 공감 능력을 함께 키운 한 주." },
      { speaker: "npc", text: "선생님! 아이가 몬스터에게 다쳤어요!" },
      { speaker: "player", text: "걱정 마. 내가 개발한 치유 마법이면 돼." },
      { speaker: "narrator", text: "따뜻한 빛이 상처를 감싸 안았다." },
      { speaker: "npc", text: "고마워요, 선생님!" },
      { speaker: "player", text: "이 미소가 있으니까 계속할 수 있어." },
    ],
    image: BG.library,
  },
  ALCHEMIST: {
    name: "연금술사",
    story: ["지식을 돈으로 바꾸는 법을 터득한 한 주.", "몬스터 재료로 묘약을 제조해 대박 사업을 벌였다.", "실험실과 금고가 동시에 가득 찬다."],
    dialogue: [
      { speaker: "narrator", text: "지식을 돈으로 바꾸는 법을 터득한 한 주." },
      { speaker: "player", text: "이 몬스터 재료로 묘약을 만들면..." },
      { speaker: "npc", text: "또 실험이야? 이번엔 뭘 만드는 거야?" },
      { speaker: "player", text: "대박 묘약! 이번엔 확실해." },
      { speaker: "npc", text: "...진짜 대박이네?! 주문이 쏟아지고 있어!" },
      { speaker: "narrator", text: "실험실과 금고가 동시에 가득 찬다." },
    ],
    image: BG.library,
  },
  INVENTOR: {
    name: "발명가",
    story: ["머리를 쓰며 생활을 개선한 한 주.", "마법 도구를 발명해 마을의 생활 수준을 한 단계 끌어올렸다.", '"이 세상을 더 편리하게!" 오늘도 설계도를 그린다.'],
    dialogue: [
      { speaker: "narrator", text: "머리를 쓰며 생활을 개선한 한 주." },
      { speaker: "player", text: "이 도구를 쓰면 물 긷는 시간이 반으로 줄어!" },
      { speaker: "npc", text: "정말?! 마을 생활이 확 편해졌어!" },
      { speaker: "player", text: "이 세상을 더 편리하게! 그게 내 목표야." },
      { speaker: "narrator", text: "오늘도 설계도를 그리는 발명가의 하루가 계속된다." },
    ],
    image: BG.village,
  },
  BARD: {
    name: "음유시인",
    story: ["감성과 사업 감각을 동시에 발휘한 한 주.", "모험담을 노래로 만들어 전국을 순회한다.", "감동과 금화를 동시에 거두는 예술가의 삶."],
    dialogue: [
      { speaker: "narrator", text: "감성과 사업 감각을 동시에 발휘한 한 주." },
      { speaker: "player", text: "♪ 용사의 검이 번쩍이던 그날~ ♪" },
      { speaker: "npc", text: "와아! 앵콜! 앵콜!" },
      { speaker: "player", text: "감사합니다~ 다음 공연은 옆 마을에서!" },
      { speaker: "npc", text: "입장료 올려도 될 것 같은데요?" },
      { speaker: "narrator", text: "감동과 금화를 동시에 거두는 예술가의 삶." },
    ],
    image: BG.market,
  },
  DRUID: {
    name: "드루이드",
    story: ["자연과 마음으로 교감한 한 주.", "숲의 정령과 친구가 되어 자연의 균형을 지킨다.", '"숲이 당신을 기억합니다." 바람이 속삭인다.'],
    dialogue: [
      { speaker: "narrator", text: "자연과 마음으로 교감한 한 주." },
      { speaker: "player", text: "바람아, 오늘 숲의 상태는 어때?" },
      { speaker: "npc", text: "...숲이 아파하고 있어요. 남쪽 샘이 오염됐어요." },
      { speaker: "player", text: "알겠어. 내가 정화할게." },
      { speaker: "narrator", text: "따뜻한 손길에 숲이 다시 숨을 쉰다." },
      { speaker: "npc", text: "숲이 당신을 기억합니다... 고마워요." },
    ],
    image: BG.forest,
  },
  GUILD_MASTER: {
    name: "길드 마스터",
    story: ["재정과 실무를 동시에 챙긴 한 주.", "모험가 길드를 설립하고 체계적으로 마을을 운영한다.", "모든 모험가가 당신의 길드 문을 두드린다."],
    dialogue: [
      { speaker: "narrator", text: "재정과 실무를 동시에 챙긴 한 주." },
      { speaker: "npc", text: "길드 마스터님, 신입 모험가가 5명이나 왔어요!" },
      { speaker: "player", text: "좋아, 교육 프로그램 돌려. 장비도 지급하고." },
      { speaker: "npc", text: "재정은 괜찮을까요?" },
      { speaker: "player", text: "투자야, 투자. 좋은 인재가 최고의 자산이지." },
      { speaker: "narrator", text: "모든 모험가가 당신의 길드 문을 두드린다." },
    ],
    image: BG.market,
  },
  ORDINARY_DAY: {
    name: "평범한 하루",
    story: ["특별할 것 없는 평범한 한 주가 지나갔다.", "대단한 일은 없었지만, 그래도 하루하루를 살았다.", "다음 주에는 좀 더 열심히 해볼까?"],
    dialogue: [
      { speaker: "narrator", text: "특별할 것 없는 평범한 한 주가 지나갔다." },
      { speaker: "npc", text: "이번 주는 어땠어?" },
      { speaker: "player", text: "음... 딱히 특별한 건 없었어." },
      { speaker: "npc", text: "그래도 무사히 보냈잖아. 그것만으로도 충분해." },
      { speaker: "player", text: "그런가? 다음 주에는 좀 더 열심히 해볼까." },
    ],
    image: BG.village,
  },
};

// ==================== 기본값 ====================

export const DEFAULT_ENDING_IMAGE = BG.village;
export const DEFAULT_ENDING_PROMPT = "당신만의 특별한 여정이 새로운 이야기를 만들어냈습니다...";

// ==================== 페이드 애니메이션 ====================

export const FADE_STEP_DURATION = 500;
export const TOTAL_FADE_DURATION = FADE_STEP_DURATION * 7;
export const TOAST_DELAY = 500;
