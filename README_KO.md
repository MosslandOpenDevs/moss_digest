# MossDigest

🌐 [English](./README.md)

Mossland 프로젝트의 활동을 자동 수집하여 월간/분기/연간 보고서를 생성하는 자동화 파이프라인

## 📋 개요

MossDigest는 Medium 블로그, GitHub 저장소, 공시 문서 등 다양한 소스에서 데이터를 수집하고, 이를 기반으로 정기 보고서를 자동 생성합니다.

### 산출물

| 주기 | 빈도 | 산출물 |
|------|------|--------|
| 월간 | 12회/년 | 요약 HTML (다크 모드 디자인) |
| 분기 | 4회/년 | 요약 HTML (다크 모드 디자인) |
| 연간 | 1회/년 | 요약 HTML (다크 모드 디자인) |

> **참고**: PDF 생성 기능은 현재 비활성화되어 있습니다 (`src/generators/pdf.js`에서 재활성화 가능)

---

## 📥 데이터 입력 소스

### Medium RSS

| 소스 | URL | 수집 항목 |
|------|-----|----------|
| mossland-blog | `https://medium.com/feed/mossland-blog` | 제목, 발행일, 링크, 요약, **AI 요약** |

> **참고**: `@mosscoin`과 `mossland-blog`는 같은 퍼블리케이션을 가리키므로, 중복을 피하기 위해 `mossland-blog`만 사용합니다.
> **AI 요약**: LM Studio(로컬 LLM)로 자동 요약을 생성합니다. Google Gemini도 지원하지만 기본 비활성화입니다(아래 AI 요약 설정 참고).

### GitHub 저장소

| 저장소 | 용도 | 수집 항목 |
|--------|------|----------|
| [mossland/Disclosure-and-Materials](https://github.com/mossland/Disclosure-and-Materials) | 공시 자료 | MD/PDF 파일 변경, README 내 외부 링크 |

### GitHub 조직

| 조직 | 용도 | 수집 항목 |
|------|------|----------|
| [mossland](https://github.com/mossland) | 공식 저장소 (User 계정) | 신규 repo, 커밋, 릴리즈, **Pull Request, Issue, Contributors** |
| [MosslandOpenDevs](https://github.com/MosslandOpenDevs) | 오픈소스 개발 | 신규 repo, 커밋, 릴리즈, **Pull Request, Issue, Contributors** |

> **참고**: GitHub Organization과 User 계정 모두 지원하며 자동 감지됩니다

### 외부 링크 자동 수집

`Disclosure-and-Materials/README.md`에 포함된 날짜별 공시 링크를 파싱하여 해당 기간의 외부 문서도 함께 수집합니다.

**지원 날짜 형식:**
- 영문: `January 9, 2023`
- 한글: `2025년 1월 9일`

**기능:**
- 공시 링크에서 자동으로 콘텐츠 가져오기
- **공시 문서(PDF, HTML)의 AI 기반 요약 생성**
- 로컬 LLM(LM Studio) 요약 지원; 클라우드(Google Gemini)는 선택이며 기본 비활성화

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
│   │   ├── date-filter.js
│   │   └── summarizer.js   # AI 요약 (LM Studio + Gemini)
│   ├── commands/
│   │   ├── collect.js
│   │   ├── generate.js
│   │   ├── run.js
│   │   ├── build-web.js
│   │   ├── scheduler.js
│   │   └── sources.js
│   └── index.js
├── templates/              # 보고서 템플릿
│   ├── summary.html.ejs
│   └── detail.html.ejs
├── test/                   # 단위 테스트 (node:test, 추가 의존성 없음)
├── data/                   # 수집된 원본 데이터 (git-ignore)
│   └── {year}/
│       ├── monthly/        # {year}-{MM}.json
│       ├── quarterly/      # {year}-Q{n}.json
│       └── annual/         # {year}.json
├── reports/                # 생성된 보고서 (git-ignore)
│   └── {year}/
│       ├── monthly/{MM}/summary.html
│       ├── quarterly/Q{n}/summary.html
│       └── annual/summary.html
├── web/                    # 엔트리포인트 페이지 (git-ignore)
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

# LLM 설정 (AI 요약 기능)
# LLM_PROVIDER: "gemini" 또는 "lmstudio"
LLM_PROVIDER=lmstudio

# Google Gemini API (LLM_PROVIDER=gemini 사용 시)
GEMINI_API_KEY=your_gemini_api_key_here

# LM Studio API (LLM_PROVIDER=lmstudio 사용 시)
# 서버 설정
LMSTUDIO_URL=http://localhost:8899/v1          # 로컬 또는 원격 (예: http://100.71.81.27:8899/v1)
LMSTUDIO_MODEL=qwen2.5-32b-instruct            # LM Studio의 모델 이름

# 생성 파라미터
LMSTUDIO_TEMPERATURE=0.3                       # 0.0-1.0 (낮을수록 일관적)
LMSTUDIO_MAX_TOKENS=500                        # 최대 요약 길이
LMSTUDIO_MAX_CONTEXT_LENGTH=8000               # 최대 입력 텍스트 길이
LMSTUDIO_TIMEOUT=300000                        # API 타임아웃(ms) (기본 5분, 원격 시 10분+ 권장)

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
│  │          data/{year}/monthly | quarterly | annual/          ││
│  │                 (collected JSON per period)                 ││
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
│  │  (요약 보고서)  │                   │  (비활성화)   │          │
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

### 요약 보고서 (HTML) - 다크 모드 디자인

**핵심 지표 대시보드:**
- 📝 전체 블로그 포스트 수
- 💻 전체 커밋 수
- 🔀 Pull Request (병합률 % 포함)
- 🐛 Issue (해결률 % 포함)
- 👥 기여자 수
- 📦 신규 저장소 수
- 🚀 릴리즈 수

**주요 기능:**
- 다크 모드 디자인과 세련된 타이포그래피 (Instrument Serif, DM Sans, Space Mono)
- **동적 커밋 트렌드 그래프** (인터랙티브 Chart.js 시각화)
  - 연간 보고서: 월별 트렌드 (Jan-Dec)
  - 월간/분기 보고서: 주차별 트렌드 (Week 1, Week 2, ...)
- AI 생성 요약 (블로그 포스트 및 공시 문서)
- 고정 네비게이션 바와 부드러운 스크롤
- Fade-up 애니메이션 효과
- 반응형 디자인 (모바일/태블릿/데스크톱)

### 상세 보고서 (PDF) - 현재 비활성화

> **참고**: PDF 생성 기능은 현재 코드베이스에서 주석 처리되어 있습니다.
> 재활성화하려면 `src/generators/pdf.js`와 `src/commands/generate.js`의 PDF 생성 코드 주석을 해제하세요.

### 엔트리포인트 페이지 (web/index.html)

- 생성된 모든 보고서를 연도/기간별로 정렬하여 목록 표시 (최신순)
- 각 보고서의 요약(HTML) 바로가기
- 보고서 생성 후 `mossdigest build-web`으로 다시 빌드

---

## 🛠️ 기술 스택

| 용도 | 패키지 |
|------|--------|
| Medium RSS 파싱 | `rss-parser` |
| GitHub API | `@octokit/rest` |
| 환경변수 관리 | `dotenv` |
| 설정 검증 | `ajv` |
| HTML 템플릿 | `ejs` |
| PDF 생성 | `puppeteer` (현재 비활성화) |
| 스케줄링 | `node-cron` |
| CLI 인터페이스 | `commander` |
| **AI 요약 (로컬)** | **`openai` (LM Studio 호환)** |
| **AI 요약 (클라우드, 선택)** | **`@google/generative-ai` (Gemini — 기본 미설치, 아래 참고)** |
| **PDF 텍스트 추출** | **`pdf-parse`** |
| **차트 & 시각화** | **Chart.js (CDN)** |

---

## 🤖 AI 요약 설정

MossDigest는 자동 콘텐츠 요약을 위해 두 가지 LLM 제공자를 지원합니다:

### 방법 1: LM Studio (프라이버시 & 비용 측면에서 권장)

1. **다운로드 & 설치** [LM Studio](https://lmstudio.ai/)
2. **모델 로드** (예: `qwen2.5-32b-instruct`)
3. **로컬 서버 시작**
   - LM Studio에서 "Start Server" 클릭
   - 기본 포트: `8899`
4. **.env 설정**
   ```env
   LLM_PROVIDER=lmstudio
   LMSTUDIO_URL=http://localhost:8899/v1
   LMSTUDIO_MODEL=qwen2.5-32b-instruct
   ```

> **팁**: 로컬 Qwen2.5-32B 서버의 지연/처리량 튜닝(컨텍스트 길이, GPU 오프로딩) 노트는 [local-llm-summarization-tuning-report.md](./local-llm-summarization-tuning-report.md)를 참고하세요.

### 방법 2: Google Gemini API (기본 비활성화)

1. **SDK 설치**: `npm install @google/generative-ai` (기본 의존성에서 제외됨)
2. **주석 해제**: `src/utils/summarizer.js`의 Gemini 관련 코드 섹션 주석을 해제
3. **API 키 발급**: [Google AI Studio](https://makersuite.google.com/app/apikey)에서 생성
4. **.env 설정**
   ```env
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=your_api_key_here
   ```

> **참고**: Gemini 구현은 현재 `src/utils/summarizer.js`에서 주석 처리되어 있어, 기본 상태에서 동작하는 제공자는 LM Studio뿐입니다. 위 단계를 완료하지 않고 `LLM_PROVIDER=gemini`로 설정하면 AI 요약이 비활성화됩니다(수집은 계속 진행되며 요약만 생략됨).

---

## 💻 CLI 사용법

### 데이터 소스 관리

데이터 소스는 `config/sources.json` 파일을 직접 편집하여 설정합니다.

```bash
# 설정된 소스 목록 확인
npx mossdigest sources list

# config/sources.json을 스키마에 대해 검증
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

MossDigest는 세 가지 유형의 보고서를 생성하며, 각각 맞춤형 커밋 트렌드 시각화를 제공합니다:

#### 📅 월간 보고서
특정 월의 보고서를 **주차별 커밋 트렌드**로 생성합니다.

```bash
npx mossdigest generate --type monthly --year 2025 --month 12
```

**기능:**
- 📊 **주차별 커밋 트렌드 차트**: 해당 월의 주차별 커밋 활동 표시 (Week 1, Week 2 등)
- 📝 해당 월에 발행된 블로그 포스트
- 💻 해당 월의 모든 커밋, PR, Issue
- 🚀 해당 월에 생성된 릴리즈 및 신규 저장소
- 👥 해당 월의 활성 기여자

**출력 위치:**
```
reports/{year}/monthly/{month}/summary.html
```

**예시:**
```bash
# 2025년 12월 월간 보고서 생성
npx mossdigest generate --type monthly --year 2025 --month 12
# 출력: reports/2025/monthly/12/summary.html
```

---

#### 📊 분기별 보고서
특정 분기(Q1-Q4)의 보고서를 **주차별 커밋 트렌드**로 생성합니다.

```bash
npx mossdigest generate --type quarterly --year 2025 --quarter 4
```

**기능:**
- 📊 **주차별 커밋 트렌드 차트**: 분기의 주차별 커밋 활동 표시 (~13주)
- 📝 3개월 기간의 모든 블로그 포스트
- 💻 분기별 집계된 커밋, PR, Issue
- 🚀 분기의 모든 릴리즈 및 신규 저장소
- 👥 분기 전체의 활성 기여자

**분기 정의:**
- Q1: 1월 - 3월
- Q2: 4월 - 6월
- Q3: 7월 - 9월
- Q4: 10월 - 12월

**출력 위치:**
```
reports/{year}/quarterly/Q{quarter}/summary.html
```

**예시:**
```bash
# 2025년 4분기 보고서 생성 (10-12월)
npx mossdigest generate --type quarterly --year 2025 --quarter 4
# 출력: reports/2025/quarterly/Q4/summary.html
```

---

#### 📈 연간 보고서
연간 요약 보고서를 **월별 커밋 트렌드**로 생성합니다.

```bash
npx mossdigest generate --type annual --year 2025
```

**기능:**
- 📊 **월별 커밋 트렌드 차트**: 연도의 각 월별 커밋 활동 표시 (Jan-Dec)
- 📝 연간 전체 블로그 포스트
- 💻 연간 커밋 통계, PR, Issue
- 🚀 연간 생성된 모든 릴리즈 및 신규 저장소
- 👥 연간 주요 기여자

**출력 위치:**
```
reports/{year}/annual/summary.html
```

**예시:**
```bash
# 2025년 연간 보고서 생성
npx mossdigest generate --type annual --year 2025
# 출력: reports/2025/annual/summary.html
```

---

#### 🔍 커밋 트렌드 시각화 차이점

| 보고서 유형 | 차트 단위 | X축 레이블 | 기간 |
|-------------|-----------|-----------|------|
| **월간** | 주차별 | Week 1, Week 2, ... | ~4-5주 |
| **분기별** | 주차별 | Week 1, Week 2, ... | ~13주 |
| **연간** | 월별 | Jan, Feb, Mar, ... | 12개월 |

> **참고**: 커밋 트렌드 시각화는 보고서 유형에 따라 자동으로 조정되어 각 기간에 가장 의미 있는 인사이트를 제공합니다.

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
| **Phase 1** | 프로젝트 초기화 + 설정 파일 구조 | ✅ **완료** |
| **Phase 2** | 데이터 수집기 (Medium + GitHub) | ✅ **완료** |
| **Phase 2.5** | **AI 요약 (LM Studio + Gemini)** | ✅ **완료** |
| **Phase 2.6** | **GitHub 활동 통계 (PR, Issue, Contributors)** | ✅ **완료** |
| **Phase 3** | 보고서 생성 (다크 모드 HTML) | ✅ **완료** |
| **Phase 3.5** | **동적 커밋 트렌드 그래프** | ✅ **완료** |
| **Phase 4** | 분기/연간 보고서 (월간 데이터 집계) | ✅ **완료** |
| **Phase 5** | 엔트리포인트 페이지 (`build-web`) | ✅ **완료** |
| **Phase 6** | CLI (collect / generate / run / sources / build-web / scheduler) | ✅ **완료** |
| **Phase 7** | 자동 스케줄링 (`scheduler start`) | ✅ **완료** |
| **Phase 8** | PDF 보고서 생성 (재활성화) | 🔴 선택사항 |

---

## 📝 라이선스

MIT License

---

## 🤝 기여하기

이슈와 PR을 환영합니다!
