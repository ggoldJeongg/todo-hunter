"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#000",
          color: "#fff",
          textAlign: "center",
          fontFamily: "sans-serif",
        }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>500 ERROR</h1>
          <p>예기치 못한 오류가 발생했습니다.</p>
          <button
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.75rem 1.5rem",
              border: "1px solid white",
              background: "transparent",
              color: "white",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
