"use client";

import { useRouter } from "next/navigation";

export default function TermsPage() {
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
          이용약관
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-10">
        <article className="mx-auto max-w-[640px] bg-[#fffdf2] border-[3px] border-[#4A3F2F] p-6 text-[13px] leading-7 text-[#4A3F2F] shadow-[4px_4px_0_#c9b178]">
          <p className="mb-4 text-[12px] text-[#6e5a37]">
            시행일: 2026년 5월 2일
          </p>

          <h2 className="mt-2 mb-2 text-[15px] font-bold">제1조 (목적)</h2>
          <p className="mb-4">
            본 약관은 TODO HUNTER(이하 &quot;서비스&quot;)가 제공하는 게이미피케이션
            기반 할 일 관리 서비스의 이용과 관련하여 서비스 운영자(이하
            &quot;운영자&quot;)와 회원 간의 권리, 의무 및 책임사항, 기타 필요한
            사항을 규정함을 목적으로 합니다.
          </p>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">제2조 (정의)</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>&quot;서비스&quot;란 운영자가 제공하는 TODO HUNTER 웹/모바일 애플리케이션 일체를 말합니다.</li>
            <li>&quot;회원&quot;이란 본 약관에 동의하고 서비스에 가입하여 이용하는 자를 말합니다.</li>
            <li>&quot;계정&quot;이란 회원의 식별과 서비스 이용을 위해 부여되는 로그인 아이디 또는 소셜 로그인 식별자를 말합니다.</li>
            <li>&quot;인게임 자산&quot;이란 회원이 서비스 내에서 획득하는 경험치, 레벨, 칭호, 캐릭터 등 모든 가상 자산을 말합니다.</li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">제3조 (약관의 효력 및 변경)</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>본 약관은 회원이 동의함과 동시에 효력이 발생합니다.</li>
            <li>운영자는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 변경 사항은 서비스 내 공지 또는 이메일 등의 방법으로 사전 공지합니다.</li>
            <li>회원이 변경된 약관에 동의하지 않는 경우 회원 탈퇴를 통해 이용계약을 해지할 수 있습니다.</li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">제4조 (회원가입)</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>회원가입은 본 약관 및 개인정보 처리방침에 동의한 후 이용신청을 함으로써 성립합니다.</li>
            <li>만 14세 미만의 아동은 본 서비스에 가입할 수 없습니다.</li>
            <li>운영자는 다음 각 호에 해당하는 경우 가입 신청을 거절하거나 사후 해지할 수 있습니다.
              <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                <li>타인의 명의 또는 정보를 도용한 경우</li>
                <li>허위 정보를 기재한 경우</li>
                <li>관련 법령 또는 본 약관을 위반한 경우</li>
              </ul>
            </li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">제5조 (계정 관리)</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>회원은 자신의 계정과 비밀번호를 직접 관리할 책임이 있으며, 이를 제3자에게 양도하거나 공유할 수 없습니다.</li>
            <li>계정의 도용 또는 부정 사용이 의심되는 경우 즉시 운영자에게 통지해야 합니다.</li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">제6조 (서비스의 제공 및 변경)</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>서비스는 연중무휴, 1일 24시간 제공을 원칙으로 합니다. 단, 시스템 점검·교체·고장, 통신 두절 등 부득이한 사유가 있는 경우 일시 중단될 수 있습니다.</li>
            <li>운영자는 서비스의 일부 또는 전체를 운영상 또는 기술상의 필요에 따라 변경할 수 있으며, 변경 시 사전 공지합니다.</li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">제7조 (인게임 자산)</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>인게임 자산은 서비스 내 이용에 한하며, 현금 또는 그에 준하는 가치로 환전 또는 환불되지 않습니다.</li>
            <li>회원의 계정 탈퇴, 서비스 종료, 약관 위반에 따른 이용 제한 등의 경우 인게임 자산은 소멸되며 보상되지 않습니다.</li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">제8조 (회원의 의무)</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>회원은 다음 행위를 하여서는 안 됩니다.
              <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                <li>타인의 정보 도용</li>
                <li>서비스의 정상적인 운영을 방해하는 행위</li>
                <li>비정상적인 방법(매크로, 자동화 도구 등)으로 서비스를 이용하는 행위</li>
                <li>관련 법령에 위반되는 행위</li>
              </ul>
            </li>
            <li>회원이 본 조를 위반하는 경우 운영자는 사전 통지 없이 이용을 제한하거나 계정을 해지할 수 있습니다.</li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">제9조 (계약 해지 및 이용 제한)</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>회원은 언제든지 서비스 내 회원 탈퇴 기능을 통해 이용계약을 해지할 수 있습니다.</li>
            <li>탈퇴 시 본인의 모든 데이터(퀘스트, 캐릭터, 인게임 자산 등)는 삭제되며 복구되지 않습니다.</li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">제10조 (면책)</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>운영자는 천재지변, 전쟁, 통신 두절, 해킹 등 운영자의 합리적인 통제를 벗어난 사유로 인한 서비스 중단에 대하여 책임지지 않습니다.</li>
            <li>운영자는 회원이 서비스를 통해 얻은 정보 또는 자료의 정확성·완전성에 대하여 보증하지 않습니다.</li>
            <li>회원 간 또는 회원과 제3자 사이에 발생한 분쟁에 대하여 운영자는 개입할 의무가 없으며, 그로 인한 손해를 배상할 책임이 없습니다.</li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">제11조 (분쟁 해결 및 재판 관할)</h2>
          <ol className="list-decimal list-inside mb-4 space-y-1">
            <li>본 약관 및 서비스 이용과 관련하여 발생한 분쟁은 대한민국 법령에 따라 해결합니다.</li>
            <li>관할 법원은 민사소송법 등 관련 법령에서 정한 법원으로 합니다.</li>
          </ol>

          <h2 className="mt-4 mb-2 text-[15px] font-bold">제12조 (문의)</h2>
          <p className="mb-4">
            서비스 이용 관련 문의는 다음 연락처로 가능합니다.<br />
            이메일: <span className="font-bold">yjjuc4109@gmail.com</span>
          </p>

          <p className="mt-6 text-[12px] text-[#6e5a37]">
            본 약관은 2026년 5월 2일부터 시행됩니다.
          </p>
        </article>
      </div>
    </div>
  );
}
