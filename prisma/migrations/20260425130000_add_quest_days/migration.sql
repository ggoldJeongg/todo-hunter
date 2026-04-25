-- Quest에 반복 요일 컬럼 추가.
-- 주간 퀘스트(isWeekly=true)는 ["월","수","금"]처럼 한국어 요일 문자열 배열을 저장한다.
-- 일간 퀘스트는 빈 배열({}).
ALTER TABLE "Quest" ADD COLUMN "days" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
