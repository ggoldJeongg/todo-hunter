import { NextRequest, NextResponse } from "next/server";

// Open-Meteo (api key 필요 없음, CORS OK)
//   docs: https://open-meteo.com/en/docs
//   WMO weather code: https://open-meteo.com/en/docs#weathervariables

// 기본 좌표 — 서울. ?lat=&lng= 쿼리로 override 가능.
const DEFAULT_LAT = 37.5665;
const DEFAULT_LNG = 126.978;

interface WeatherInfo {
  label: string;
  emoji: string;
  /** 캐릭터 페이지 mini-card-sub 표시용 메시지 */
  buff: string;
  /**
   * mood 보정값 (-5 ~ +5) — 컨디션/스트레스 derived 값에만 영향
   *   컨디션 += moodEffect
   *   스트레스 -= moodEffect  (반대 방향)
   * 스탯에는 영향 없음.
   */
  moodEffect: number;
}

// WMO weather code → 게임 효과 매핑
function decodeWeather(code: number): WeatherInfo {
  // 0
  if (code === 0) {
    return {
      label: "맑음",
      emoji: "☀️",
      buff: "기분이 좋아져요!\n컨디션 +5 · 스트레스 -5",
      moodEffect: 5,
    };
  }
  // 1, 2, 3 (mostly clear / partly cloudy / overcast)
  if (code <= 3) {
    return {
      label: "구름",
      emoji: "⛅",
      buff: "차분한 날이에요.",
      moodEffect: 0,
    };
  }
  // 45, 48 (fog)
  if (code === 45 || code === 48) {
    return {
      label: "안개",
      emoji: "🌫️",
      buff: "시야가 흐려요.\n컨디션 -2 · 스트레스 +2",
      moodEffect: -2,
    };
  }
  // 51-67 (drizzle/rain)
  if (code >= 51 && code <= 67) {
    return {
      label: "비",
      emoji: "🌧️",
      buff: "우중충해요.\n컨디션 -3 · 스트레스 +3",
      moodEffect: -3,
    };
  }
  // 71-77 (snow)
  if (code >= 71 && code <= 77) {
    return {
      label: "눈",
      emoji: "❄️",
      buff: "포근해요.\n컨디션 +3 · 스트레스 -3",
      moodEffect: 3,
    };
  }
  // 80-82 (rain showers)
  if (code >= 80 && code <= 82) {
    return {
      label: "소나기",
      emoji: "🌦️",
      buff: "잠깐 쏟아져요.\n컨디션 -1 · 스트레스 +1",
      moodEffect: -1,
    };
  }
  // 85-86 (snow showers)
  if (code >= 85 && code <= 86) {
    return {
      label: "눈발",
      emoji: "🌨️",
      buff: "컨디션 +2 · 스트레스 -2",
      moodEffect: 2,
    };
  }
  // 95-99 (thunderstorm)
  if (code >= 95) {
    return {
      label: "뇌우",
      emoji: "⛈️",
      buff: "위험해요!\n컨디션 -5 · 스트레스 +5",
      moodEffect: -5,
    };
  }
  return {
    label: "정보 없음",
    emoji: "🌥️",
    buff: "",
    moodEffect: 0,
  };
}

// Next.js — 1 hour 캐싱
export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat") ?? DEFAULT_LAT);
  const lng = Number(url.searchParams.get("lng") ?? DEFAULT_LNG);

  try {
    const apiUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code` +
      `&timezone=Asia%2FSeoul`;

    const res = await fetch(apiUrl, {
      // Next 15: 서버 fetch 캐싱 — 1시간
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      throw new Error(`Open-Meteo ${res.status}`);
    }

    const data = await res.json();
    const code: number = data?.current?.weather_code ?? -1;
    const temp: number = data?.current?.temperature_2m ?? 0;
    const info = decodeWeather(code);

    return NextResponse.json({
      ok: true,
      temp: Math.round(temp),
      code,
      ...info,
    });
  } catch (err) {
    console.error("[/api/weather] failed:", err);
    // fallback — 맑음 (게임 진행 막지 않게)
    return NextResponse.json({
      ok: false,
      temp: null,
      code: -1,
      label: "맑음",
      emoji: "☀️",
      buff: "기분이 좋아져요!\n컨디션 +5 · 스트레스 -5",
      moodEffect: 5,
    });
  }
}
