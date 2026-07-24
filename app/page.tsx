// 루트(/) — 앱 콘텐츠를 카드로 소개하고 로그인으로 연결하는 랜딩.
//
// 쿠키를 읽지 않는 이유:
//   middleware.ts 의 AUTH_REDIRECT_PATHS 에 "/" 가 들어 있어서, 로그인 상태면
//   이 페이지가 렌더되기 전에 /play/character 로 리다이렉트된다.
//   즉 여기 도달하는 건 비로그인 유저뿐이라 분기할 게 없다 → 정적 렌더.
import LandingView from "./_components/LandingView";

export default function Home() {
  return <LandingView />;
}
