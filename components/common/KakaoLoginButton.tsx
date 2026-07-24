// 카카오 로그인 버튼 — 루트 랜딩(/)과 이메일 로그인(/signin) 양쪽에서 공유.
// 링크일 뿐이라 클라이언트 컴포넌트가 아니다 (상태·핸들러 없음).

interface KakaoLoginButtonProps {
  className?: string;
  label?: string;
}

export default function KakaoLoginButton({
  className = "",
  label = "카카오 로그인",
}: KakaoLoginButtonProps) {
  return (
    <a
      href="/api/auth/kakao"
      aria-label={label}
      className={`w-full max-w-[320px] h-12 flex items-center justify-center gap-2 bg-[#FEE500] text-[#191919] font-bold text-base rounded-md hover:bg-[#FDD800] active:bg-[#F5D000] transition-colors shadow-[0_2px_0_rgba(0,0,0,0.15)] ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
        <path d="M9 0.5C4.029 0.5 0 3.717 0 7.685c0 2.583 1.708 4.851 4.273 6.123-.187.703-.679 2.55-.778 2.946-.121.491.18.484.38.353.156-.103 2.482-1.687 3.484-2.367a11.6 11.6 0 0 0 1.641.116c4.971 0 9-3.217 9-7.171S13.971 0.5 9 0.5z" />
      </svg>
      {label}
    </a>
  );
}
