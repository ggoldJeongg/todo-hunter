export type ApiErrorCode =
  | "AUTH_EXPIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE"
  | "TIMEOUT"
  | "NETWORK_ERROR";

type ErrorBody = {
  error?: unknown;
  message?: unknown;
};

type RequestOptions = {
  timeoutMs?: number;
  fallbackMessage?: string;
};

const DEFAULT_TIMEOUT_MS = 15000;

const STATUS_MESSAGES: Record<number, string> = {
  401: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
  403: "요청 권한이 없습니다.",
  404: "요청한 정보를 찾을 수 없습니다.",
  409: "이미 처리되었거나 충돌이 발생했습니다.",
  429: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  500: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
};

const STATUS_CODES: Record<number, ApiErrorCode> = {
  401: "AUTH_EXPIRED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
  500: "SERVER_ERROR",
};

export class ApiError extends Error {
  status?: number;
  code: ApiErrorCode;
  retryable: boolean;

  constructor(message: string, code: ApiErrorCode, options: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}

function getServerMessage(body: unknown) {
  if (!body || typeof body !== "object") return null;

  const { error, message } = body as ErrorBody;
  if (typeof error === "string" && error.trim()) return error;
  if (typeof message === "string" && message.trim()) return message;

  return null;
}

function getErrorCode(status: number): ApiErrorCode {
  return STATUS_CODES[status] ?? "HTTP_ERROR";
}

function isRetryable(status: number) {
  return status === 429 || status >= 500;
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text.trim()) return undefined;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError("서버 응답 형식이 올바르지 않습니다.", "INVALID_RESPONSE", {
      status: response.status,
      retryable: response.ok,
    });
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("서버 응답을 해석하지 못했습니다.", "INVALID_RESPONSE", {
      status: response.status,
      retryable: response.ok,
    });
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function requestJson<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: RequestOptions = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
    const body = await readResponseBody(response);

    if (!response.ok) {
      const fallback = options.fallbackMessage ?? STATUS_MESSAGES[response.status] ?? "요청 처리 중 오류가 발생했습니다.";
      throw new ApiError(getServerMessage(body) ?? fallback, getErrorCode(response.status), {
        status: response.status,
        retryable: isRetryable(response.status),
      });
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (isAbortError(error)) {
      throw new ApiError("요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.", "TIMEOUT", {
        retryable: true,
      });
    }

    throw new ApiError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.", "NETWORK_ERROR", {
      retryable: true,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
