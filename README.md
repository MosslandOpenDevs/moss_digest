# MossDigest

🌐 [한국어](./README_KO.md)

An automated pipeline that collects Mossland project activities and generates monthly, quarterly, and annual reports.

## 📋 Overview

MossDigest collects data from various sources including Medium blogs, GitHub repositories, and disclosure documents, then automatically generates periodic reports.

### Outputs

| Period | Frequency | Deliverables |
|--------|-----------|--------------|
| Monthly | 12/year | Summary HTML (Dark Mode Design) |
| Quarterly | 4/year | Summary HTML (Dark Mode Design) |
| Annual | 1/year | Summary HTML (Dark Mode Design) |

> **Note**: PDF generation is currently disabled (can be re-enabled in `src/generators/pdf.js`)

---

## 📥 Data Sources

### Medium RSS

| Source | URL | Collected Items |
|--------|-----|-----------------|
| mossland-blog | `https://medium.com/feed/mossland-blog` | Title, Date, Link, Summary, **AI Summary** |

> **Note**: `@mosscoin` and `mossland-blog` point to the same publication, so we use only `mossland-blog` to avoid duplicates.
> **AI Summary**: Automatically generates concise summaries using LM Studio (local LLM) or Google Gemini API

### GitHub Repositories

| Repository | Purpose | Collected Items |
|------------|---------|-----------------|
| [mossland/Disclosure-and-Materials](https://github.com/mossland/Disclosure-and-Materials) | Disclosure Documents | MD/PDF file changes, External links in README |

### GitHub Organizations

| Organization | Purpose | Collected Items |
|--------------|---------|-----------------|
| [mossland](https://github.com/mossland) | Official Repositories (User account) | New repos, Commits, Releases, **Pull Requests, Issues, Contributors** |
| [MosslandOpenDevs](https://github.com/MosslandOpenDevs) | Open Source Development | New repos, Commits, Releases, **Pull Requests, Issues, Contributors** |

> **Note**: Supports both GitHub Organizations and User accounts with automatic fallback detection

### External Link Auto-Collection

Parses date-based disclosure links from `Disclosure-and-Materials/README.md` to collect external documents for the specified period.

**Supported Date Formats:**
- English: `January 9, 2023`
- Korean: `2025년 1월 9일`

**Features:**
- Automatic content fetching from disclosure links
- **AI-powered summarization** of disclosure documents (PDF, HTML)
- Support for both local LLM (LM Studio) and cloud API (Google Gemini)

---

## 📁 Project Structure

```
MossDigest/
├── config/
│   ├── sources.json        # Data source configuration
│   ├── .env                # API keys (gitignore)
│   └── .env.example        # API key template
├── src/
│   ├── collectors/         # Data collection modules
│   │   ├── medium.js
│   │   ├── github-repos.js
│   │   ├── github-orgs.js
│   │   └── external-links.js
│   ├── generators/         # Report generation modules
│   │   ├── html.js
│   │   └── pdf.js
│   ├── utils/
│   │   ├── date-filter.js
│   │   └── summarizer.js   # AI summarization (LM Studio + Gemini)
│   ├── commands/
│   │   ├── collect.js
│   │   └── generate.js
│   └── index.js
├── templates/              # Report templates
│   ├── summary.html.ejs
│   └── detail.html.ejs
├── data/                   # Collected raw data
│   └── {year}/
│       ├── raw/
│       └── processed/
├── reports/                # Generated reports
│   └── {year}/
│       ├── monthly/
│       ├── quarterly/
│       └── annual/
├── web/                    # Entry point page
│   └── index.html
├── package.json
└── README.md
```

---

## ⚙️ Configuration

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
        "description": "Disclosure documents",
        "trackFiles": ["*.md", "*.pdf"],
        "parseReadmeLinks": true,
        "enabled": true
      }
    ],
    "organizations": [
      {
        "name": "mossland",
        "type": "official",
        "description": "Official repositories",
        "trackNewRepos": true,
        "trackCommits": true,
        "trackReleases": true,
        "enabled": true
      },
      {
        "name": "MosslandOpenDevs",
        "type": "development",
        "description": "Open source development",
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
# GitHub API (Required)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Optional: GitHub App for higher rate limits
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=

# LLM Settings (AI Summarization)
# LLM_PROVIDER: "gemini" or "lmstudio"
LLM_PROVIDER=lmstudio

# Google Gemini API (when LLM_PROVIDER=gemini)
GEMINI_API_KEY=your_gemini_api_key_here

# LM Studio API (when LLM_PROVIDER=lmstudio)
# Requires LM Studio server running locally
LMSTUDIO_URL=http://localhost:8899/v1
LMSTUDIO_MODEL=qwen2.5-32b-instruct

# Optional: Notifications
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=
```

---

## 🏗️ System Architecture

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
│  │            (Monthly/Quarterly/Annual filtering)             ││
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
│  │              (Monthly / Quarterly / Annual)                 ││
│  └─────────────────────────┬───────────────────────────────────┘│
│                            ▼                                    │
│          ┌─────────────────┴─────────────────┐                  │
│          ▼                                   ▼                  │
│  ┌───────────────┐                   ┌───────────────┐          │
│  │ summary.html  │                   │  detail.pdf   │          │
│  │   (Summary)   │                   │   (Detail)    │          │
│  └───────────────┘                   └───────────────┘          │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Entry Point Page                          ││
│  │                    web/index.html                           ││
│  │            (Report list / Search / Download)                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Report Contents

### Summary Report (HTML) - Dark Mode Design

**Key Metrics Dashboard:**
- 📝 Total Blog Posts
- 💻 Total Commits
- 🔀 Pull Requests (with merge rate %)
- 🐛 Issues (with closure rate %)
- 👥 Contributors
- 📦 New Repositories
- 🚀 Releases

**Features:**
- Dark mode design with elegant typography (Instrument Serif, DM Sans, Space Mono)
- **Monthly Commit Trend Graph** (interactive Chart.js visualization)
- AI-generated summaries for blog posts and disclosure documents
- Fixed navigation bar with smooth scrolling
- Fade-up animations for content sections
- Responsive design for mobile/tablet/desktop

### Detail Report (PDF) - Currently Disabled

> **Note**: PDF generation is currently commented out in the codebase.
> To re-enable, uncomment the PDF generation code in `src/generators/pdf.js` and `src/commands/generate.js`

### Entry Point Page (web/index.html)

- Year/month report navigation
- Quick access to latest reports
- Search/filter functionality
- Download links (HTML, PDF)

---

## 🛠️ Tech Stack

| Purpose | Package |
|---------|---------|
| Medium RSS Parsing | `rss-parser` |
| GitHub API | `@octokit/rest` |
| Environment Variables | `dotenv` |
| Config Validation | `ajv` |
| HTML Templates | `ejs` |
| PDF Generation | `puppeteer` (currently disabled) |
| Scheduling | `node-cron` |
| CLI Interface | `commander` |
| **AI Summarization (Local)** | **`openai` (LM Studio compatible)** |
| **AI Summarization (Cloud)** | **`@google/generative-ai` (Gemini)** |
| **PDF Text Extraction** | **`pdf-parse`** |
| **Charts & Visualization** | **Chart.js (CDN)** |

---

## 🤖 AI Summarization Setup

MossDigest supports two LLM providers for automatic content summarization:

### Option 1: LM Studio (Recommended for Privacy & Cost)

1. **Download & Install** [LM Studio](https://lmstudio.ai/)
2. **Load a Model** (e.g., `qwen2.5-32b-instruct`)
3. **Start Local Server**
   - Click "Start Server" in LM Studio
   - Default port: `8899`
4. **Configure .env**
   ```env
   LLM_PROVIDER=lmstudio
   LMSTUDIO_URL=http://localhost:8899/v1
   LMSTUDIO_MODEL=qwen2.5-32b-instruct
   ```

### Option 2: Google Gemini API

1. **Get API Key** from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Configure .env**
   ```env
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=your_api_key_here
   ```

> **Note**: Gemini code is currently commented out in `src/utils/summarizer.js`.
> To use Gemini, uncomment the Gemini-related code sections.

---

## 💻 CLI Usage

### Data Source Management

```bash
# List configured sources
npx mossdigest sources list

# Add new repository
npx mossdigest sources add-repo

# Add new organization
npx mossdigest sources add-org

# Validate configuration
npx mossdigest sources validate
```

### Data Collection

```bash
# Collect specific month data
npx mossdigest collect --year 2025 --month 12

# Collect specific quarter data
npx mossdigest collect --year 2025 --quarter 4
```

### Report Generation

```bash
# Monthly report
npx mossdigest generate --type monthly --year 2025 --month 12

# Quarterly report
npx mossdigest generate --type quarterly --year 2025 --quarter 4

# Annual report
npx mossdigest generate --type annual --year 2025
```

### Full Pipeline

```bash
# Run collection + generation at once
npx mossdigest run --type monthly --year 2025 --month 12

# Build entry point page
npx mossdigest build-web

# Start scheduler (auto-run)
npx mossdigest scheduler start
```

---

## 📅 Auto Schedule

| Execution Time | Generated Report | Cron Expression |
|----------------|------------------|-----------------|
| 1st of every month 00:00 | Previous month's monthly report | `0 0 1 * *` |
| 1st of Jan, Apr, Jul, Oct 00:00 | Previous quarter's quarterly report | `0 0 1 1,4,7,10 *` |
| January 1st 00:00 | Previous year's annual report | `0 0 1 1 *` |

---

## 🚀 Development Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Project initialization + Config structure | ✅ **Complete** |
| **Phase 2** | Data collectors (Medium + GitHub) | ✅ **Complete** |
| **Phase 2.5** | **AI Summarization (LM Studio + Gemini)** | ✅ **Complete** |
| **Phase 2.6** | **GitHub Activity Stats (PR, Issue, Contributors)** | ✅ **Complete** |
| **Phase 3** | Report generators (HTML with Dark Mode) | ✅ **Complete** |
| **Phase 3.5** | **Monthly Commit Trend Graph** | ✅ **Complete** |
| **Phase 4** | Quarterly/Annual reports (Monthly data aggregation) | 🟡 In Progress |
| **Phase 5** | Entry point page | 🟡 Planned |
| **Phase 6** | CLI completion | 🟡 In Progress |
| **Phase 7** | Auto scheduling | 🔴 Planned |
| **Phase 8** | PDF report generation (re-enable) | 🔴 Optional |

---

## 📝 License

MIT License

---

## 🤝 Contributing

Issues and PRs are welcome!
