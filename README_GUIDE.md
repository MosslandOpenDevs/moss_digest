# MossDigest 사용 가이드

MossDigest를 사용하여 Mossland 프로젝트의 활동 보고서를 생성하는 방법을 안내합니다.

---

## 📋 목차

1. [사전 준비](#-사전-준비)
2. [설치](#-설치)
3. [설정](#-설정)
4. [기본 사용법](#-기본-사용법)
5. [AI 요약 기능](#-ai-요약-기능)
6. [명령어 상세](#-명령어-상세)
7. [실제 사용 예시](#-실제-사용-예시)
8. [출력 파일 구조](#-출력-파일-구조)
9. [문제 해결](#-문제-해결)

---

## 🔧 사전 준비

### 필수 요구사항

- **Node.js**: v18 이상
- **npm**: v8 이상
- **GitHub Personal Access Token**: GitHub API 접근용

### 확인 방법

```bash
node --version   # v18.0.0 이상
npm --version    # v8.0.0 이상
```

---

## 💿 설치

### 1. 의존성 패키지 설치

프로젝트 디렉토리에서 다음 명령어를 실행합니다:

```bash
npm install
```

설치되는 주요 패키지:
- `rss-parser` - Medium RSS 파싱
- `@octokit/rest` - GitHub API 접근
- `commander` - CLI 인터페이스
- `ejs` - HTML 템플릿
- `openai` - LM Studio(OpenAI 호환) AI 요약
- `pdf-parse` - PDF 텍스트 추출
- `puppeteer` - PDF 생성 (현재 비활성화, 향후 사용 대비)
- `node-cron` - 스케줄링
- `dotenv` - 환경변수 관리
- `ajv` - 설정 파일 검증

---

## ⚙️ 설정

### 1. GitHub Personal Access Token 생성

1. GitHub 로그인 후 Settings 이동
2. **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token (classic)** 클릭
4. 토큰 설정:
   - **Note**: `MossDigest`
   - **Expiration**: `No expiration` 또는 원하는 기간
   - **Select scopes**:
     - ✅ `repo` (전체 저장소 접근)
     - ✅ `read:org` (조직 정보 읽기)
5. **Generate token** 클릭
6. 생성된 토큰 복사 (한 번만 보여집니다!)

### 2. 환경변수 파일 설정

먼저 예제 파일을 복사한 뒤 값을 채웁니다:

```bash
cp config/.env.example config/.env
```

최소한 GitHub 토큰만 있으면 데이터 수집이 동작합니다:

```env
# 필수: GitHub API 토큰
GITHUB_TOKEN=ghp_여기에_복사한_토큰_붙여넣기

# AI 요약 제공자 (기본: lmstudio)
LLM_PROVIDER=lmstudio

# LM Studio 로컬 서버 설정 (LLM_PROVIDER=lmstudio 인 경우)
LMSTUDIO_URL=http://localhost:8899/v1
LMSTUDIO_MODEL=qwen2.5-32b-instruct

# 선택 (비워두셔도 됩니다)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=
```

**AI 요약 (선택사항):**

- 기본 요약 제공자는 **LM Studio(로컬 LLM)** 입니다. 설정 방법은 아래 [AI 요약 기능](#-ai-요약-기능)을 참고하세요.
- LM Studio 서버가 실행 중이 아니면 **요약만 자동으로 생략**되며, 데이터 수집과 보고서 생성은 정상 동작합니다.
- Google Gemini(클라우드)는 현재 코드에서 비활성화되어 있습니다.

### 3. 설정 확인

```bash
npx mossdigest sources list
```

정상적으로 데이터 소스 목록이 출력되면 설정 완료!

---

## 🚀 기본 사용법

### 빠른 시작 (전체 파이프라인)

데이터 수집부터 보고서 생성까지 한 번에 실행:

```bash
# 2025년 1월 월간 보고서 생성
npx mossdigest run --type monthly --year 2025 --month 1
```

### 단계별 실행

#### 1️⃣ 데이터 수집만 실행

```bash
npx mossdigest collect --year 2025 --month 1
```

#### 2️⃣ 보고서 생성만 실행

```bash
npx mossdigest generate --type monthly --year 2025 --month 1
```

#### 3️⃣ 웹 페이지 생성

```bash
npx mossdigest build-web
```

---

## 🤖 AI 요약 기능

MossDigest는 로컬 LLM(LM Studio, OpenAI 호환 API)을 사용하여 Medium 글과 공시 문서를 자동으로 요약합니다.

### 사전 준비 (LM Studio)

1. [LM Studio](https://lmstudio.ai/) 설치 후 모델 다운로드 (예: `qwen2.5-32b-instruct`)
2. LM Studio에서 **Start Server** 클릭 (기본 포트 `8899`)
3. `config/.env`에서 `LLM_PROVIDER=lmstudio`, `LMSTUDIO_URL`, `LMSTUDIO_MODEL` 설정

> 로컬 서버 튜닝(지연/처리량, 컨텍스트 길이, GPU 오프로딩) 노트는 [local-llm-summarization-tuning-report.md](./local-llm-summarization-tuning-report.md)를 참고하세요.

### 작동 방식

1. **자동 감지**: 수집 대상(Medium 글, README의 외부 링크)을 발견하면 요약 시도
2. **콘텐츠 추출**: PDF 또는 HTML 문서에서 텍스트 자동 추출
3. **AI 요약**: 로컬 LLM으로 3-5줄로 핵심 내용 요약 (한/영 언어 자동 감지)
4. **보고서 표시**: HTML 보고서에 요약 내용 자동 추가

### 요약 예시

보고서에서 각 문서 아래에 다음과 같이 표시됩니다:

```
📄 2025년 1분기 실적 발표
   2025년 1월 15일

   🤖 AI 요약:
   2025년 1분기 매출은 전년 대비 15% 증가한 120억원을 기록했으며,
   신규 메타버스 플랫폼 출시로 MAU가 50만명을 돌파했습니다.
```

### 요약 없이 실행 / 파라미터 조정

- LM Studio 서버를 실행하지 않으면 요약이 자동으로 생략되고, 수집·보고서 생성은 정상 동작합니다.
- 요약 동작은 `config/.env`의 다음 값으로 조정할 수 있습니다:
  - `LMSTUDIO_TEMPERATURE` (기본 0.3), `LMSTUDIO_MAX_TOKENS` (기본 500)
  - `LMSTUDIO_MAX_CONTEXT_LENGTH` (기본 8000자 — 초과분은 앞부분만 사용)
  - `LMSTUDIO_TIMEOUT` (기본 300000ms)

### 지원 형식

- **PDF 문서**: 자동 텍스트 추출 및 요약
- **HTML 페이지**: 태그 제거 후 본문 추출 및 요약
- **텍스트 문서**: 직접 요약

### 참고: Google Gemini

Gemini(클라우드) 제공자는 현재 코드에서 비활성화되어 있습니다. 사용하려면 `npm install @google/generative-ai` 후 `src/utils/summarizer.js`의 Gemini 섹션 주석을 해제하세요.

---

## 📖 명령어 상세

### `sources` - 데이터 소스 관리

#### 소스 목록 확인
```bash
npx mossdigest sources list
```

**출력 예시:**
```
📋 Configured Data Sources

📝 Medium RSS Feeds:
  ✅ mossland-blog
     https://medium.com/feed/mossland-blog

💾 GitHub Repositories:
  ✅ mossland/Disclosure-and-Materials
     공시 자료 및 문서
     Track files: *.md, *.pdf

🏢 GitHub Organizations:
  ✅ mossland (official)
     공식 저장소
     Tracking: new repos, commits, releases
```

#### 설정 파일 검증
```bash
npx mossdigest sources validate
```

---

### `collect` - 데이터 수집

#### 월간 데이터 수집
```bash
npx mossdigest collect --year 2025 --month 1
```

**수집되는 데이터:**
- Medium 블로그 글
- GitHub 커밋 로그
- 신규 저장소
- 릴리즈 목록
- README의 외부 링크

**저장 위치:**
```
data/2025/monthly/2025-01.json
```

#### 분기 데이터 수집
```bash
npx mossdigest collect --year 2025 --quarter 1
```

**저장 위치:**
```
data/2025/quarterly/2025-Q1.json
```

#### 연간 데이터 수집
```bash
npx mossdigest collect --year 2024
```

**저장 위치:**
```
data/2024/annual/2024.json
```

#### 상세 출력 모드
```bash
npx mossdigest collect --year 2025 --month 1 --verbose
```

---

### `generate` - 보고서 생성

#### 월간 보고서 생성
```bash
npx mossdigest generate --type monthly --year 2025 --month 1
```

**생성되는 파일:**
- `reports/2025/monthly/01/summary.html` - 요약 보고서 (HTML)

#### 분기 보고서 생성
```bash
npx mossdigest generate --type quarterly --year 2025 --quarter 1
```

**생성되는 파일:**
- `reports/2025/quarterly/Q1/summary.html`

#### 연간 보고서 생성
```bash
npx mossdigest generate --type annual --year 2024
```

**생성되는 파일:**
- `reports/2024/annual/summary.html`

> **참고**: 상세 PDF(`detail.pdf`) 생성은 현재 비활성화되어 있어 요약 HTML만 생성됩니다.

---

### `run` - 전체 파이프라인

수집 + 생성을 한 번에 실행합니다.

#### 월간 보고서
```bash
npx mossdigest run --type monthly --year 2025 --month 1
```

#### 분기 보고서
```bash
npx mossdigest run --type quarterly --year 2025 --quarter 1
```

#### 연간 보고서
```bash
npx mossdigest run --type annual --year 2024
```

---

### `build-web` - 웹 페이지 생성

생성된 모든 보고서 목록을 보여주는 엔트리 페이지를 생성합니다.

```bash
npx mossdigest build-web
```

**생성 위치:**
```
web/index.html
```

브라우저에서 `web/index.html`을 열면 모든 보고서를 확인할 수 있습니다.

---

### `scheduler` - 자동 스케줄러

정기적으로 보고서를 자동 생성합니다.

#### 스케줄러 시작
```bash
npx mossdigest scheduler start
```

**자동 실행 일정:**
- **월간 보고서**: 매월 1일 00:00 (전월 보고서)
- **분기 보고서**: 1, 4, 7, 10월 1일 00:00 (전분기 보고서)
- **연간 보고서**: 1월 1일 00:00 (전년 보고서)

**중지 방법:**
`Ctrl + C` 키를 누르거나 터미널을 종료하면 스케줄러가 중지됩니다.

---

## 💡 실제 사용 예시

### 예시 1: 2025년 1월 보고서 생성

```bash
# 전체 파이프라인 실행
npx mossdigest run --type monthly --year 2025 --month 1
```

**실행 과정:**
1. 2025년 1월 1일 ~ 31일 데이터 수집
2. Medium 블로그 글 수집
3. GitHub 커밋 및 활동 수집
4. 요약 HTML 생성

**결과 확인:**
- `reports/2025/monthly/01/summary.html` - 브라우저로 열기

---

### 예시 2: 2024년 4분기 보고서 생성

```bash
# 4분기 = 10월, 11월, 12월
npx mossdigest run --type quarterly --year 2024 --quarter 4
```

**수집 기간:**
- 2024년 10월 1일 ~ 12월 31일

**결과 위치:**
- `reports/2024/quarterly/Q4/`

---

### 예시 3: 과거 데이터로 여러 달 보고서 생성

```bash
# 2024년 각 월별 보고서 생성
for month in {1..12}; do
  npx mossdigest run --type monthly --year 2024 --month $month
done

# 웹 페이지 업데이트
npx mossdigest build-web
```

---

### 예시 4: 데이터만 먼저 수집 후 나중에 보고서 생성

```bash
# 1단계: 데이터 수집 (빠름)
npx mossdigest collect --year 2025 --month 1
npx mossdigest collect --year 2025 --month 2
npx mossdigest collect --year 2025 --month 3

# 2단계: 나중에 보고서 생성
npx mossdigest generate --type monthly --year 2025 --month 1
npx mossdigest generate --type monthly --year 2025 --month 2
npx mossdigest generate --type monthly --year 2025 --month 3
```

---

## 📁 출력 파일 구조

```
MossDigest/
├── data/                      # 수집된 원본 데이터
│   └── 2025/
│       ├── monthly/
│       │   ├── 2025-01.json
│       │   ├── 2025-02.json
│       │   └── ...
│       ├── quarterly/
│       │   ├── 2025-Q1.json
│       │   └── ...
│       └── annual/
│           └── 2025.json
│
├── reports/                   # 생성된 보고서
│   └── 2025/
│       ├── monthly/
│       │   ├── 01/
│       │   │   └── summary.html    # 요약 보고서 (HTML)
│       │   ├── 02/
│       │   └── ...
│       ├── quarterly/
│       │   ├── Q1/
│       │   │   └── summary.html
│       │   └── ...
│       └── annual/
│           └── summary.html
│
└── web/
    └── index.html             # 엔트리 페이지 (모든 보고서 목록)
```

---

## 🔍 문제 해결

### 문제 1: `GITHUB_TOKEN not found` 오류

**원인:** GitHub 토큰이 설정되지 않음

**해결:**
1. `config/.env` 파일 확인
2. `GITHUB_TOKEN=` 뒤에 실제 토큰 입력
3. 파일 저장 후 다시 실행

---

### 문제 2: `Could not read data file` 오류

**원인:** 데이터가 아직 수집되지 않음

**해결:**
```bash
# 먼저 데이터 수집 실행
npx mossdigest collect --year 2025 --month 1

# 그 다음 보고서 생성
npx mossdigest generate --type monthly --year 2025 --month 1
```

---

### 문제 3: GitHub API Rate Limit 초과

**증상:** `API rate limit exceeded` 오류

**원인:** GitHub API 요청 한도 초과 (시간당 5,000회)

**해결:**
1. 잠시 기다렸다가 다시 시도 (1시간 후 리셋)
2. 수집 범위를 줄임 (월간 → 주간)
3. GitHub App 사용 (더 높은 한도)

**확인 방법:**
```bash
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit
```

---

### 문제 4: AI 요약이 생성되지 않음

**증상:** 보고서에 `🤖 AI 요약`이 표시되지 않음

**원인:** LM Studio 서버가 실행 중이 아니거나 `config/.env`의 LM Studio 설정이 올바르지 않음

**해결:**
1. LM Studio에서 **Start Server**가 눌려 있는지 확인 (기본 포트 `8899`)
2. `config/.env`의 `LMSTUDIO_URL`, `LMSTUDIO_MODEL`이 실제 서버/모델과 일치하는지 확인
3. 원격 서버 사용 시 `LMSTUDIO_TIMEOUT`을 넉넉히 설정 (예: 600000)

> 참고: LLM 요약은 선택 기능이므로, 서버가 없어도 수집과 보고서 생성은 정상 동작하며 요약만 생략됩니다.
> PDF(Puppeteer) 생성은 현재 비활성화되어 있어 관련 오류는 발생하지 않습니다.

---

### 문제 5: 특정 저장소 데이터가 수집되지 않음

**원인:**
- 저장소가 private일 수 있음
- 토큰 권한이 부족할 수 있음

**해결:**
1. GitHub 토큰이 해당 저장소 접근 권한이 있는지 확인
2. Private 저장소인 경우 토큰에 `repo` 권한 필요
3. `config/sources.json`에서 해당 저장소가 `"enabled": true`인지 확인

---

## 📞 추가 도움말

### 모든 명령어 보기
```bash
npx mossdigest --help
```

### 특정 명령어 도움말
```bash
npx mossdigest collect --help
npx mossdigest generate --help
npx mossdigest run --help
```

### Verbose 모드로 상세 로그 보기
```bash
npx mossdigest collect --year 2025 --month 1 --verbose
npx mossdigest run --type monthly --year 2025 --month 1 --verbose
```

---

## 🎯 권장 워크플로우

### 초기 설정 (한 번만)
1. `npm install` - 의존성 설치
2. GitHub 토큰 생성 및 `.env` 설정
3. `npx mossdigest sources validate` - 설정 확인

### 정기 사용 (매월)
1. `npx mossdigest run --type monthly --year YYYY --month M`
2. `npx mossdigest build-web`
3. `web/index.html` 열어서 확인

### 자동화
```bash
# 스케줄러 실행 (백그라운드)
npx mossdigest scheduler start &
```

---

## 📝 팁

### 1. 여러 달 한 번에 생성
```bash
# Bash
for m in {1..3}; do
  npx mossdigest run --type monthly --year 2025 --month $m
done

# PowerShell
1..3 | ForEach-Object { npx mossdigest run --type monthly --year 2025 --month $_ }
```

### 2. 데이터만 백업
```bash
# data/ 폴더만 따로 백업
tar -czf mossdigest-data-backup.tar.gz data/
```

### 3. 보고서만 공유
```bash
# reports/ 폴더만 압축
tar -czf mossdigest-reports-2025.tar.gz reports/2025/
```

---

**Happy reporting! 🎉**
