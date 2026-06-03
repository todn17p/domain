# Atelier Hall

작업물을 미술관에 전시된 작품처럼 보여주는 Next.js 포트폴리오 갤러리 MVP입니다.

## 포함 기능

- 아이디/패스워드 회원가입, 로그인, 로그아웃
- Supabase 환경변수가 없을 때 `.data/local-db.json`에 저장하는 로컬 개발 모드
- Supabase 환경변수가 있을 때 Supabase Auth 사용
- 로그인 후 내 미술관 자동 생성 및 고유 코드 발급
- 테마관 생성/삭제
- 이미지/영상 작품 등록/삭제
- 로컬 개발 모드 파일 업로드 또는 Supabase Storage 업로드
- 미술관 코드로 방문객 입장
- 방문객 전용 조회 화면
- 관리자 로그인 후 계정 삭제
- 실제 미술관 이미지를 참조한 아이보리/골드 갤러리 UI
- 테마관과 작품을 좌우 스크롤로 빠르게 감상하는 전시 벽

## 설치

```bash
npm install
```

## 환경변수

환경변수를 설정하지 않아도 로컬 개발 모드로 실행됩니다. 이때 아이디,
패스워드, 미술관 데이터는 `.data/local-db.json`에 저장되고 업로드 파일은
`public/uploads`에 저장됩니다.

Supabase를 연결하려면 프로젝트 루트에 `.env.local`을 만듭니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

ADMIN_ID=admin
ADMIN_PASSWORD=1234
```

`SUPABASE_SERVICE_ROLE_KEY`는 관리자 계정 삭제 기능에만 필요합니다. 브라우저에 노출되면 안 되므로 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.

## Supabase 설정

1. Supabase 프로젝트를 생성합니다.
2. Supabase Dashboard에서 SQL Editor를 엽니다.
3. [`supabase/schema.sql`](./supabase/schema.sql)의 전체 SQL을 실행합니다.
4. Authentication의 Email provider를 켭니다.
5. 개발 편의를 위해 이메일 확인을 끄려면 Authentication 설정에서 Confirm email 옵션을 비활성화합니다.

SQL은 다음을 만듭니다.

- `profiles`
- `galleries`
- `theme_rooms`
- `artworks`
- `artwork-media` Storage bucket
- 소유자만 생성/수정/삭제할 수 있고 방문객은 조회만 가능한 RLS 정책

## 로컬 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 관리자 기능

관리자 페이지는 `/admin`입니다.

- 기본 아이디: `admin`
- 기본 패스워드: `1234`
- 로그인 화면 placeholder: `enter your id`, `enter your password`

관리자 로그인 후 사용자 목록을 볼 수 있고 계정을 삭제할 수 있습니다.
로컬 개발 모드에서는 `.data/local-db.json`의 계정을 삭제합니다.
Supabase 모드에서 실제 삭제를 하려면 `SUPABASE_SERVICE_ROLE_KEY`가 필요합니다.

## 주요 경로

- `/` 랜딩 및 미술관 코드 입력
- `/signup` 회원가입
- `/login` 로그인
- `/dashboard` 내 미술관 대시보드
- `/dashboard/rooms/[id]` 테마관 관리
- `/dashboard/artworks/new?room=[id]` 작품 등록
- `/visit/[code]` 방문객용 미술관
- `/admin` 관리자 로그인 및 계정 삭제

## 업로드 제한

SQL에서 `artwork-media` 버킷 파일 제한을 100MB로 설정했습니다. 더 큰 영상을 올려야 한다면 Supabase Storage 설정과 `schema.sql`의 `file_size_limit` 값을 함께 조정하세요.
