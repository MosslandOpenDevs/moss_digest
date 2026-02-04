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

설치되는 패키지:
- `rss-parser` - Medium RSS 파싱
- `@octokit/rest` - GitHub API 접근
- `commander` - CLI 인터페이스
- `ejs` - HTML 템플릿
- `puppeteer` - PDF 생성
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

`config/.env` 파일을 열고 GitHub 토큰을 입력합니다:

```env
# 필수: GitHub API 토큰
GITHUB_TOKEN=ghp_여기에_복사한_토큰_붙여넣기

# 선택: Google Gemini API (공시 자료 AI 요약)
GEMINI_API_KEY=여기에_Gemini_API_키_붙여넣기

# 선택 (비워두셔도 됩니다)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=
```

**Google Gemini API 키 발급 (선택사항):**

공시 문서 자동 요약 기능을 사용하려면 Gemini API 키가 필요합니다:

1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. **Get API key** 또는 **Create API key** 클릭
3. 생성된 API 키 복사
4. `config/.env` 파일의 `GEMINI_API_KEY`에 붙여넣기

**참고:**
- Gemini API는 **무료**로 사용 가능 (하루 1,500 요청)
- API 키가 없으면 요약 기능은 자동으로 비활성화됩니다
- 링크 수집은 정상적으로 작동하며, 요약만 생략됩니다

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

MossDigest는 Google Gemini AI를 사용하여 공시 문서를 자동으로 요약합니다.

### 작동 방식

1. **자동 감지**: README.md에서 외부 링크를 발견하면 자동으로 요약 시도
2. **콘텐츠 추출**: PDF 또는 HTML 문서에서 텍스트 자동 추출
3. **AI 요약**: Gemini API를 통해 3-5줄로 핵심 내용 요약
4. **보고서 표시**: HTML 보고서에 요약 내용 자동 추가

### 요약 예시

보고서에서 각 공시 문서 아래에 다음과 같이 표시됩니다:

```
📄 2025년 1분기 실적 발표
   2025년 1월 15일

   🤖 AI 요약:
   2025년 1분기 매출은 전년 대비 15% 증가한 120억원을 기록했으며,
   신규 메타버스 플랫폼 출시로 MAU가 50만명을 돌파했습니다.
   주요 성장 동력은 NFT 거래량 증가와 기업 파트너십 확대입니다.
```

### 비활성화 방법

AI 요약을 사용하지 않으려면:

1. `config/.env`에서 `GEMINI_API_KEY`를 비워두거나 삭제
2. 데이터 수집 시 자동으로 요약이 건너뛰어짐
3. 링크 수집은 정상 작동

### 지원 형식

- **PDF 문서**: 자동 텍스트 추출 및 요약
- **HTML 페이지**: 태그 제거 후 본문 추출 및 요약
- **텍스트 문서**: 직접 요약

### 비용 및 제한

- **무료 사용**: 하루 1,500 요청까지 무료
- **속도 제한**: 요청 간 2초 간격 (API 보호)
- **문서 길이**: 최대 25,000자까지 처리

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
- `reports/2025/monthly/01/detail.pdf` - 상세 보고서 (PDF)

#### 분기 보고서 생성
```bash
npx mossdigest generate --type quarterly --year 2025 --quarter 1
```

**생성되는 파일:**
- `reports/2025/quarterly/Q1/summary.html`
- `reports/2025/quarterly/Q1/detail.pdf`

#### 연간 보고서 생성
```bash
npx mossdigest generate --type annual --year 2024
```

**생성되는 파일:**
- `reports/2024/annual/summary.html`
- `reports/2024/annual/detail.pdf`

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
4. 요약 HTML + 상세 PDF 생성

**결과 확인:**
- `reports/2025/monthly/01/summary.html` - 브라우저로 열기
- `reports/2025/monthly/01/detail.pdf` - PDF 뷰어로 열기

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
│       │   │   ├── summary.html    # 요약 보고서 (HTML)
│       │   │   └── detail.pdf      # 상세 보고서 (PDF)
│       │   ├── 02/
│       │   └── ...
│       ├── quarterly/
│       │   ├── Q1/
│       │   │   ├── summary.html
│       │   │   └── detail.pdf
│       │   └── ...
│       └── annual/
│           ├── summary.html
│           └── detail.pdf
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

### 문제 4: Puppeteer 실행 오류

**증상:** PDF 생성 중 오류

**원인:** Chromium 다운로드 실패 또는 실행 권한 문제

**해결:**
```bash
# Puppeteer 재설치
npm uninstall puppeteer
npm install puppeteer
```

Windows에서는 추가 설정이 필요할 수 있습니다:
```bash
# 관리자 권한으로 실행
npm install puppeteer --unsafe-perm=true
```

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
