# Tistory Publisher Adapter Contract

공식 글쓰기 API에 의존하지 않도록 발행부를 교체 가능한 adapter로 둔다.

## Input
- article_id
- title
- content_html
- category
- tags (optional)
- featured_image (optional)
- scheduled_at (optional)

## Output
Success:
- status=published
- published_url
- published_at

Failure:
- status=failed/held
- error_code
- error_message
- attempts

## Safety / Reliability
- 비밀번호, 카카오 로그인 정보, 쿠키, 세션 토큰을 GitHub에 저장하지 않는다.
- 발행 전 article.status=ready 및 quality_score>=9.0을 서버에서 재검증한다.
- 동일 article_id의 중복 발행을 차단한다.
- 로그인/인증/UI 변화 감지 시 자동 반복 시도 대신 held 처리한다.
- 발행 adapter가 없어도 research/content/quality/queue 단계는 독립적으로 정상 동작해야 한다.

## Current state
Adapter interface only. 실제 티스토리 인증/발행 방식은 별도 검증 후 연결한다.
