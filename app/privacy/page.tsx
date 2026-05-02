"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div
      className="flex flex-col min-h-screen overflow-hidden"
      style={{
        backgroundImage: "url('/images/backgrounds/bg_01.png')",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex items-center px-4 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="text-white text-2xl cursor-pointer"
          aria-label="뒤로가기"
        >
          ←
        </button>
        <h1 className="flex-1 text-center text-xl font-galmuri11-bold text-white mr-6">
          개인정보 처리방침
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-10">
        <article className="mx-auto max-w-[640px] bg-[#fffdf2] border-[3px] border-[#4A3F2F] p-6 text-[13px] leading-7 text-[#4A3F2F] shadow-[4px_4px_0_#c9b178]">
          <p className="mb-4 text-[12px] text-[#6e5a37]">
            시행일: 2026년 5월 2일
          </p>

          <p className="mb-4">
            TODO HUNTER(이하 &quot;서비스&quot;)는 「개인정보 보호법」 및 관련
            법령을 준수하며, 정보주체의 개인정보 및 권익을 보호하기 위해 다음과
            같은 처리방침을 두고 있습니다.
          </p>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">1. 개인정보의 처리 목적</h2>
          <p className="mb-2">서비스는 다음의 목적을 위해 개인정보를 처리합니다.</p>
          <ul className="list-disc list-inside mb-4 ml-1 space-y-0.5">
            <li>회원 식별 및 본인 확인</li>
            <li>서비스 제공 및 운영, 콘텐츠 개인화</li>
            <li>회원 가입 의사의 확인 및 부정 이용 방지</li>
            <li>고객 문의 응대 및 공지사항 전달</li>
            <li>서비스 개선을 위한 통계 분석</li>
          </ul>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">2. 처리하는 개인정보 항목</h2>
          <p className="mb-1 font-bold">가. 필수 수집 항목</p>
          <ul className="list-disc list-inside mb-3 ml-1 space-y-0.5">
            <li>이메일 가입: 로그인 아이디, 이메일, 비밀번호(암호화 저장), 닉네임</li>
            <li>카카오 소셜 로그인: 카카오 회원번호(provider ID), 이메일, 닉네임</li>
          </ul>
          <p className="mb-1 font-bold">나. 자동 수집 항목</p>
          <ul className="list-disc list-inside mb-4 ml-1 space-y-0.5">
            <li>접속 IP 주소(이용 제한 및 부정 이용 방지 목적)</li>
            <li>인증 쿠키(Access Token, Refresh Token)</li>
            <li>서비스 이용 기록(퀘스트 생성/완료, 로그인 기록 등)</li>
            <li>오류 로그(서비스 안정성 모니터링)</li>
          </ul>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">3. 개인정보의 보유 및 이용 기간</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>회원의 개인정보는 회원 탈퇴 시까지 보유합니다.</li>
            <li>회원 탈퇴 시 모든 개인정보는 지체 없이 파기됩니다. 단, 관련 법령에서 보존 의무를 부과하는 경우 해당 기간 동안 별도로 보관합니다.</li>
            <li>1년 이상 서비스 이용 기록이 없는 휴면 계정은 별도 통지 후 분리 보관 또는 삭제할 수 있습니다.</li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">4. 개인정보의 제3자 제공</h2>
          <p className="mb-4">
            서비스는 정보주체의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
            법령에 의한 경우 또는 수사기관의 적법한 요청이 있는 경우에 한하여
            제공할 수 있습니다.
          </p>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">5. 개인정보 처리위탁</h2>
          <p className="mb-2">서비스는 원활한 운영을 위하여 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
          <div className="mb-4 border border-[#6e5a37] text-[12px]">
            <table className="w-full">
              <thead className="bg-[#e8d49b]">
                <tr>
                  <th className="border border-[#6e5a37] p-2 text-left">수탁자</th>
                  <th className="border border-[#6e5a37] p-2 text-left">위탁 업무</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-[#6e5a37] p-2">Kakao Corp.</td>
                  <td className="border border-[#6e5a37] p-2">소셜 로그인 인증</td>
                </tr>
                <tr>
                  <td className="border border-[#6e5a37] p-2">Upstash, Inc.</td>
                  <td className="border border-[#6e5a37] p-2">인증 토큰 캐시 저장 (Redis)</td>
                </tr>
                <tr>
                  <td className="border border-[#6e5a37] p-2">Cloudflare, Inc.</td>
                  <td className="border border-[#6e5a37] p-2">정적 파일 저장 및 네트워크 라우팅 (R2 / Tunnel)</td>
                </tr>
                <tr>
                  <td className="border border-[#6e5a37] p-2">Functional Software, Inc. (Sentry)</td>
                  <td className="border border-[#6e5a37] p-2">오류 모니터링 및 성능 추적</td>
                </tr>
                <tr>
                  <td className="border border-[#6e5a37] p-2">[__SMTP_제공자__]</td>
                  <td className="border border-[#6e5a37] p-2">회원가입 인증 메일 발송</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">6. 개인정보의 국외 이전</h2>
          <p className="mb-2">
            위 처리위탁 업체 중 일부는 해외 사업자이며, 정보주체의 개인정보는
            해당 사업자의 서버가 위치한 국외에 저장·처리될 수 있습니다.
          </p>
          <ul className="list-disc list-inside mb-4 ml-1 space-y-0.5 text-[12px]">
            <li>이전 국가: 미국 등 (수탁자 인프라 위치에 따름)</li>
            <li>이전 항목: 위 &quot;처리하는 개인정보 항목&quot;과 동일</li>
            <li>이전 시점 및 방법: 서비스 이용 시점에 네트워크를 통해 이전</li>
            <li>보유 및 이용 기간: 위탁 계약 종료 시 또는 회원 탈퇴 시까지</li>
          </ul>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">7. 정보주체의 권리</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>정보주체는 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다.</li>
            <li>회원 탈퇴를 통해 개인정보 삭제를 직접 요청할 수 있습니다.</li>
            <li>위 권리 행사는 아래 개인정보 보호책임자에게 이메일 등으로 연락하여 신청할 수 있으며, 서비스는 지체 없이 조치합니다.</li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">8. 개인정보의 파기</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다.</li>
            <li>전자적 파일은 복구 불가능한 방법으로 영구 삭제하며, 종이 문서는 분쇄 또는 소각합니다.</li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">9. 개인정보의 안전성 확보 조치</h2>
          <ul className="list-disc list-inside mb-4 ml-1 space-y-0.5">
            <li>비밀번호의 일방향 암호화 저장(bcrypt)</li>
            <li>인증 토큰의 HttpOnly 쿠키 저장 및 HTTPS 통신</li>
            <li>접근 제어 및 권한 관리(API 라우트 보호)</li>
            <li>비정상 접근 차단을 위한 Rate Limiting 적용</li>
            <li>접속 기록의 보관 및 위변조 방지</li>
          </ul>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">10. 쿠키의 사용</h2>
          <p className="mb-4">
            서비스는 회원 인증 상태 유지를 위해 HttpOnly 쿠키(Access Token,
            Refresh Token)를 사용합니다. 회원은 브라우저 설정을 통해 쿠키 저장을
            거부할 수 있으나, 이 경우 서비스의 이용이 제한될 수 있습니다.
          </p>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">11. 개인정보 보호책임자</h2>
          <div className="mb-4 border border-[#6e5a37] p-3 bg-[#f5e9c8] text-[12px]">
            <p>성명: <span className="font-bold">박금정</span></p>
            <p>직책: 개인정보 보호책임자</p>
            <p>이메일: <span className="font-bold">yjjuc4109@gmail.com</span></p>
          </div>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">12. 권익침해 구제 방법</h2>
          <p className="mb-2">개인정보 침해 신고 및 상담은 아래 기관에 문의하실 수 있습니다.</p>
          <ul className="list-disc list-inside mb-4 ml-1 space-y-0.5 text-[12px]">
            <li>개인정보분쟁조정위원회 (privacy.go.kr / 1833-6972)</li>
            <li>개인정보침해신고센터 (privacy.kisa.or.kr / 118)</li>
            <li>대검찰청 사이버수사과 (spo.go.kr / 1301)</li>
            <li>경찰청 사이버수사국 (ecrm.cyber.go.kr / 182)</li>
          </ul>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">13. 처리방침의 변경</h2>
          <p className="mb-4">
            본 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경사항이
            있을 경우 시행 7일 전부터 서비스 내 공지를 통해 사전 안내합니다.
          </p>

          <p className="mt-6 text-[12px] text-[#6e5a37]">
            본 처리방침은 2026년 5월 2일부터 시행됩니다.
          </p>
        </article>
      </div>
    </div>
  );
}
