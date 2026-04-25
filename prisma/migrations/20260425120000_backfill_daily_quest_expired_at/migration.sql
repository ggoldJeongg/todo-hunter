-- 일간 퀘스트(일회성 할일) 중 SuccessDay 가 1개 이상이고 expiredAt 이 비어있는 행을 만료 처리한다.
-- 신규 동작(CompleteQuestUsecase)에서는 일간 퀘스트 완료 시 expiredAt = 다음 날 0시 로 자동 세팅되지만,
-- 마이그레이션 이전에 이미 완료된 기존 데이터는 그대로 두면 자정 이후에도 UI에 다시 노출되는 버그가 남는다.
-- 안전을 위해 가장 최근 SuccessDay 의 다음 날(00:00 UTC)로 expiredAt 을 백필한다.
-- (어차피 모두 과거 시각이므로 fetchQuests 의 expiredAt > now 필터에서 자연스럽게 제외된다.)
UPDATE "Quest" q
SET "expired_at" = (date_trunc('day', s.last_success) + INTERVAL '1 day')
FROM (
    SELECT "quest_id", MAX("created_at") AS last_success
    FROM "SuccessDay"
    GROUP BY "quest_id"
) s
WHERE q."id" = s."quest_id"
  AND q."is_weekly" = false
  AND q."expired_at" IS NULL;
