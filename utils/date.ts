// 시간 경계 유틸. 서버 TZ 가 Asia/Seoul 로 설정된 환경을 가정 (deploy/ecosystem.config.js,
// .github/workflows/deploy.yml 의 TZ=Asia/Seoul). Node 의 Date 는 시스템 TZ 를 따르므로
// setHours(0,0,0,0) 은 한국 시간 0시 가 됨.

export function getTodayStart(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

// 이번 주 월요일 0시. getDay() 는 0(일) ~ 6(토). 월요일 기준 주 시작.
export function getThisWeekStart(now: Date = new Date()): Date {
  const day = now.getDay();
  const offset = day === 0 ? 6 : day - 1; // 일=6일전, 월=0, 화=1, ...
  const monday = new Date(now);
  monday.setDate(now.getDate() - offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
