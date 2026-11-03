# 온라인 랭킹 켜는 법 (15분, 무료)

랭킹 코드는 이미 사이트에 들어 있습니다. **랭킹 서버 주소만 넣으면 켜집니다.**
주소를 넣기 전까지 랭킹 버튼은 자동으로 숨겨지고, 게임은 지금처럼 동작합니다.

랭킹 서버로는 **Supabase**(수파베이스, 무료 데이터베이스 서비스)를 씁니다.
- 무료 요금제: 데이터베이스 500MB. 점수 한 줄이 약 100바이트라 **수백만 건까지 무료**입니다.
- 주의: 무료 프로젝트는 **7일 동안 한 번도 쓰이지 않으면 일시정지**됩니다. 방문자가 꾸준하면 문제없고, 멈추면 Supabase 화면에서 "Restore"를 누르면 다시 켜집니다.

---

## 1단계. Supabase 프로젝트 만들기 (5분)
1. https://supabase.com 접속 → **Start your project** → GitHub 계정으로 로그인
2. **New project** 클릭
   - Name: `neowa-ranking` (아무 이름이나 괜찮음)
   - Database Password: 아무 비밀번호 (메모해 두기. 랭킹에는 안 씀)
   - Region: **Northeast Asia (Seoul)** ← 한국 방문자가 빠름
   - Plan: **Free**
3. **Create new project** → 1~2분 기다리기

## 2단계. 랭킹 표 만들기 (2분)
1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. 저장소의 `docs/ranking/supabase.sql` 파일 내용을 **통째로 복사해서 붙여 넣기**
3. 오른쪽 아래 **Run** → "Success. No rows returned"가 나오면 성공

> 새 게임이 추가될 때마다 이 파일이 자동으로 갱신됩니다(게임별 점수 상한 포함). 그때 같은 방법으로 한 번 더 **Run** 하면 됩니다. 여러 번 실행해도 기존 기록은 지워지지 않습니다.

## 3단계. 주소와 공개 키 복사 (2분)
1. 왼쪽 아래 **Project Settings**(톱니바퀴) → **API** (또는 **Data API**)
2. 두 가지를 복사합니다.
   - **Project URL**: `https://xxxxxxxx.supabase.co` 형태
   - **anon public** 키: `eyJ...`로 시작하는 긴 글자 (또는 `sb_publishable_...`로 시작하는 Publishable key)
3. ⚠️ **service_role / secret 키는 절대 복사하지 마세요.** 이 키가 공개되면 누구나 기록을 지울 수 있습니다.

## 4단계. 사이트에 넣기 (3분)
`assets/arcade/config.js` 파일을 열어 따옴표 안에 붙여 넣습니다.

```js
window.NEOWA_RANK = {
  url: 'https://xxxxxxxx.supabase.co',
  key: 'eyJhbGciOi...'
};
```

GitHub 웹에서 바로 고치는 법:
1. https://github.com/MarsTicket/neowa/blob/main/assets/arcade/config.js 열기
2. 연필 아이콘(Edit) → 위처럼 고치기 → **Commit changes**
3. 2~3분 뒤 사이트에 반영

또는 Claude에게 "랭킹 주소는 ○○, 키는 ○○로 넣어 줘"라고 말하면 대신 넣어 줍니다.

## 5단계. 확인
1. https://neowa.kr 에서 아무 게임이나 한 판 → 종료 화면에 **닉네임 칸과 '랭킹 등록' 버튼**이 보이면 성공
2. 등록 후 https://neowa.kr/ranking/ 에서 내 이름 확인

---

## 운영 팁

**이상한 닉네임·점수 지우기**
Supabase → **Table Editor** → `scores` 표 → 해당 줄 선택 → **Delete**

**점수 조작 방지 장치 (이미 들어 있음)**
- 게임별 점수 상한(`docs/tools/catalog.json`의 `maxScore`)을 넘는 점수는 서버가 거절
- 같은 닉네임으로 20초 안에 다시 등록 금지
- 표를 직접 읽고 쓰는 것은 막고, 정해진 두 함수(`submit_score`, `top_scores`)로만 사용

**한계 (솔직하게)**
웹게임은 점수를 브라우저가 계산하기 때문에, 작정하고 조작하는 사람을 100% 막을 수는 없습니다. 상한 안쪽의 그럴듯한 가짜 점수는 위 방법으로 직접 지워야 합니다. 방문자가 많아지면 "같은 IP 하루 등록 횟수 제한" 같은 장치를 더할 수 있습니다.

**비용이 생기는 시점**
무료 한도(데이터베이스 500MB, 월 데이터 전송 5GB 등)를 넘을 때입니다. 랭킹 목록 한 번 불러오는 양이 매우 작아서, 하루 방문자 수천 명 수준까지는 무료로 충분합니다.
