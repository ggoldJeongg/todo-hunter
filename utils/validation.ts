export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const LOGIN_ID_PATTERN = /^[A-Za-z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 이메일 정규화 (앞뒤 공백 제거 + 소문자화).
 * 인증 코드 발송/검증/가입 등 이메일이 Redis 키·DB 조회에 쓰이는 모든 곳에서
 * 반드시 동일하게 적용해야 키가 어긋나지 않는다.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
const STATUS_TAGS = ["STR", "INT", "EMO", "FIN", "LIV"] as const;
const DIFFICULTIES = ["easy", "normal", "hard"] as const;
const WEEK_DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const MAX_SUBTASKS = 10;

export type StatusTag = (typeof STATUS_TAGS)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];

type UnknownRecord = Record<string, unknown>;

type SignupInput = {
  loginId: string;
  email: string;
  nickname: string;
  password: string;
};

type QuestInput = {
  name: string;
  tagged: StatusTag;
  isWeekly: boolean;
  difficulty: Difficulty;
  expiredAt?: Date;
  days?: string[];
  subTasks?: string[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(data: UnknownRecord, key: string) {
  const value = data[key];
  return typeof value === "string" ? value : null;
}

function assertStringLength(value: string, message: string, min: number, max: number) {
  if (value.length < min || value.length > max) {
    throw new ValidationError(message);
  }
}

function validateEmailValue(value: unknown) {
  if (typeof value !== "string") {
    throw new ValidationError("이메일 형식이 올바르지 않습니다.");
  }

  const email = normalizeEmail(value);
  assertStringLength(email, "이메일은 254자 이하로 입력해주세요.", 1, 254);
  if (!EMAIL_PATTERN.test(email)) {
    throw new ValidationError("이메일 형식이 올바르지 않습니다.");
  }

  return email;
}

function validateNicknameValue(value: unknown) {
  if (typeof value !== "string") {
    throw new ValidationError("닉네임을 입력해주세요.");
  }

  const nickname = value.trim();
  assertStringLength(nickname, "닉네임은 1자 이상 5자 이하로 입력해주세요.", 1, 5);
  return nickname;
}

function validateDateValue(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ValidationError("날짜 형식이 올바르지 않습니다.");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("날짜 형식이 올바르지 않습니다.");
  }

  return date;
}

function validateDays(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new ValidationError("반복 요일 형식이 올바르지 않습니다.");
  }

  const days = value.map((day) => {
    if (typeof day !== "string" || !WEEK_DAYS.includes(day as (typeof WEEK_DAYS)[number])) {
      throw new ValidationError("허용되지 않은 반복 요일입니다.");
    }
    return day;
  });

  return [...new Set(days)];
}

function validateSubTasks(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new ValidationError("서브태스크 형식이 올바르지 않습니다.");
  }
  if (value.length > MAX_SUBTASKS) {
    throw new ValidationError(`서브태스크는 최대 ${MAX_SUBTASKS}개까지 추가할 수 있습니다.`);
  }

  return value.map((item) => {
    if (typeof item !== "string") {
      throw new ValidationError("서브태스크 이름 형식이 올바르지 않습니다.");
    }

    const name = item.trim();
    assertStringLength(name, "서브태스크 이름은 1자 이상 20자 이하로 입력해주세요.", 1, 20);
    return name;
  });
}

export function parseObjectInput(value: unknown) {
  if (!isRecord(value)) {
    throw new ValidationError("요청 형식이 올바르지 않습니다.");
  }

  return value;
}

export function validateSignupInput(value: unknown): SignupInput {
  const data = parseObjectInput(value);
  const loginId = getString(data, "loginId")?.trim();
  const email = validateEmailValue(data.email);
  const nickname = validateNicknameValue(data.nickname);
  const password = getString(data, "password");

  if (!loginId || !password) {
    throw new ValidationError("모든 필드를 입력해야 합니다.");
  }
  assertStringLength(loginId, "아이디는 4자 이상 20자 이하로 입력해주세요.", 4, 20);
  if (!LOGIN_ID_PATTERN.test(loginId)) {
    throw new ValidationError("아이디는 영문, 숫자, 언더스코어만 사용할 수 있습니다.");
  }

  assertStringLength(password, "비밀번호는 8자 이상 72자 이하로 입력해주세요.", 8, 72);

  return { loginId, email, nickname, password };
}

export function validateKakaoSignupInput(value: unknown) {
  const data = parseObjectInput(value);
  return { nickname: validateNicknameValue(data.nickname) };
}

export function validateKakaoPendingInput(value: unknown) {
  const data = parseObjectInput(value);
  const kakaoId = data.kakaoId;
  if ((typeof kakaoId !== "string" && typeof kakaoId !== "number") || String(kakaoId).trim().length === 0) {
    throw new ValidationError("카카오 인증 정보가 올바르지 않습니다.");
  }

  return {
    kakaoId: String(kakaoId),
    kakaoEmail: validateEmailValue(data.kakaoEmail),
  };
}

export function validateQuestInput(value: unknown, options?: { partial?: false }): QuestInput;
export function validateQuestInput(value: unknown, options: { partial: true }): Partial<QuestInput>;
export function validateQuestInput(value: unknown, options: { partial?: boolean } = {}): QuestInput | Partial<QuestInput> {
  const data = parseObjectInput(value);
  const output: Partial<QuestInput> = {};

  if (!options.partial || data.name !== undefined) {
    const name = getString(data, "name")?.trim();
    if (!name) throw new ValidationError("퀘스트 이름을 입력해주세요.");
    assertStringLength(name, "퀘스트 이름은 1자 이상 20자 이하로 입력해주세요.", 1, 20);
    output.name = name;
  }

  if (!options.partial || data.tagged !== undefined) {
    if (typeof data.tagged !== "string" || !STATUS_TAGS.includes(data.tagged as StatusTag)) {
      throw new ValidationError("허용되지 않은 스탯 태그입니다.");
    }
    output.tagged = data.tagged as StatusTag;
  }

  if (!options.partial || data.isWeekly !== undefined) {
    if (typeof data.isWeekly !== "boolean") {
      throw new ValidationError("퀘스트 반복 형식이 올바르지 않습니다.");
    }
    output.isWeekly = data.isWeekly;
  }

  if (!options.partial || data.difficulty !== undefined) {
    const difficulty = data.difficulty ?? "normal";
    if (typeof difficulty !== "string" || !DIFFICULTIES.includes(difficulty as Difficulty)) {
      throw new ValidationError("허용되지 않은 난이도입니다.");
    }
    output.difficulty = difficulty as Difficulty;
  }

  if (!options.partial || data.expiredAt !== undefined) {
    output.expiredAt = validateDateValue(data.expiredAt);
  }

  if (!options.partial || data.days !== undefined) {
    output.days = validateDays(data.days) ?? [];
  }

  if (!options.partial || data.subTasks !== undefined) {
    output.subTasks = validateSubTasks(data.subTasks);
  }

  return output as QuestInput | Partial<QuestInput>;
}
