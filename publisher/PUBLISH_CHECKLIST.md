# Pre-publish checklist

발행기는 아래를 모두 통과해야 publish 가능하다.

1. Quality Gate >= 9.0/10
2. 기존 발행글과 primary keyword + search intent 중복 없음
3. 최신성이 필요한 사실/법률/금융 수치의 출처 및 확인일 존재
4. 제목이 본문 근거보다 강하게 단정하지 않음
5. 직접 계산/비교/사례/실무 체크 중 실질적 원본가치 포함
6. 티스토리의 실제 카테고리 ID/name 매핑 성공
7. 대표 카테고리 1개만 선택
8. 카테고리 불명확/미존재 시 자동발행 금지하고 held 처리
9. 같은 article_id 중복 발행 금지
10. 발행 성공 URL을 DB에 저장한 뒤에만 published 처리

## Tistory limitation
티스토리는 공식 Open API 글쓰기 기능이 종료된 상태이므로, 실제 게시 adapter는 공식 API 호출로 가장하지 않는다. 로그인/에디터 방식의 자동화가 연결되기 전에는 queue까지만 진행한다.
