"use client";

type Props = {
  page: number;
  pages: number;
  onChange: (next: number) => void;
};

export default function PageNav({ page, pages, onChange }: Props) {
  const atFirst = page <= 0;
  const atLast = page >= pages - 1;

  return (
    <div
      className="font-galmuri11-bold flex justify-between items-center"
      style={{ marginTop: 3, marginBottom: 15, fontSize: 10 }}
    >
      <button
        type="button"
        disabled={atFirst}
        onClick={() => onChange(Math.max(0, page - 1))}
        style={{
          all: "unset",
          cursor: atFirst ? "default" : "pointer",
          color: atFirst ? "#b59a6a" : "#3a2a18",
        }}
      >
        ≪ 이전
      </button>

      <div className="flex" style={{ gap: 3 }}>
        {Array.from({ length: pages }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            style={{ width: 7, height: 7, background: i === page ? "#3a2a18" : "#b59a6a" }}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={atLast}
        onClick={() => onChange(Math.min(pages - 1, page + 1))}
        style={{
          all: "unset",
          cursor: atLast ? "default" : "pointer",
          color: atLast ? "#b59a6a" : "#3a2a18",
        }}
      >
        다음 ≫
      </button>
    </div>
  );
}
