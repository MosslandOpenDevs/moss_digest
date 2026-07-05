/**
 * Build Web command handler
 * 엔트리포인트 웹 페이지 생성
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 웹 페이지 빌드
 */
export async function buildWebPage() {
  try {
    console.log('\n🌐 Building entry point web page...\n');

    const reportsDir = path.join(__dirname, '../../reports');
    const webDir = path.join(__dirname, '../../web');

    // 보고서 디렉토리 스캔
    const reportsList = await scanReports(reportsDir);

    // index.html 생성
    const html = generateIndexHtml(reportsList);

    await fs.mkdir(webDir, { recursive: true });
    const indexPath = path.join(webDir, 'index.html');
    await fs.writeFile(indexPath, html, 'utf-8');

    console.log(`✅ Web page built successfully!`);
    console.log(`📁 Location: ${indexPath}`);
    console.log(`\n📊 Found ${reportsList.length} reports`);
    console.log('');

  } catch (error) {
    console.error('❌ Error building web page:', error.message);
    process.exit(1);
  }
}

/**
 * 보고서 디렉토리 스캔
 * @param {string} reportsDir - 보고서 디렉토리 경로
 * @returns {Promise<Array>} - 보고서 목록
 */
async function scanReports(reportsDir) {
  const reports = [];

  try {
    const years = await fs.readdir(reportsDir);

    for (const year of years) {
      const yearPath = path.join(reportsDir, year);
      const stat = await fs.stat(yearPath);

      if (!stat.isDirectory()) continue;

      // Monthly reports
      const monthlyPath = path.join(yearPath, 'monthly');
      try {
        const months = await fs.readdir(monthlyPath);
        for (const month of months) {
          const monthPath = path.join(monthlyPath, month);
          const monthStat = await fs.stat(monthPath);
          if (monthStat.isDirectory()) {
            reports.push({
              type: 'monthly',
              year: parseInt(year),
              period: month,
              path: `reports/${year}/monthly/${month}`
            });
          }
        }
      } catch (err) {
        // Monthly directory doesn't exist
      }

      // Quarterly reports
      const quarterlyPath = path.join(yearPath, 'quarterly');
      try {
        const quarters = await fs.readdir(quarterlyPath);
        for (const quarter of quarters) {
          const quarterPath = path.join(quarterlyPath, quarter);
          const quarterStat = await fs.stat(quarterPath);
          if (quarterStat.isDirectory()) {
            reports.push({
              type: 'quarterly',
              year: parseInt(year),
              period: quarter,
              path: `reports/${year}/quarterly/${quarter}`
            });
          }
        }
      } catch (err) {
        // Quarterly directory doesn't exist
      }

      // Annual reports
      const annualPath = path.join(yearPath, 'annual');
      try {
        const annualStat = await fs.stat(annualPath);
        if (annualStat.isDirectory()) {
          reports.push({
            type: 'annual',
            year: parseInt(year),
            period: year,
            path: `reports/${year}/annual`
          });
        }
      } catch (err) {
        // Annual directory doesn't exist
      }
    }
  } catch (err) {
    // Reports directory doesn't exist
  }

  // Sort by year and period (descending)
  reports.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.period.localeCompare(a.period);
  });

  return reports;
}

/**
 * index.html 생성
 * @param {Array} reports - 보고서 목록
 * @returns {string} - HTML 문자열
 */
function generateIndexHtml(reports) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MossDigest - Reports</title>
  <style>
    :root {
      --primary-color: #008080;
      --primary-dark: #006666;
      --primary-light: #20b2aa;
      --bg-color: #f5f5f5;
      --card-bg: #ffffff;
      --text-color: #333333;
      --text-secondary: #666666;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      line-height: 1.6;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
      color: white;
      padding: 40px;
      margin-bottom: 30px;
      border-radius: 8px;
      text-align: center;
    }

    header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }

    .reports-list {
      list-style: none;
    }

    .report-item {
      background: var(--card-bg);
      padding: 20px;
      margin-bottom: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border-left: 4px solid var(--primary-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .report-info h3 {
      color: var(--primary-dark);
      margin-bottom: 8px;
    }

    .report-info .meta {
      font-size: 0.9em;
      color: var(--text-secondary);
    }

    .report-links {
      display: flex;
      gap: 10px;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      font-size: 0.9em;
      font-weight: 500;
      transition: opacity 0.2s;
    }

    .btn:hover {
      opacity: 0.8;
    }

    .btn-primary {
      background-color: var(--primary-color);
      color: white;
    }

    .btn-secondary {
      background-color: var(--primary-light);
      color: white;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 500;
      margin-left: 10px;
    }

    .badge-monthly {
      background-color: #4caf50;
      color: white;
    }

    .badge-quarterly {
      background-color: #2196f3;
      color: white;
    }

    .badge-annual {
      background-color: #ff9800;
      color: white;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary);
    }

    footer {
      text-align: center;
      padding: 30px 20px;
      color: var(--text-secondary);
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🌿 MossDigest</h1>
      <p>Mossland Project Activity Reports</p>
    </header>

    ${reports.length > 0 ? `
    <ul class="reports-list">
      ${reports.map(report => `
      <li class="report-item">
        <div class="report-info">
          <h3>
            ${report.year}년 ${formatPeriod(report.type, report.period)}
            <span class="badge badge-${report.type}">${report.type.toUpperCase()}</span>
          </h3>
          <div class="meta">Generated report</div>
        </div>
        <div class="report-links">
          <a href="../${report.path}/summary.html" class="btn btn-primary" target="_blank">📄 Summary</a>
        </div>
      </li>
      `).join('')}
    </ul>
    ` : `
    <div class="empty-state">
      <h2>No reports available yet</h2>
      <p>Run <code>mossdigest run</code> to generate reports</p>
    </div>
    `}

    <footer>
      <p>MossDigest - Automated Activity Reports</p>
      <p>Generated on ${new Date().toLocaleString('ko-KR')}</p>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * 기간 포맷팅
 * @param {string} type - 보고서 타입
 * @param {string} period - 기간
 * @returns {string}
 */
function formatPeriod(type, period) {
  if (type === 'monthly') {
    return `${period}월`;
  } else if (type === 'quarterly') {
    return `${period}`;
  } else {
    return '연간';
  }
}
