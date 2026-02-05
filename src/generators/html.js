/**
 * HTML Report Generator
 * EJS 템플릿을 사용하여 HTML 보고서 생성
 */

import ejs from 'ejs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 월별 커밋 트렌드 데이터 생성 (연간 보고서용)
 * @param {Object} data - 수집된 데이터
 * @param {number} year - 연도
 * @returns {Array} - 월별 커밋 수 배열 (1-12월)
 */
function generateMonthlyCommitTrend(data, year) {
  const monthlyCommits = new Array(12).fill(0);

  // 저장소 커밋 집계
  if (data.repositories) {
    Object.values(data.repositories).forEach(repo => {
      if (repo.commits) {
        repo.commits.forEach(commit => {
          const commitDate = new Date(commit.date);
          if (commitDate.getFullYear() === year) {
            const month = commitDate.getMonth(); // 0-11
            monthlyCommits[month]++;
          }
        });
      }
    });
  }

  return monthlyCommits;
}

/**
 * 주차별 커밋 트렌드 데이터 생성 (월간/분기별 보고서용)
 * @param {Object} data - 수집된 데이터
 * @param {Date} startDate - 시작일
 * @param {Date} endDate - 종료일
 * @returns {Array} - 주차별 커밋 수 배열
 */
function generateWeeklyCommitTrend(data, startDate, endDate) {
  // 주차 수 계산
  const timeDiff = endDate - startDate;
  const weekCount = Math.ceil(timeDiff / (7 * 24 * 60 * 60 * 1000));
  const weeklyCommits = new Array(weekCount).fill(0);

  // 저장소 커밋 집계
  if (data.repositories) {
    Object.values(data.repositories).forEach(repo => {
      if (repo.commits) {
        repo.commits.forEach(commit => {
          const commitDate = new Date(commit.date);
          if (commitDate >= startDate && commitDate <= endDate) {
            // 시작일로부터 몇 주차인지 계산
            const weekIndex = Math.floor((commitDate - startDate) / (7 * 24 * 60 * 60 * 1000));
            if (weekIndex >= 0 && weekIndex < weekCount) {
              weeklyCommits[weekIndex]++;
            }
          }
        });
      }
    });
  }

  return weeklyCommits;
}

/**
 * 요약 보고서 생성
 * @param {Object} data - 수집된 데이터
 * @param {Object} options - 보고서 옵션
 * @returns {Promise<string>} - 생성된 HTML 문자열
 */
export async function generateSummaryReport(data, options) {
  const {
    reportTitle = 'Monthly Report',
    period = '',
    year,
    month,
    quarter
  } = options;

  // 보고서 타입 결정
  let reportType = 'annual'; // 기본값
  if (month) {
    reportType = 'monthly';
  } else if (quarter) {
    reportType = 'quarterly';
  }

  // 커밋 트렌드 데이터 및 라벨 생성
  let commitTrendData;
  let commitTrendLabels;
  let commitTrendTitle;

  if (reportType === 'annual') {
    // 연간: 월별
    commitTrendData = generateMonthlyCommitTrend(data, year);
    commitTrendLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    commitTrendTitle = '월별 커밋 트렌드';
  } else {
    // 월간/분기: 주차별
    const { startDate, endDate } = calculatePeriodRange(year, month, quarter);
    commitTrendData = generateWeeklyCommitTrend(data, startDate, endDate);
    commitTrendLabels = commitTrendData.map((_, i) => `Week ${i + 1}`);
    commitTrendTitle = '주차별 커밋 트렌드';
  }

  // 템플릿 데이터 준비
  const templateData = {
    reportTitle,
    period: period || formatPeriod(year, month, quarter),
    reportType,
    metrics: calculateMetrics(data),
    blogPosts: extractBlogPosts(data),
    repositories: extractRepositories(data),
    newRepositories: extractNewRepositories(data),
    externalLinks: extractExternalLinks(data),
    commitTrendData,
    commitTrendLabels,
    commitTrendTitle
  };

  // 템플릿 렌더링
  const templatePath = path.join(__dirname, '../../templates/summary.html.ejs');
  const html = await ejs.renderFile(templatePath, templateData);

  return html;
}

/**
 * 기간 범위 계산 (시작일, 종료일)
 * @param {number} year - 연도
 * @param {number} [month] - 월 (1-12)
 * @param {number} [quarter] - 분기 (1-4)
 * @returns {Object} - {startDate, endDate}
 */
function calculatePeriodRange(year, month, quarter) {
  let startDate, endDate;

  if (month) {
    // 월간: 해당 월의 첫날~마지막날
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59);
  } else if (quarter) {
    // 분기: 해당 분기의 첫날~마지막날
    const startMonth = (quarter - 1) * 3;
    startDate = new Date(year, startMonth, 1);
    endDate = new Date(year, startMonth + 3, 0, 23, 59, 59);
  } else {
    // 연간: 1월 1일~12월 31일
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59);
  }

  return { startDate, endDate };
}

/**
 * 상세 보고서 생성
 * @param {Object} data - 수집된 데이터
 * @param {Object} options - 보고서 옵션
 * @returns {Promise<string>} - 생성된 HTML 문자열
 */
export async function generateDetailReport(data, options) {
  const {
    reportTitle = 'Detailed Report',
    period = '',
    year,
    month,
    quarter
  } = options;

  // 템플릿 데이터 준비
  const templateData = {
    reportTitle,
    period: period || formatPeriod(year, month, quarter),
    blogPosts: extractBlogPosts(data),
    commits: extractCommits(data),
    fileChanges: extractFileChanges(data),
    releases: extractReleases(data),
    statistics: calculateDetailedStatistics(data)
  };

  // 템플릿 렌더링
  const templatePath = path.join(__dirname, '../../templates/detail.html.ejs');
  const html = await ejs.renderFile(templatePath, templateData);

  return html;
}

/**
 * HTML 파일로 저장
 * @param {string} html - HTML 문자열
 * @param {string} outputPath - 출력 파일 경로
 */
export async function saveHtmlReport(html, outputPath) {
  // 디렉토리 생성
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  // 파일 저장
  await fs.writeFile(outputPath, html, 'utf-8');
  console.log(`HTML report saved: ${outputPath}`);
}

/**
 * 기간 문자열 포맷팅
 * @param {number} year - 연도
 * @param {number} [month] - 월
 * @param {number} [quarter] - 분기
 * @returns {string}
 */
function formatPeriod(year, month, quarter) {
  if (month) {
    return `${year}년 ${month}월`;
  } else if (quarter) {
    return `${year}년 ${quarter}분기`;
  } else {
    return `${year}년`;
  }
}

/**
 * 핵심 지표 계산
 * @param {Object} data - 수집된 데이터
 * @returns {Object}
 */
function calculateMetrics(data) {
  const metrics = {
    totalBlogPosts: 0,
    totalCommits: 0,
    newRepositories: 0,
    totalReleases: 0,
    totalPullRequests: 0,
    mergedPullRequests: 0,
    totalIssues: 0,
    closedIssues: 0,
    contributors: new Set()
  };

  // 블로그 포스트 수
  if (data.medium) {
    Object.values(data.medium).forEach(feed => {
      if (feed.posts) {
        metrics.totalBlogPosts += feed.posts.length;
      }
    });
  }

  // 커밋 수
  if (data.repositories) {
    Object.values(data.repositories).forEach(repo => {
      if (repo.commits) {
        metrics.totalCommits += repo.commits.length;
      }
    });
  }

  // 조직 활동
  if (data.organizations) {
    Object.values(data.organizations).forEach(org => {
      // 신규 저장소
      if (org.newRepositories) {
        metrics.newRepositories += org.newRepositories.length;
      }

      // 커밋 및 릴리즈
      if (org.repositoryActivities) {
        org.repositoryActivities.forEach(activity => {
          metrics.totalCommits += activity.commits || 0;
          metrics.totalReleases += activity.releases?.length || 0;
        });
      }

      // PR 및 Issue 통계
      if (org.totalPullRequests) {
        metrics.totalPullRequests += org.totalPullRequests.total || 0;
        metrics.mergedPullRequests += org.totalPullRequests.merged || 0;
      }

      if (org.totalIssues) {
        metrics.totalIssues += org.totalIssues.total || 0;
        metrics.closedIssues += org.totalIssues.closed || 0;
      }

      // Contributors
      if (org.contributors) {
        org.contributors.forEach(contributor => metrics.contributors.add(contributor));
      }
    });
  }

  // PR Merge Rate 계산
  metrics.prMergeRate = metrics.totalPullRequests > 0
    ? ((metrics.mergedPullRequests / metrics.totalPullRequests) * 100).toFixed(1)
    : 0;

  // Issue Closure Rate 계산
  metrics.issueClosureRate = metrics.totalIssues > 0
    ? ((metrics.closedIssues / metrics.totalIssues) * 100).toFixed(1)
    : 0;

  // Contributors를 숫자로 변환
  metrics.totalContributors = metrics.contributors.size;
  delete metrics.contributors; // Set 제거

  return metrics;
}

/**
 * 블로그 포스트 추출
 * @param {Object} data - 수집된 데이터
 * @returns {Array}
 */
function extractBlogPosts(data) {
  const posts = [];

  if (data.medium) {
    Object.values(data.medium).forEach(feed => {
      if (feed.posts) {
        posts.push(...feed.posts);
      }
    });
  }

  // 날짜순 정렬 (최신순)
  posts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  return posts;
}

/**
 * 저장소 활동 추출
 * @param {Object} data - 수집된 데이터
 * @returns {Array}
 */
function extractRepositories(data) {
  const repositories = [];

  // 조직 활동
  if (data.organizations) {
    Object.values(data.organizations).forEach(org => {
      if (org.repositoryActivities) {
        org.repositoryActivities.forEach(activity => {
          repositories.push({
            name: activity.name,
            fullName: activity.fullName,
            url: activity.url,
            commits: activity.commits || 0,
            releases: activity.releases?.length || 0,
            isNew: false
          });
        });
      }
    });
  }

  // 저장소별 커밋
  if (data.repositories) {
    Object.entries(data.repositories).forEach(([repoName, repo]) => {
      const existing = repositories.find(r => r.fullName === repoName);
      if (existing) {
        existing.commits += repo.commits?.length || 0;
      } else if (repo.commits && repo.commits.length > 0) {
        repositories.push({
          name: repoName.split('/')[1],
          fullName: repoName,
          commits: repo.commits.length,
          releases: 0,
          isNew: false
        });
      }
    });
  }

  // 커밋 수로 정렬
  repositories.sort((a, b) => b.commits - a.commits);

  return repositories;
}

/**
 * 신규 저장소 추출
 * @param {Object} data - 수집된 데이터
 * @returns {Array}
 */
function extractNewRepositories(data) {
  const newRepos = [];

  if (data.organizations) {
    Object.values(data.organizations).forEach(org => {
      if (org.newRepositories) {
        newRepos.push(...org.newRepositories);
      }
    });
  }

  // 생성일순 정렬 (최신순)
  newRepos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return newRepos;
}

/**
 * 외부 링크 추출
 * @param {Object} data - 수집된 데이터
 * @returns {Array}
 */
function extractExternalLinks(data) {
  const links = [];

  // 저장소에서 외부 링크 추출
  if (data.repositories) {
    Object.values(data.repositories).forEach(repo => {
      if (repo.externalLinks && repo.externalLinks.length > 0) {
        links.push(...repo.externalLinks);
      }
    });
  }

  // 날짜순 정렬 (최신순)
  links.sort((a, b) => new Date(b.date) - new Date(a.date));

  return links;
}

/**
 * 커밋 목록 추출
 * @param {Object} data - 수집된 데이터
 * @returns {Array}
 */
function extractCommits(data) {
  const commits = [];

  if (data.repositories) {
    Object.values(data.repositories).forEach(repo => {
      if (repo.commits) {
        commits.push(...repo.commits);
      }
    });
  }

  // 날짜순 정렬 (최신순)
  commits.sort((a, b) => new Date(b.date) - new Date(a.date));

  return commits;
}

/**
 * 파일 변경 내역 추출
 * @param {Object} data - 수집된 데이터
 * @returns {Array}
 */
function extractFileChanges(data) {
  const fileChanges = [];

  if (data.repositories) {
    Object.values(data.repositories).forEach(repo => {
      if (repo.changedFiles) {
        fileChanges.push(...repo.changedFiles);
      }
    });
  }

  return fileChanges;
}

/**
 * 릴리즈 목록 추출
 * @param {Object} data - 수집된 데이터
 * @returns {Array}
 */
function extractReleases(data) {
  const releases = [];

  if (data.organizations) {
    Object.values(data.organizations).forEach(org => {
      if (org.repositoryActivities) {
        org.repositoryActivities.forEach(activity => {
          if (activity.releases) {
            releases.push(...activity.releases);
          }
        });
      }
    });
  }

  // 날짜순 정렬 (최신순)
  releases.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return releases;
}

/**
 * 상세 통계 계산
 * @param {Object} data - 수집된 데이터
 * @returns {Object}
 */
function calculateDetailedStatistics(data) {
  const stats = {
    totalBlogPosts: 0,
    totalCommits: 0,
    totalFilesChanged: 0,
    newRepositories: 0,
    totalReleases: 0,
    externalLinks: 0,
    topContributors: []
  };

  // 기본 지표
  const metrics = calculateMetrics(data);
  Object.assign(stats, metrics);

  // 파일 변경 수
  const fileChanges = extractFileChanges(data);
  fileChanges.forEach(change => {
    if (change.files) {
      stats.totalFilesChanged += change.files.length;
    }
  });

  // 외부 링크
  stats.externalLinks = extractExternalLinks(data).length;

  // 주요 기여자
  const contributors = {};
  const commits = extractCommits(data);
  commits.forEach(commit => {
    const author = commit.author || 'Unknown';
    contributors[author] = (contributors[author] || 0) + 1;
  });

  stats.topContributors = Object.entries(contributors)
    .map(([name, commits]) => ({ name, commits }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 10);

  return stats;
}
