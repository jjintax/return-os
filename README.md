# Return OS

개인용 자기관리 앱 MVP입니다. 루틴, 공부, 업무, 감정, 실수, 복귀, 브리핑을 한 곳에서 관리합니다.

## 실행 방법

1. `start_app.bat`을 더블클릭합니다.
2. 안 열리면 `index.html`을 Chrome 또는 Edge로 엽니다.
3. 브라우저 주소창에 직접 열 때는 아래 주소를 붙여넣습니다.

```text
file:///C:/Users/User/Documents/Codex/2026-04-23-daglo-daglo-gpt-ai/index.html
```

## 폴더 구조

```text
.
├─ data
│  └─ app-state.json
├─ index.html
├─ manifest.webmanifest
├─ package.json
├─ server.js
├─ start_app.bat
├─ start_web.bat
├─ sw.js
├─ README.md
└─ src
   ├─ app.js
   ├─ icon-192.svg
   ├─ icon-512.svg
   └─ styles.css
```

## 핵심 화면

- 홈: 루틴 달성률, 핵심 3개, 빠른 기록, 복귀 카드/팝업
- 루틴: 습관 체크리스트, 최근 7일 그래프, 연속 성공일
- 공부: 과목별 세션 기록, 시작시간, 집중도, 평가, 주간 요약
- 업무: 5점 집중도, 메모, 태그, 주간 집중도 그래프
- 감정/실수: 감정 5단계, 원인 태그, 실수 횟수/영역/유형/영향도
- 리포트: 주간 그래프, 월간/연간 확장 탭
- 브리핑: 관심 키워드 저장, 더미 추천 카드
- 사람별 보기: 상단 프로필 칩으로 사람 전환, 사람별 데이터 완전 분리

## 라이브러리

현재 MVP는 외부 라이브러리를 사용하지 않습니다.

- 저장: `localStorage`
- 그래프: CSS 기반 미니 바 차트
- 배포/로그인/AI 연동: 없음

## 모바일 / 갤럭시 / 웹서비스 조건

- `start_app.bat`: 가장 간단한 로컬 실행
- `start_web.bat`: 로컬 웹서버 실행
- 갤럭시 설치형 앱처럼 쓰려면 `start_web.bat` 또는 실제 배포 주소에서 열어야 합니다.
- PWA 파일(`manifest.webmanifest`, `sw.js`)을 포함해서 홈 화면 추가가 가능하도록 준비했습니다.
- 실제 인터넷 웹서비스로 쓰려면 GitHub Pages, Netlify, Vercel 같은 정적 호스팅에 그대로 올리면 됩니다.
- `file:///` 방식은 빠른 확인용이고, 서비스워커/설치 기능은 브라우저 정책상 제한될 수 있습니다.

정확히는 지금은 정적 사이트가 아니라 `server.js`가 있는 Node 앱입니다.  
사람별 데이터가 서버 파일에 저장되므로, 영구 배포하려면 **Node 실행 + 쓰기 가능한 디스크**가 있는 호스팅이 필요합니다.

## 사람별 데이터 구조

- `profiles[]`: 사람 목록과 표시 색상
- `activeProfileId`: 현재 보고 있는 사람
- `profileData[id]`: 사람별 루틴, 공부, 업무, 감정, 실수, 브리핑 데이터

이 구조라서 한 기기에서 여러 사람을 써도 기록이 섞이지 않습니다.

## 클라우드 저장 구조

- 서버 API: `GET /api/state`, `PUT /api/state`
- 서버 저장 파일: [data/app-state.json](C:\Users\User\Documents\Codex\2026-04-23-daglo-daglo-gpt-ai\data\app-state.json)
- 프론트는 시작할 때 서버 상태를 불러오고, 변경할 때마다 서버 파일에 다시 저장합니다.
- 서버가 닫히거나 배포 환경에 영속 디스크가 없으면 저장이 유지되지 않습니다.
- 배포 시 `DATA_DIR` 환경변수로 저장 폴더를 따로 지정할 수 있습니다.

## 영구 배포 메모

- 현재 코드는 `package.json`의 `npm start`로 실행됩니다.
- 영구 배포를 하려면 Render, Railway, Fly.io 같은 **Node 서버 + persistent disk**가 있는 호스팅이 적합합니다.
- 내가 지금 이 로컬 환경에서 바로 영구 링크를 발급할 수는 없고, 배포 계정 연결이 필요합니다.

## 확장 지점

`src/app.js` 하단에 주석으로 표시했습니다.

- OpenAI API: 로컬 기록을 일간 코칭 프롬프트로 변환
- Daglo: 전사본 내보내기 파일을 기록에 연결
- YouTube/논문: 브리핑 키워드 기반 추천 및 요약

## 앱 이름 후보

1. Return OS
2. Focus Return
3. Blue Routine
4. ReEntry
5. Momentum Log
