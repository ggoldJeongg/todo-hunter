import { describe, it, expect, vi } from "vitest";
import { CompleteQuestUsecase } from "./CompleteQuestUsecase";
import type {
  IQuestRepository,
  ICharacterRepository,
  IStatusRepository,
  ISuccessDayRepository,
} from "@/domain/repositories";

describe("CompleteQuestUsecase", () => {
  it("normal 난이도 STR 퀘스트를 완료하면 EXP가 20 증가한다", async () => {
    // ===== 1. 가짜 데이터 준비 =====
    // 진짜 DB 안 쓰고, 함수가 받을 만한 데이터를 직접 만들어서 넘김
    const fakeQuest = {
      id: 1,
      characterId: 100,
      tagged: "STR",
      name: "테스트 퀘스트",
      isWeekly: false,
      difficulty: "normal",
      createdAt: new Date(),
      updatedAt: new Date(),
      expiredAt: null,
      days: [],
    };
    const fakeCharacter = {
      id: 100,
      userId: 1,
      level: 1,
      exp: 0,
      willpower: 100,
      maxWillpower: 100,
      endingCount: 0,
      endingState: 0,
      endingCode: null,
      outfitId: "fstr_v01",
      hairId: "bob1_v01",
      hatId: null,
    };
    const fakeStatus = {
      id: 1,
      characterId: 100,
      str: 0,
      int: 0,
      emo: 0,
      fin: 0,
      liv: 0,
    };

    // ===== 2. 가짜 Repository (mock) =====
    // vi.fn() = "이 함수가 호출되면 정해진 값을 반환해줘"라고 시키는 가짜 함수
    const questRepo = {
      findById: vi.fn().mockResolvedValue(fakeQuest),
      update: vi.fn().mockResolvedValue(fakeQuest),
    } as unknown as IQuestRepository;

    const successDayRepo = {
      findByQuestIdSince: vi.fn().mockResolvedValue([]), // 오늘 완료 기록 없음
      createForCycle: vi.fn().mockResolvedValue({}),
    } as unknown as ISuccessDayRepository;

    const characterRepo = {
      findById: vi.fn().mockResolvedValue(fakeCharacter),
      updateCharacterStats: vi.fn().mockResolvedValue(fakeCharacter),
    } as unknown as ICharacterRepository;

    const statusRepo = {
      findByCharacterId: vi.fn().mockResolvedValue(fakeStatus),
      update: vi.fn().mockResolvedValue(fakeStatus),
    } as unknown as IStatusRepository;

    // ===== 3. UseCase 실행 =====
    const usecase = new CompleteQuestUsecase(
      questRepo,
      successDayRepo,
      characterRepo,
      statusRepo,
    );
    await usecase.completeQuest(100, 1);

    // ===== 4. 검증: "updateCharacterStats가 EXP 20으로 호출됐나?" =====
    expect(characterRepo.updateCharacterStats).toHaveBeenCalledWith(100, {
      level: 1,
      exp: 20, // EXP_PER_QUEST(10) × DIFFICULTY_MULTIPLIER.normal(2) = 20
      willpower: 95, // 100 - WILLPOWER_COST(5)
      maxWillpower: 100,
    });
  });
});
