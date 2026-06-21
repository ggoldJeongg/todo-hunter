export type EmailSignupPayload = {
  loginId: string;
  email: string;
  nickname: string;
  password: string;
};

export type EmailSignupSubmitResult =
  | { ok: true }
  | { ok: false; message: string; status?: number };

type SignupSubmitOptions = {
  fetchImpl?: typeof fetch;
  getErrorMessage: (status: number, serverMessage?: string) => string;
  onSuccess: () => void | Promise<void>;
  onFailure: (message: string) => void | Promise<void>;
  onNetworkError?: (error: unknown) => void;
};

const NETWORK_SIGNUP_ERROR_MESSAGE =
  "?ㅽ듃?뚰겕 ?ㅻ쪟濡??뚯썝媛?낆뿉 ?ㅽ뙣?덉뒿?덈떎. ?곌껐 ?곹깭瑜??뺤씤?????ㅼ떆 ?쒕룄??二쇱꽭??";

export async function submitEmailSignup(
  payload: EmailSignupPayload,
  {
    fetchImpl = fetch,
    getErrorMessage,
    onSuccess,
    onFailure,
    onNetworkError,
  }: SignupSubmitOptions
): Promise<EmailSignupSubmitResult> {
  try {
    const response = await fetchImpl("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message = getErrorMessage(response.status, data?.error);
      await onFailure(message);
      return { ok: false, message, status: response.status };
    }

    await onSuccess();
    return { ok: true };
  } catch (error) {
    onNetworkError?.(error);
    await onFailure(NETWORK_SIGNUP_ERROR_MESSAGE);
    return { ok: false, message: NETWORK_SIGNUP_ERROR_MESSAGE };
  }
}
