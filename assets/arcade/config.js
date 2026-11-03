/*
  온라인 랭킹 설정
  - 비워 두면 랭킹 기능이 꺼지고, 게임은 그대로 동작합니다.
  - 켜는 법: docs/RANKING_SETUP.md 참고 (Supabase 무료 프로젝트의 주소와 anon 공개 키를 넣기)
  - anon 키는 공개해도 되는 키입니다. service_role 키는 절대 넣지 마세요.
*/
window.NEOWA_RANK = {
  url: '',   // 예: 'https://abcdefgh.supabase.co'
  key: ''    // 예: 'eyJhbGciOi...' (Project Settings → API → anon public)
};
