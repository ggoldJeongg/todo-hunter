import { describe, expect, it, vi } from "vitest";
import { ApiError, requestJson } from "@/utils/apiClient";

const response = (body: string, status = 200, contentType = "application/json") =>
  new Response(body, {
    status,
    headers: { "Content-Type": contentType },
  });

describe("requestJson", () => {
  it("uses a server error message when one is provided", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      response(JSON.stringify({ error: "로그인이 필요합니다." }), 401)
    ));

    await expect(requestJson("/api/test")).rejects.toMatchObject({
      message: "로그인이 필요합니다.",
      status: 401,
      code: "AUTH_EXPIRED",
      retryable: false,
    });
  });

  it("falls back to consistent status messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      response(JSON.stringify({}), 429)
    ));

    await expect(requestJson("/api/test")).rejects.toMatchObject({
      message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      status: 429,
      code: "RATE_LIMITED",
      retryable: true,
    });
  });

  it("handles empty successful responses safely", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response("")));

    await expect(requestJson("/api/test")).resolves.toBeUndefined();
  });

  it("rejects html responses without leaking markup", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      response("<html>server error</html>", 500, "text/html")
    ));

    await expect(requestJson("/api/test")).rejects.toMatchObject({
      message: "서버 응답 형식이 올바르지 않습니다.",
      status: 500,
      code: "INVALID_RESPONSE",
    });
  });

  it("distinguishes network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")));

    await expect(requestJson("/api/test")).rejects.toMatchObject({
      message: "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      code: "NETWORK_ERROR",
      retryable: true,
    });
  });

  it("throws ApiError instances", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(JSON.stringify({}), 403)));

    await expect(requestJson("/api/test")).rejects.toBeInstanceOf(ApiError);
  });
});
