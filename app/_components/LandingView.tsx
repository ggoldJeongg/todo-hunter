"use client";

// 루트(/) 랜딩 — 앱 콘텐츠를 카드로 훑어보고 바로 로그인으로 넘어가는 화면.
//
// 스타일은 앱 전체의 도트 픽셀 언어를 따른다(globals.css 의 two-step-border 계열).
// 랜딩만 모던하게 만들면 로그인 후 픽셀 세계가 나와 기대와 어긋나므로,
// 첫 화면부터 같은 언어를 쓴다. 카카오 버튼만 예외 — 브랜드 가이드가 형태를 규정한다.
//
// 캐러셀은 CSS scroll-snap 으로만 구현했다(라이브러리 0개).
//   - 네이티브 스와이프 관성·접근성이 그대로 살아있고 번들이 늘지 않는다.
//   - 활성 슬라이드 추적만 IntersectionObserver 로 처리한다.

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import KakaoLoginButton from "@/components/common/KakaoLoginButton";

// 자동 넘김 간격. 이 값만 바꾸면 속도가 조정된다.
const AUTOPLAY_INTERVAL_MS = 2000;

// 슬라이드 이미지 표시 폭. 높이는 원본 비율대로 따라간다.
const IMAGE_WIDTH = 200;
// 원본 비율이 0.89~1.32 로 제각각이라, 200px 기준 높이가 152~226px 까지 벌어진다.
// 카드 높이가 슬라이드마다 달라지면 자동 넘김 때 화면이 출렁이므로 박스 높이를 고정한다.
const IMAGE_BOX_HEIGHT = 230;

type Slide = {
  image: string; // public/samples 하위 경로
  badge: string;
  title: string;
  body: string;
};

// TODO: 문구 확정 필요 — 아래는 레이아웃 확인용 플레이스홀더.
// 순서는 사용자가 이해하는 흐름(할 일 등록 → 성장 → 보상 → 결말)을 따랐다.
const SLIDES: Slide[] = [
  {
    image: "/samples/landing_1.png",
    badge: "퀘스트",
    title: "할 일이 퀘스트가 됩니다",
    body: "오늘 해야 할 일을 등록하면 몬스터가 나타나요. 하나씩 처리하며 전투를 끝내보세요.",
  },
  {
    image: "/samples/landing_2.png",
    badge: "캐릭터",
    title: "완료할 때마다 성장해요",
    body: "퀘스트를 끝낼 때마다 경험치가 쌓이고 레벨이 오릅니다. 내 캐릭터가 자라는 게 보여요.",
  },
  {
    image: "/samples/landing_3.png",
    badge: "칭호 도감",
    title: "기록이 칭호로 남습니다",
    body: "꾸준함도, 몰아치기도 전부 기록이에요. 달성한 만큼 칭호를 모아보세요.",
  },
  {
    image: "/samples/landing_4.png",
    badge: "엔딩",
    title: "한 주가 이야기로 끝납니다",
    body: "일주일 동안 쌓인 기록이 하나의 엔딩으로 정리돼요. 일요일에 확인해보세요.",
  },
];

export default function LandingView() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // 자동 넘김이 바라보는 인덱스. active(=IO가 관측한 실제 위치)와 분리해 둔다.
  // 짧은 간격에서는 스크롤이 끝나기 전에 다음 tick 이 와서 IO 갱신이 늦을 수 있는데,
  // 이 ref 를 따로 두면 그런 상황에서도 순번이 밀리거나 멈추지 않는다.
  const autoplayIndexRef = useRef(0);

  const goTo = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    // 슬라이드 폭 = 트랙 폭이라 인덱스 × 폭이 곧 목표 스크롤 위치.
    // offsetLeft 는 offsetParent(레이아웃의 relative 컨테이너) 기준이라 신뢰할 수 없어 쓰지 않는다.
    track.scrollTo({ left: index * track.clientWidth, behavior });
    autoplayIndexRef.current = index;
  }, []);

  // 스크롤 위치로 활성 슬라이드 판정. scroll 이벤트 대신 IO 를 쓰면
  // 스로틀링 없이도 렌더가 슬라이드당 한 번만 일어난다.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const slides = Array.from(track.children) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(slides.indexOf(entry.target as HTMLElement));
          }
        }
      },
      { root: track, threshold: 0.6 }
    );

    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, []);

  // 자동 넘김. 마지막 장 다음은 처음으로 돌아온다.
  // 모션 최소화를 켠 사용자에게는 재생하지 않는다 (WCAG 2.2.2).
  useEffect(() => {
    if (paused) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (motionQuery.matches) return;
      timer = setInterval(() => {
        goTo((autoplayIndexRef.current + 1) % SLIDES.length);
      }, AUTOPLAY_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    // 설정을 도중에 바꾸는 경우까지 따라간다 (초기 1회 평가로 끝내지 않는다).
    const onChange = () => {
      stop();
      start();
    };

    start();
    motionQuery.addEventListener("change", onChange);
    return () => {
      stop();
      motionQuery.removeEventListener("change", onChange);
    };
  }, [paused, goTo]);

  return (
    // 100dvh: 모바일 주소창이 접히고 펴져도 하단 로그인 버튼이 잘리지 않게
    <div className="flex min-h-[100dvh] flex-col bg-paper">
      {/* 캐러셀 — 사용자가 만지는 동안에는 자동 넘김을 멈춰 조작과 싸우지 않게 한다 */}
      <div
        ref={trackRef}
        className="landing-track flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
        role="group"
        aria-roledescription="캐러셀"
        aria-label="투두헌터 주요 기능"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SLIDES.map((slide, index) => (
          <section
            key={slide.badge}
            className="flex w-full shrink-0 snap-center items-center justify-center px-6"
            aria-roledescription="슬라이드"
            aria-label={`${index + 1} / ${SLIDES.length} · ${slide.badge}`}
          >
            {/* two-step-border: 앱 공통 픽셀 테두리 (padding·margin 이 클래스에 포함돼 있다) */}
            <article className="two-step-border w-full max-w-[320px] flex-col bg-white text-center">
              <div
                className="flex items-center justify-center"
                style={{ height: IMAGE_BOX_HEIGHT }}
              >
                <Image
                  src={slide.image}
                  alt=""
                  width={IMAGE_WIDTH}
                  height={IMAGE_BOX_HEIGHT}
                  // 원본이 140~282px 이라 200px 로 확대되는 장이 있다.
                  // pixelated 가 없으면 보간이 걸려 도트가 뿌옇게 뭉개진다.
                  style={{ width: IMAGE_WIDTH, height: "auto", imageRendering: "pixelated" }}
                  // 4장 합쳐 약 107KB 라 지연 로딩보다 한 번에 받는 편이 낫다.
                  // lazy 로 두면 가로로 벗어난 2~4번이 자동 넘김 순간에야 로드돼 빈 칸이 보인다.
                  priority
                  unoptimized
                />
              </div>
              <p className="mt-2 text-xs font-bold tracking-wide text-[#8B7E6A]">
                {slide.badge}
              </p>
              <h2 className="mt-1 font-galmuri11-bold text-xl leading-snug text-ink break-keep">
                {slide.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#5A5148] break-keep">
                {slide.body}
              </p>
            </article>
          </section>
        ))}
      </div>

      {/* 점 인디케이터 — 픽셀 톤에 맞춰 사각형 */}
      <div className="flex justify-center gap-2 pt-6" role="tablist" aria-label="슬라이드 선택">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.badge}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-label={`${index + 1}번째 슬라이드로 이동`}
            onClick={() => goTo(index)}
            className={`h-2.5 w-2.5 transition-colors ${
              active === index ? "bg-ink" : "bg-ink/25"
            }`}
          />
        ))}
      </div>

      {/* TODO: 문구 확정 필요 */}
      <p className="px-6 pt-6 text-center font-galmuri11-bold text-xl leading-snug text-ink break-keep">
        미루던 하루를 모험으로
        <br />
        오늘의 퀘스트를 시작하세요
      </p>

      {/* 로그인 진입 */}
      <div className="flex flex-col items-center gap-2 px-6 pb-10 pt-6">
        <KakaoLoginButton label="카카오로 3초만에 시작하기" />
        {/* 카카오 버튼과 같은 치수·모서리를 쓰되, 색으로 우선순위를 낮춘 보조 버튼 */}
        <Link
          href="/signin"
          className="flex h-12 w-full max-w-[320px] items-center justify-center gap-2 rounded-md bg-[#F7F3EA] text-base font-bold text-ink shadow-[0_2px_0_rgba(0,0,0,0.08)] transition-colors hover:bg-[#FFFDF8] active:bg-[#EFE9DD]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M2.25 6.75A2.25 2.25 0 0 1 4.5 4.5h15a2.25 2.25 0 0 1 2.25 2.25v.243l-9.75 5.42-9.75-5.42V6.75Z" />
            <path d="M21.75 9.257v7.993A2.25 2.25 0 0 1 19.5 19.5h-15a2.25 2.25 0 0 1-2.25-2.25V9.257l9.264 5.148a1.5 1.5 0 0 0 1.472 0l9.264-5.148Z" />
          </svg>
          이메일로 로그인
        </Link>
      </div>

      <style>{`
        /* 스크롤바 숨김 — 캐러셀 트랙에만 적용 */
        .landing-track {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .landing-track::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
