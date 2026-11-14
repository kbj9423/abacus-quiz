# 주판 덧셈 대결 (abacus-quiz)

주판 세로 덧셈 문제 웹 게임. 정적 사이트(`index.html` + `online.js`)를 GitHub Pages로 공개.
- 원격: https://github.com/kbj9423/abacus-quiz (브랜치 `main`, 공개 저장소 — 무료 계정은 비공개 저장소로 Pages를 열 수 없음)
- 사이트: https://kbj9423.github.io/abacus-quiz/
- 레이아웃(칠판 디자인)과 혼자하기/같이하기 흐름은 `kbj9423/korean-word-chain`에서 가져왔다.
- 난이도(사용자 결정, 2026-11-14, 목적은 보수 연습): 쉬움=한 자리 4줄, 더하는 세 번이 모두 보수(5의 짝/10의 보수/5와 10 섞임), 중간=한 자리 6줄 또는 두 자리 4줄 무작위, 어려움=두 자리 5줄 무작위. 수치는 `index.html`의 `LEVELS`·`makeNums`.
- 혼자하기 5문제, 기록 안 함. 같이하기 한 문제 30초, 3승 먼저. 기록은 같이하기 문제 한 판 단위로 localStorage(`abacus-record`)에 저장.

## 같이하기 (Firebase)
- 프로젝트: `arrowgame-e9ac7` (다른 게임들과 공유). 연결 코드는 `online.js`(같이하기를 누를 때만 불러옴).
- 컬렉션: `abacus-rooms/{네 자리 방 코드}`. 익명 인증, 닉네임에 공용 비속어 필터(`app-config/profanity-words`) 적용.
- 보안 규칙은 콘솔에서 직접 수정한다. `firestore.rules`는 참고용 사본이다. 다른 게임 규칙이 바뀌었을 수 있으니, 수정할 때는 사용자에게 콘솔의 현재 규칙을 받아 그 위에 고친다.
- 방 문서의 `expireAt`은 만든 지 1시간 뒤. 무료 요금제라 TTL 대신 방을 만들 때 지난 방을 몇 개씩 지운다.

## 멀티 PC 작업 규칙
- 집/사무실 PC를 번갈아 작업한다. 코드 수정 전 `git fetch` → `git log HEAD..origin/main --oneline`으로 뒤처졌는지 확인하고, 뒤처졌으면 먼저 `git pull`.
- 커밋 안 된 로컬 변경이 있는 상태에서 pull이 필요하면 사용자에게 먼저 알린다.
- 작업이 끝나면 add → commit → push까지 마친다. 다음 세션이 이어받을 일이 있으면 아래 `## 인계사항 (다음 PC 확인용)` 섹션에 적는다.

## 인계사항 (다음 PC 확인용)
- 휴대폰에서 문제·키패드가 잘리면 화면 배치를 다시 조정하기로 함(사용자 확인 대기).
