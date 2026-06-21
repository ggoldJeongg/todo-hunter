import { describe, expect, it, vi } from "vitest";
import { submitEmailSignup } from "@/utils/signupSubmit";

const payload = {
  loginId: "hunter",
  email: "hunter@example.com",
  nickname: "hunt",
  password: "password123",
};

describe("submitEmailSignup", () => {
  it("does not run the success UI path when signup API returns 500", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    ) as unknown as typeof fetch;
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    const getErrorMessage = vi.fn((status: number, serverMessage?: string) => {
      return serverMessage ?? `status ${status}`;
    });

    const result = await submitEmailSignup(payload, {
      fetchImpl,
      getErrorMessage,
      onSuccess,
      onFailure,
    });

    expect(result).toEqual({
      ok: false,
      message: "Internal Server Error",
      status: 500,
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledWith("Internal Server Error");
  });

  it("runs the success UI path only after a successful signup response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 201 })) as unknown as typeof fetch;
    const onSuccess = vi.fn();
    const onFailure = vi.fn();

    await expect(
      submitEmailSignup(payload, {
        fetchImpl,
        getErrorMessage: vi.fn(),
        onSuccess,
        onFailure,
      })
    ).resolves.toEqual({ ok: true });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onFailure).not.toHaveBeenCalled();
  });
});
