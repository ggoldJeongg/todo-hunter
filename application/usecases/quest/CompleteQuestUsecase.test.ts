import { describe, it, expect, vi } from "vitest";
import { CompleteQuestUsecase } from "./CompleteQuestUsecase";
import { CompleteQuestError } from "./errors/CompleteQuestError";
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

  it("does not grant character rewards when status persistence fails", async () => {
    const fakeQuest = {
      id: 1,
      characterId: 100,
      tagged: "STR",
      name: "test quest",
      isWeekly: false,
      difficulty: "normal",
      createdAt: new Date(),
      updatedAt: new Date(),
      expiredAt: new Date("2099-01-01T00:00:00.000Z"),
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
    const questRepo = {
      findById: vi.fn().mockResolvedValue(fakeQuest),
      update: vi.fn(),
    } as unknown as IQuestRepository;
    const successDayRepo = {
      findByQuestIdSince: vi.fn().mockResolvedValue([]),
      createForCycle: vi.fn().mockResolvedValue({ id: 1 }),
    } as unknown as ISuccessDayRepository;
    const characterRepo = {
      findById: vi.fn().mockResolvedValue(fakeCharacter),
      updateCharacterStats: vi.fn(),
    } as unknown as ICharacterRepository;
    const statusRepo = {
      findByCharacterId: vi.fn().mockResolvedValue(fakeStatus),
      update: vi.fn().mockRejectedValue(new Error("status write failed")),
    } as unknown as IStatusRepository;

    const usecase = new CompleteQuestUsecase(
      questRepo,
      successDayRepo,
      characterRepo,
      statusRepo
    );

    await expect(usecase.completeQuest(100, 1)).rejects.toThrow("status write failed");
    expect(characterRepo.updateCharacterStats).not.toHaveBeenCalled();
  });

  it("does not grant duplicate rewards when the completion cycle already exists", async () => {
    const fakeQuest = {
      id: 1,
      characterId: 100,
      tagged: "STR",
      name: "test quest",
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
    const questRepo = {
      findById: vi.fn().mockResolvedValue(fakeQuest),
      update: vi.fn().mockResolvedValue(fakeQuest),
    } as unknown as IQuestRepository;
    const successDayRepo = {
      findByQuestIdSince: vi.fn().mockResolvedValue([]),
      createForCycle: vi.fn()
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null),
    } as unknown as ISuccessDayRepository;
    const characterRepo = {
      findById: vi.fn().mockResolvedValue(fakeCharacter),
      updateCharacterStats: vi.fn().mockResolvedValue(fakeCharacter),
    } as unknown as ICharacterRepository;
    const statusRepo = {
      findByCharacterId: vi.fn().mockResolvedValue(fakeStatus),
      update: vi.fn().mockResolvedValue(fakeStatus),
    } as unknown as IStatusRepository;
    const usecase = new CompleteQuestUsecase(
      questRepo,
      successDayRepo,
      characterRepo,
      statusRepo
    );

    await usecase.completeQuest(100, 1);
    await usecase.completeQuest(100, 1);

    expect(successDayRepo.createForCycle).toHaveBeenCalledTimes(2);
    expect(statusRepo.update).toHaveBeenCalledTimes(1);
    expect(characterRepo.updateCharacterStats).toHaveBeenCalledTimes(1);
  });

  it("rejects completion for a quest owned by another character", async () => {
    const questRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 1,
        characterId: 200,
        tagged: "STR",
        name: "other quest",
        isWeekly: false,
        difficulty: "normal",
        createdAt: new Date(),
        updatedAt: new Date(),
        expiredAt: null,
        days: [],
      }),
    } as unknown as IQuestRepository;
    const successDayRepo = {
      findByQuestIdSince: vi.fn(),
      createForCycle: vi.fn(),
    } as unknown as ISuccessDayRepository;
    const characterRepo = {
      findById: vi.fn(),
      updateCharacterStats: vi.fn(),
    } as unknown as ICharacterRepository;
    const statusRepo = {
      findByCharacterId: vi.fn(),
      update: vi.fn(),
    } as unknown as IStatusRepository;
    const usecase = new CompleteQuestUsecase(
      questRepo,
      successDayRepo,
      characterRepo,
      statusRepo
    );

    await expect(usecase.completeQuest(100, 1)).rejects.toBeInstanceOf(CompleteQuestError);
    expect(characterRepo.findById).not.toHaveBeenCalled();
    expect(successDayRepo.createForCycle).not.toHaveBeenCalled();
  });

  // ===== #64 트랜잭션화: 쓰기 단계가 주입된 트랜잭션을 통해 원자적으로 실행되는지 검증 =====
  describe("transaction (atomic write phase)", () => {
    const fakeQuest = {
      id: 1,
      characterId: 100,
      tagged: "STR",
      name: "tx quest",
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
    const fakeStatus = { id: 1, characterId: 100, str: 0, int: 0, emo: 0, fin: 0, liv: 0 };

    // 읽기 단계에서 쓰일 레포지토리(검증/조회용)
    function buildReadRepos() {
      return {
        questRepo: {
          findById: vi.fn().mockResolvedValue(fakeQuest),
          update: vi.fn(),
        } as unknown as IQuestRepository,
        successDayRepo: {
          findByQuestIdSince: vi.fn().mockResolvedValue([]),
          createForCycle: vi.fn(),
        } as unknown as ISuccessDayRepository,
        characterRepo: {
          findById: vi.fn().mockResolvedValue(fakeCharacter),
          updateCharacterStats: vi.fn(),
        } as unknown as ICharacterRepository,
        statusRepo: {
          findByCharacterId: vi.fn().mockResolvedValue(fakeStatus),
          update: vi.fn(),
        } as unknown as IStatusRepository,
      };
    }

    it("쓰기 4종을 주입된 트랜잭션 레포지토리로 실행한다 (모든 쓰기 성공 시에만 완료)", async () => {
      const read = buildReadRepos();
      const txRepos = {
        questRepository: { update: vi.fn().mockResolvedValue(fakeQuest) } as unknown as IQuestRepository,
        successDayRepository: { createForCycle: vi.fn().mockResolvedValue({ id: 1 }) } as unknown as ISuccessDayRepository,
        characterRepository: { updateCharacterStats: vi.fn().mockResolvedValue(fakeCharacter) } as unknown as ICharacterRepository,
        statusRepository: { update: vi.fn().mockResolvedValue(fakeStatus) } as unknown as IStatusRepository,
      };
      const transaction = vi.fn(async (op) => op(txRepos));

      const usecase = new CompleteQuestUsecase(
        read.questRepo,
        read.successDayRepo,
        read.characterRepo,
        read.statusRepo,
        undefined,
        transaction
      );

      await usecase.completeQuest(100, 1);

      // 쓰기는 tx 레포지토리를 통해 일어난다
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(txRepos.successDayRepository.createForCycle).toHaveBeenCalledTimes(1);
      expect(txRepos.characterRepository.updateCharacterStats).toHaveBeenCalledWith(100, {
        level: 1,
        exp: 20,
        willpower: 95,
        maxWillpower: 100,
      });
      // 읽기용으로 주입된 원본 레포지토리로는 쓰기가 일어나지 않는다
      expect(read.characterRepo.updateCharacterStats).not.toHaveBeenCalled();
      expect(read.statusRepo.update).not.toHaveBeenCalled();
    });

    it("트랜잭션 중간 쓰기(Status)가 실패하면 전체가 롤백되고 Character 보상은 지급되지 않는다", async () => {
      const read = buildReadRepos();
      const txRepos = {
        questRepository: { update: vi.fn().mockResolvedValue(fakeQuest) } as unknown as IQuestRepository,
        successDayRepository: { createForCycle: vi.fn().mockResolvedValue({ id: 1 }) } as unknown as ISuccessDayRepository,
        characterRepository: { updateCharacterStats: vi.fn() } as unknown as ICharacterRepository,
        statusRepository: { update: vi.fn().mockRejectedValue(new Error("status write failed")) } as unknown as IStatusRepository,
      };
      // 실제 prisma.$transaction 처럼: 콜백이 throw 하면 그대로 전파(=롤백)
      const transaction = vi.fn(async (op) => op(txRepos));

      const usecase = new CompleteQuestUsecase(
        read.questRepo,
        read.successDayRepo,
        read.characterRepo,
        read.statusRepo,
        undefined,
        transaction
      );

      await expect(usecase.completeQuest(100, 1)).rejects.toThrow("status write failed");
      // Status 실패 이후 Character 보상 지급은 호출조차 되지 않는다
      expect(txRepos.characterRepository.updateCharacterStats).not.toHaveBeenCalled();
    });

    it("트랜잭션 안에서 unique 제약 충돌(createForCycle null)이면 보상 없이 멱등 종료한다", async () => {
      const read = buildReadRepos();
      const txRepos = {
        questRepository: { update: vi.fn() } as unknown as IQuestRepository,
        successDayRepository: { createForCycle: vi.fn().mockResolvedValue(null) } as unknown as ISuccessDayRepository,
        characterRepository: { updateCharacterStats: vi.fn() } as unknown as ICharacterRepository,
        statusRepository: { update: vi.fn() } as unknown as IStatusRepository,
      };
      const transaction = vi.fn(async (op) => op(txRepos));

      const usecase = new CompleteQuestUsecase(
        read.questRepo,
        read.successDayRepo,
        read.characterRepo,
        read.statusRepo,
        undefined,
        transaction
      );

      // 에러를 던지지 않고 조용히 종료(멱등)
      await expect(usecase.completeQuest(100, 1)).resolves.toBeUndefined();
      expect(txRepos.statusRepository.update).not.toHaveBeenCalled();
      expect(txRepos.characterRepository.updateCharacterStats).not.toHaveBeenCalled();
    });
  });
});
