# MossDigest

🌐 [English](./README.md)

Mossland 프로젝트의 활동을 자동 수집하여 월간/분기/연간 보고서를 생성하는 자동화 파이프라인

## 📋 개요

MossDigest는 Medium 블로그, GitHub 저장소, 공시 문서 등 다양한 소스에서 데이터를 수집하고, 이를 기반으로 정기 보고서를 자동 생성합니다.

### 산출물

| 주기 | 빈도 | 산출물 |
|------|------|--------|
| 월간 | 12회/년 | 요약 HTML + 상세 PDF |
| 분기 | 4회/년 | 요약 HTML + 상세 PDF |
| 연간 | 1회/년 | 요약 HTML + 상세 PDF |

---

## 📥 데이터 입력 소스

### Medium RSS

| 소스 | URL | 수집 항목 |
|------|-----|----------|
| mossland-blog | `https://medium.com/feed/mossland-blog` | 제목, 발행일, 링크, 요약 |

> 참고: `@mosscoin`과 `mossland-blog`는 같은 퍼블리케이션을 가리키므로, 중복을 피하기 위해 `mossland-blog`만 사용합니다.

### GitHub 저장소

| 저장소 | 용도 | 수집 항목 |
|--------|------|----------|
| [mossland/Disclosure-and-Materials](https://github.com/mossland/Disclosure-and-Materials) | 공시 자료 | MD/PDF 파일 변경, README 내 외부 링크 |

### GitHub 조직

| 조직 | 용도 | 수집 항목 |
|------|------|----------|
| [mossland](https://github.com/mossland) | 공식 저장소 | 신규 repo, 커밋, 릴리즈 |
| [MosslandOpenDevs](https://github.com/MosslandOpenDevs) | 오픈소스 개발 | 신규 repo, 커밋, 릴리즈 |

### 외부 링크 자동 수집

`Disclosure-and-Materials/README.md`에 포함된 날짜별 공시 링크를 파싱하여 해당 기간의 외부 문서도 함께 수집합니다.

**지원 날짜 형식:**
- 영문: `January 9, 2023`
- 한글: `2025년 1월 9일`

---

## 📁 프로젝트 구조

```
MossDigest/
├── config/
│   ├── sources.json        # 데이터 소스 설정
│   ├── .env                # API 키 (gitignore)
│   └── .env.example        # API 키 템플릿
├── src/
│   ├── collectors/         # 데이터 수집 모듈
│   │   ├── medium.js
│   │   ├── github-repos.js
│   │   ├── github-orgs.js
│   │   └── external-links.js
│   ├── generators/         # 보고서 생성 모듈
│   │   ├── html.js
│   │   └── pdf.js
│   ├── utils/
│   │   └── date-filter.js
│   └── index.js
├── templates/              # 보고서 템플릿
│   ├── summary.html.ejs
│   └── detail.html.ejs
├── data/                   # 수집된 원본 데이터
│   └── {year}/
│       ├── raw/
│       └── processed/
├── reports/                # 생성된 보고서
│   └── {year}/
│       ├── monthly/
│       ├── quarterly/
│       └── annual/
├── web/                    # 엔트리포인트 페이지
│   └── index.html
├── package.json
└── README.md
```

---

## ⚙️ 설정 파일

### config/sources.json

```json
{
  "medium": {
    "feeds": [
      {
        "name": "mossland-blog",
        "url": "https://medium.com/feed/mossland-blog",
        "enabled": true
      }
    ]
  },
  "github": {
    "repositories": [
      {
        "owner": "mossland",
        "repo": "Disclosure-and-Materials",
        "type": "docs",
        "description": "공시 자료 및 문서",
        "trackFiles": ["*.md", "*.pdf"],
        "parseReadmeLinks": true,
        "enabled": true
      }
    ],
    "organizations": [
      {
        "name": "mossland",
        "type": "official",
        "description": "공식 저장소",
        "trackNewRepos": true,
        "trackCommits": true,
        "trackReleases": true,
        "enabled": true
      },
      {
        "name": "MosslandOpenDevs",
        "type": "development",
        "description": "오픈소스 개발 활동",
        "trackNewRepos": true,
        "trackCommits": true,
        "trackReleases": true,
        "enabled": true
      }
    ]
  },
  "reporting": {
    "schedule": {
      "monthly": "0 0 1 * *",
      "quarterly": "0 0 1 1,4,7,10 *",
      "annual": "0 0 1 1 *"
    },
    "outputs": {
      "html": true,
      "pdf": true
    }
  }
}
```

### config/.env.example

```env
# GitHub API (필수)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Optional: 더 높은 rate limit을 위한 GitHub App
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=

# Optional: 알림 설정
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=
```

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                          MossDigest                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   config/sources.json                     │  │
│  │              (Medium feeds, GitHub repos/orgs)            │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      Collectors                             ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐   ││
│  │  │ Medium  │ │ GitHub  │ │ GitHub  │ │ External Links  │   ││
│  │  │   RSS   │ │  Repos  │ │  Orgs   │ │ (README Parse)  │   ││
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘   ││
│  └───────┼───────────┼───────────┼───────────────┼─────────────┘│
│          │           │           │               │              │
│          └───────────┴─────┬─────┴───────────────┘              │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Date Filter                             ││
│  │              (월간/분기/연간 기간 필터링)                      ││
│  └─────────────────────────┬───────────────────────────────────┘│
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      Data Store                             ││
│  │                  data/{year}/raw/                           ││
│  │                  data/{year}/processed/                     ││
│  └─────────────────────────┬───────────────────────────────────┘│
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Report Generator                          ││
│  │              (월간 / 분기 / 연간 보고서)                       ││
│  └─────────────────────────┬───────────────────────────────────┘│
│                            ▼                                    │
│          ┌─────────────────┴─────────────────┐                  │
│          ▼                                   ▼                  │
│  ┌───────────────┐                   ┌───────────────┐          │
│  │ summary.html  │                   │  detail.pdf   │          │
│  │  (요약 보고서)  │                   │ (상세 보고서)  │          │
│  └───────────────┘                   └───────────────┘          │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Entry Point Page                          ││
│  │                    web/index.html                           ││
│  │              (보고서 목록 / 검색 / 다운로드)                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 보고서 구성

### 요약 보고서 (HTML)

- 핵심 지표 대시보드
- 주요 하이라이트 (3~5개)
- 블로그 발행 목록
- 개발 활동 요약 (신규 repo, 주요 커밋)
- 인터랙티브 차트

### 상세 보고서 (PDF)

- 전체 블로그 글 요약
- GitHub 커밋 상세 로그
- 파일 변경 내역 전체
- 통계 테이블
- 원본 데이터 참조 링크

### 엔트리포인트 페이지 (web/index.html)

- 연도별/월별 보고서 네비게이션
- 최신 보고서 바로가기
- 검색/필터 기능
- 다운로드 링크 (HTML, PDF)

---

## 🛠️ 기술 스택

| 용도 | 패키지 |
|------|--------|
| Medium RSS 파싱 | `rss-parser` |
| GitHub API | `@octokit/rest` |
| 환경변수 관리 | `dotenv` |
| 설정 검증 | `ajv` |
| HTML 템플릿 | `ejs` |
| PDF 생성 | `puppeteer` |
| 스케줄링 | `node-cron` |
| CLI 인터페이스 | `commander` |

---

## 💻 CLI 사용법

### 데이터 소스 관리

```bash
# 설정된 소스 목록 확인
npx mossdigest sources list

# 새 저장소 추가
npx mossdigest sources add-repo

# 새 조직 추가
npx mossdigest sources add-org

# 설정 파일 검증
npx mossdigest sources validate
```

### 데이터 수집

```bash
# 특정 월 데이터 수집
npx mossdigest collect --year 2025 --month 12

# 특정 분기 데이터 수집
npx mossdigest collect --year 2025 --quarter 4
```

### 보고서 생성

```bash
# 월간 보고서
npx mossdigest generate --type monthly --year 2025 --month 12

# 분기 보고서
npx mossdigest generate --type quarterly --year 2025 --quarter 4

# 연간 보고서
npx mossdigest generate --type annual --year 2025
```

### 전체 파이프라인

```bash
# 수집 + 생성 한번에 실행
npx mossdigest run --type monthly --year 2025 --month 12

# 엔트리포인트 페이지 빌드
npx mossdigest build-web

# 스케줄러 시작 (자동 실행)
npx mossdigest scheduler start
```

---

## 📅 자동 스케줄

| 실행 시점 | 생성 보고서 | Cron 표현식 |
|----------|------------|-------------|
| 매월 1일 00:00 | 전월 월간 보고서 | `0 0 1 * *` |
| 1,4,7,10월 1일 00:00 | 전분기 분기 보고서 | `0 0 1 1,4,7,10 *` |
| 1월 1일 00:00 | 전년 연간 보고서 | `0 0 1 1 *` |

---

## 🚀 개발 로드맵

| Phase | 내용 | 상태 |
|-------|------|------|
| **Phase 1** | 프로젝트 초기화 + 설정 파일 구조 | 🔴 예정 |
| **Phase 2** | 데이터 수집기 (Medium + GitHub) | 🔴 예정 |
| **Phase 3** | 월간 보고서 생성 (HTML + PDF) | 🔴 예정 |
| **Phase 4** | 분기/연간 보고서 (월간 데이터 집계) | 🟡 예정 |
| **Phase 5** | 엔트리포인트 페이지 | 🟡 예정 |
| **Phase 6** | CLI 완성 | 🟡 예정 |
| **Phase 7** | 자동 스케줄링 | 🟢 예정 |

---

## 📝 라이선스

MIT License

---

## 🤝 기여하기

이슈와 PR을 환영합니다!
