# Investment Google Pipeline

Google Search + AdSense 전용 투자 콘텐츠 파이프라인.

## 원칙
- 기존 Naver 콘텐츠를 복제하지 않는다.
- 기존 발행글과 동일/유사 검색의도를 차단한다.
- 공식 1차 자료와 기준일을 기록한다.
- 직접 계산, 비교, 사례, FAQ 등 원본 가치를 포함한다.
- Quality Gate 9.0/10 미만은 발행하지 않는다.
- 하루 최대 10개이며 수량을 위해 품질을 낮추지 않는다.
- Tistory 발행부는 콘텐츠 엔진과 분리된 adapter로 구현한다.

## Pipeline
TOPIC_RADAR -> DUPLICATE_GUARD -> RESEARCH -> CONTENT_ENGINE -> QUALITY_GATE -> SEO_ENGINE -> PUBLISH_QUEUE -> TISTORY_ADAPTER -> PERFORMANCE_DB

## Modules
- `config/` 정책 및 품질 기준
- `database/` Supabase schema
- `pipeline/` 상태/실행 규칙
- `quality/` 9점 품질 게이트
- `publisher/` 티스토리 발행 어댑터 계약
- `analytics/` 검색 성과 학습
- `admin/` 향후 Vercel 관리 화면

현재 단계에서는 티스토리 비밀번호/세션을 저장소에 저장하지 않는다.
