import { describe, expect, it } from "vitest";
import {
  parseId,
  validateKakaoPendingInput,
  validateKakaoSignupInput,
  validateQuestInput,
  validateSignupInput,
} from "@/utils/validation";

describe("parseId", () => {
  it("accepts positive integers and numeric strings", () => {
    expect(parseId(1)).toBe(1);
    expect(parseId(42)).toBe(42);
    expect(parseId("1")).toBe(1);
    expect(parseId(" 7 ")).toBe(7);
  });

  it("rejects non-integer, non-positive, and non-numeric values", () => {
    for (const bad of [0, -1, 1.5, NaN, "abc", "", "  ", null, undefined, {}, [], true]) {
      expect(() => parseId(bad)).toThrow("유효하지 않은");
    }
  });

  it("includes the provided label in the error message", () => {
    expect(() => parseId("abc", "퀘스트 ID")).toThrow("유효하지 않은 퀘스트 ID입니다.");
  });
});

describe("signup validation", () => {
  const validSignup = {
    loginId: "hunter_01",
    email: "hunter@example.com",
    nickname: "헌터",
    password: "password123",
  };

  it("accepts valid signup input and trims nickname", () => {
    expect(validateSignupInput({ ...validSignup, nickname: " 헌터 " })).toMatchObject({
      ...validSignup,
      nickname: "헌터",
    });
  });

  it("rejects invalid login ids", () => {
    expect(() => validateSignupInput({ ...validSignup, loginId: "ab" })).toThrow("아이디는 4자 이상 20자 이하");
    expect(() => validateSignupInput({ ...validSignup, loginId: "hunter!" })).toThrow("아이디는 영문, 숫자, 언더스코어만");
  });

  it("rejects invalid email and password lengths", () => {
    expect(() => validateSignupInput({ ...validSignup, email: "not-email" })).toThrow("이메일 형식");
    expect(() => validateSignupInput({ ...validSignup, password: "short" })).toThrow("비밀번호는 8자 이상 72자 이하");
  });

  it("applies the same nickname policy to kakao signup", () => {
    expect(validateKakaoSignupInput({ nickname: " 헌터 " })).toEqual({ nickname: "헌터" });
    expect(() => validateKakaoSignupInput({ nickname: "여섯글자닉네임" })).toThrow("닉네임은 1자 이상 5자 이하");
  });

  it("validates kakao pending data", () => {
    expect(validateKakaoPendingInput({ kakaoId: 1234, kakaoEmail: "hunter@example.com" })).toEqual({
      kakaoId: "1234",
      kakaoEmail: "hunter@example.com",
    });
    expect(() => validateKakaoPendingInput({ kakaoId: "", kakaoEmail: "hunter@example.com" })).toThrow("카카오 인증 정보");
    expect(() => validateKakaoPendingInput({ kakaoId: "1234", kakaoEmail: "bad" })).toThrow("이메일 형식");
  });
});

describe("quest validation", () => {
  const validQuest = {
    name: "운동하기",
    tagged: "STR",
    isWeekly: true,
    difficulty: "normal",
    expiredAt: "2026-06-20",
    days: ["월", "수"],
    subTasks: ["스쿼트"],
  };

  it("accepts and trims valid quest input", () => {
    const result = validateQuestInput({ ...validQuest, name: " 운동하기 " });

    expect(result).toMatchObject({
      name: "운동하기",
      tagged: "STR",
      isWeekly: true,
      difficulty: "normal",
      days: ["월", "수"],
      subTasks: ["스쿼트"],
    });
    expect(result.expiredAt).toBeInstanceOf(Date);
  });

  it("rejects invalid quest name, tag, difficulty, date and weekday", () => {
    expect(() => validateQuestInput({ ...validQuest, name: "" })).toThrow("퀘스트 이름");
    expect(() => validateQuestInput({ ...validQuest, tagged: "BAD" })).toThrow("스탯 태그");
    expect(() => validateQuestInput({ ...validQuest, difficulty: "extreme" })).toThrow("난이도");
    expect(() => validateQuestInput({ ...validQuest, expiredAt: "not-a-date" })).toThrow("날짜 형식");
    expect(() => validateQuestInput({ ...validQuest, days: ["월", "BAD"] })).toThrow("반복 요일");
  });

  it("rejects blank and overlong quest names", () => {
    expect(() => validateQuestInput({ ...validQuest, name: "   " })).toThrow();
    expect(() => validateQuestInput({ ...validQuest, name: "a".repeat(21) })).toThrow();
  });

  it("rejects invalid subtasks", () => {
    expect(() => validateQuestInput({ ...validQuest, subTasks: [""] })).toThrow("서브태스크 이름");
    expect(() => validateQuestInput({ ...validQuest, subTasks: Array.from({ length: 11 }, (_, index) => `할일${index}`) })).toThrow("서브태스크는 최대 10개");
  });

  it("allows partial quest updates while validating provided fields", () => {
    expect(validateQuestInput({ name: "수정" }, { partial: true })).toMatchObject({ name: "수정" });
    expect(() => validateQuestInput({ difficulty: "bad" }, { partial: true })).toThrow("난이도");
  });
});
