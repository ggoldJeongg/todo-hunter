-- Quest 스키마 정렬: end_date(NOT NULL) → expired_at(nullable) 로 전환 + difficulty 컬럼 추가
-- (실서비스 DB는 이미 이 상태이지만 migration history에 누락되어 있어 shadow DB 생성 시 실패하던 문제 해결)
-- 모든 statement는 idempotent — shadow DB(end_date 존재)와 실DB(이미 정렬됨) 양쪽에서 안전.

-- end_date 컬럼이 남아있으면 제거 (shadow DB의 init migration 후 상태)
ALTER TABLE "Quest" DROP COLUMN IF EXISTS "end_date";

-- expired_at 컬럼이 없으면 추가 (실DB는 이미 있으므로 no-op)
ALTER TABLE "Quest" ADD COLUMN IF NOT EXISTS "expired_at" TIMESTAMP(3);

-- difficulty 컬럼이 없으면 추가 (실DB는 이미 있으므로 no-op)
ALTER TABLE "Quest" ADD COLUMN IF NOT EXISTS "difficulty" TEXT NOT NULL DEFAULT 'normal';
