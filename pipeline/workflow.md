# Workflow v1

1. TOPIC_RADAR
   - 서로 다른 검색의도 후보를 수집한다.
   - 금융/경매공매/부동산/토지/개발/시행/건설/기업자산을 균형 있게 탐색하되 약한 주제로 수량을 채우지 않는다.

2. DUPLICATE_GUARD
   - title 일치가 아니라 search_intent + primary_keyword + intent_fingerprint를 기준으로 차단한다.
   - 기존 Naver 글의 단순 복제/재작성도 금지한다.

3. RESEARCH
   - 시의성/법률/금융 주장은 최신 공식 1차 자료 우선.
   - source URL, 기관, 확인일, 적용 기준일을 snapshot에 저장한다.

4. CONTENT_ENGINE
   - 문제/검색질문을 초반에 해결한다.
   - 직접 계산, 비교, 실무 예시 중 최소 하나 이상의 실질적 원본 가치를 요구한다.
   - 필요한 경우 FAQ와 내부링크 후보를 만든다.

5. QUALITY_GATE
   - config/quality-gate.json 10개 항목 평가.
   - 9.0 미만 또는 hard_fail 하나라도 발생하면 rejected.
   - 수량 부족을 이유로 threshold를 낮추지 않는다.

6. SEO_ENGINE
   - 자연스러운 title/H1/H2/meta description/ALT.
   - keyword stuffing 금지.
   - 같은 검색의도를 여러 URL로 분할하지 않는다.

7. PUBLISH_QUEUE
   - ready만 queue에 삽입한다.
   - 최대 10/day.
   - idempotency: published_url 또는 article_id가 이미 성공이면 재발행 금지.

8. TISTORY_ADAPTER
   - 별도 adapter. 콘텐츠 엔진은 티스토리 인증 방식과 독립적이어야 한다.
   - 인증정보/세션/비밀번호는 GitHub에 커밋하지 않는다.
   - 실패 시 재시도 횟수와 오류를 기록한다.

9. PERFORMANCE
   - 노출, 클릭, CTR, 평균순위를 일별 저장한다.
   - 성과는 다음 TOPIC_RADAR 우선순위에 반영하되 검색순위 조작용 대량생성은 하지 않는다.
