# Running Course MVP

현재 위치 기반으로 목표 거리 러닝 코스를 추천해 주는 Next.js MVP입니다.

## 시작하기

1. 의존성 설치
   - `npm install`
2. 환경변수 설정
   - `.env.example`를 참고해 `.env.local` 생성
   - 최소 `NEXT_PUBLIC_KAKAO_JS_KEY` 설정
3. 개발 서버 실행
   - `npm run dev`

## 주요 기능

- 현재 위치 권한 요청 및 지도 표시
- 목표 거리(프리셋/직접 입력) 기반 코스 후보 생성
- 왕복형/루프형 코스 2~3개 추천 및 비교 카드 제공
- 코스별 예상 거리/시간/회전 수 제공
# run-course
