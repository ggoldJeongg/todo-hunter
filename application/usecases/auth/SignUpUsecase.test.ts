import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpTokenPersistenceError, SignUpUsecase } from "./SignUpUsecase";

const mocks = vi.hoisted(() => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
}));

vi.mock("./GenerateAccessTokenUsecase", () => ({
  GenerateAccessTokenUsecase: vi.fn().mockImplementation(function () {
    return {
      execute: mocks.generateAccessToken,
    };
  }),
}));

vi.mock("./GenerateRefreshTokenUsecase", () => ({
  GenerateRefreshTokenUsecase: vi.fn().mockImplementation(function () {
    return {
      execute: mocks.generateRefreshToken,
    };
  }),
}));

const request = {
  loginId: "hunter",
  email: "hunter@example.com",
  password: "password123",
  nickname: "hunter",
};

function unusedRepository() {
  return new Proxy({}, {
    get() {
      throw new Error("transaction repositories should be used");
    },
  }) as never;
}

function createTransactionalSignUpUsecase(options: {
  failCharacter?: boolean;
  failStatus?: boolean;
  failRefreshToken?: boolean;
}) {
  const committed = {
    users: [] as Array<{ id: number; loginId: string }>,
    characters: [] as Array<{ id: number; userId: number }>,
    statuses: [] as Array<{ id: number; characterId: number }>,
  };

  const transaction = async <T>(
    operation: (repositories: {
      userRepository: { create: (data: { loginId: string }) => Promise<{ id: number; loginId: string }> };
      characterRepository: { create: (userId: number) => Promise<{ id: number; userId: number }> };
      statusRepository: { create: (characterId: number) => Promise<{ id: number; characterId: number }> };
    }) => Promise<T>
  ) => {
    const pending = {
      users: [] as Array<{ id: number; loginId: string }>,
      characters: [] as Array<{ id: number; userId: number }>,
      statuses: [] as Array<{ id: number; characterId: number }>,
    };

    const userRepository = {
      create: vi.fn(async (data: { loginId: string }) => {
        const user = { id: 1, loginId: data.loginId };
        pending.users.push(user);
        return user;
      }),
    };
    const characterRepository = {
      create: vi.fn(async (userId: number) => {
        if (options.failCharacter) {
          throw new Error("character create failed");
        }
        const character = { id: 10, userId };
        pending.characters.push(character);
        return character;
      }),
    };
    const statusRepository = {
      create: vi.fn(async (characterId: number) => {
        if (options.failStatus) {
          throw new Error("status create failed");
        }
        const status = { id: 100, characterId };
        pending.statuses.push(status);
        return status;
      }),
    };

    const result = await operation({
      userRepository,
      characterRepository,
      statusRepository,
    });

    committed.users.push(...pending.users);
    committed.characters.push(...pending.characters);
    committed.statuses.push(...pending.statuses);

    return result;
  };

  mocks.generateRefreshToken.mockImplementation(async () => {
    if (options.failRefreshToken) {
      throw new Error("redis write failed");
    }
    return "refresh-token";
  });

  const usecase = new SignUpUsecase(
    unusedRepository(),
    unusedRepository(),
    unusedRepository(),
    { saveRefreshToken: vi.fn(), getRefreshToken: vi.fn(), deleteRefreshToken: vi.fn() },
    transaction as never
  );

  return { committed, usecase };
}

describe("SignUpUsecase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateAccessToken.mockResolvedValue("access-token");
    mocks.generateRefreshToken.mockResolvedValue("refresh-token");
  });

  it("commits user, character, and status in one transaction", async () => {
    const { committed, usecase } = createTransactionalSignUpUsecase({});

    const result = await usecase.execute(request);

    expect(result).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(committed.users).toEqual([{ id: 1, loginId: "hunter" }]);
    expect(committed.characters).toEqual([{ id: 10, userId: 1 }]);
    expect(committed.statuses).toEqual([{ id: 100, characterId: 10 }]);
  });

  it("rolls back user creation when character creation fails", async () => {
    const { committed, usecase } = createTransactionalSignUpUsecase({
      failCharacter: true,
    });

    await expect(usecase.execute(request)).rejects.toThrow("character create failed");

    expect(committed.users).toEqual([]);
    expect(committed.characters).toEqual([]);
    expect(committed.statuses).toEqual([]);
    expect(mocks.generateAccessToken).not.toHaveBeenCalled();
    expect(mocks.generateRefreshToken).not.toHaveBeenCalled();
  });

  it("rolls back user and character creation when status creation fails", async () => {
    const { committed, usecase } = createTransactionalSignUpUsecase({
      failStatus: true,
    });

    await expect(usecase.execute(request)).rejects.toThrow("status create failed");

    expect(committed.users).toEqual([]);
    expect(committed.characters).toEqual([]);
    expect(committed.statuses).toEqual([]);
    expect(mocks.generateAccessToken).not.toHaveBeenCalled();
    expect(mocks.generateRefreshToken).not.toHaveBeenCalled();
  });

  it("distinguishes refresh token persistence failure after account creation", async () => {
    const { committed, usecase } = createTransactionalSignUpUsecase({
      failRefreshToken: true,
    });

    await expect(usecase.execute(request)).rejects.toBeInstanceOf(SignUpTokenPersistenceError);

    expect(committed.users).toEqual([{ id: 1, loginId: "hunter" }]);
    expect(committed.characters).toEqual([{ id: 10, userId: 1 }]);
    expect(committed.statuses).toEqual([{ id: 100, characterId: 10 }]);
  });
});
