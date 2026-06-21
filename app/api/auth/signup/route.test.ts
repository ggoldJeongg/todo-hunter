import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasSignupVerifiedEmail: vi.fn(),
  deleteSignupVerifiedEmail: vi.fn(),
  signUp: vi.fn(),
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock("@/infrastructure/rate-limiter", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
}));

vi.mock("@/infrastructure/repositories/RdVerificationRepository", () => ({
  RdVerificationRepository: vi.fn().mockImplementation(function () {
    return {
      hasSignupVerifiedEmail: mocks.hasSignupVerifiedEmail,
      deleteSignupVerifiedEmail: mocks.deleteSignupVerifiedEmail,
    };
  }),
}));

vi.mock("@/application/usecases/auth/SignUpUsecase", () => ({
  SignUpTokenPersistenceError: class SignUpTokenPersistenceError extends Error {},
  SignUpUsecase: vi.fn().mockImplementation(function () {
    return {
      execute: mocks.signUp,
    };
  }),
}));

vi.mock("@/infrastructure/repositories", () => ({
  PriCharacterRepository: vi.fn(),
  PriStatusRepository: vi.fn(),
  PriUserRepository: vi.fn(),
}));

vi.mock("@/infrastructure/repositories/RdAuthenticationRepository", () => ({
  RdAuthenticationRepository: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

const signupBody = {
  loginId: "hunter",
  email: "hunter@example.com",
  nickname: "hunt",
  password: "password123",
};

function createSignupRequest(body = signupBody) {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 2,
      retryAfterSeconds: 0,
    });
    mocks.getClientIp.mockReturnValue("127.0.0.1");
    mocks.hasSignupVerifiedEmail.mockResolvedValue(true);
    mocks.deleteSignupVerifiedEmail.mockResolvedValue(undefined);
    mocks.signUp.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("rejects signup when the request email has not completed server-side verification", async () => {
    const { POST } = await import("./route");
    mocks.hasSignupVerifiedEmail.mockResolvedValue(false);

    const response = await POST(createSignupRequest());

    expect(response.status).toBe(403);
    expect(mocks.hasSignupVerifiedEmail).toHaveBeenCalledWith("hunter@example.com");
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.deleteSignupVerifiedEmail).not.toHaveBeenCalled();
  });

  it("rejects signup when the verified email does not match the signup request email", async () => {
    const { POST } = await import("./route");
    mocks.hasSignupVerifiedEmail.mockImplementation(async (email: string) => {
      return email === "verified@example.com";
    });

    const response = await POST(createSignupRequest({
      ...signupBody,
      email: "attacker@example.com",
    }));

    expect(response.status).toBe(403);
    expect(mocks.hasSignupVerifiedEmail).toHaveBeenCalledWith("attacker@example.com");
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("allows signup after verification and consumes the verified state", async () => {
    const { POST } = await import("./route");

    const response = await POST(createSignupRequest());

    expect(response.status).toBe(201);
    expect(mocks.signUp).toHaveBeenCalledWith(signupBody);
    expect(mocks.deleteSignupVerifiedEmail).toHaveBeenCalledWith("hunter@example.com");
  });

  it("returns conflict when signup hits a duplicate email constraint", async () => {
    const { POST } = await import("./route");
    mocks.signUp.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["email"] },
      })
    );

    const response = await POST(createSignupRequest());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("이미 가입된 이메일입니다.");
    expect(mocks.deleteSignupVerifiedEmail).not.toHaveBeenCalled();
  });

  it("returns a plain 500 failure without success cookies when signup fails unexpectedly", async () => {
    const { POST } = await import("./route");
    mocks.signUp.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(createSignupRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal Server Error");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.deleteSignupVerifiedEmail).not.toHaveBeenCalled();
  });
});
