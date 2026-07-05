/**
 * GitHub Organization Collector
 * GitHub 조직의 저장소 목록 및 활동 수집기
 */

import { Octokit } from '@octokit/rest';
import { isDateInRange } from '../utils/date-filter.js';

/**
 * Octokit 인스턴스 생성
 * @param {string} token - GitHub Personal Access Token
 * @returns {Octokit}
 */
function createOctokit(token) {
  if (!token) {
    throw new Error('GitHub token is required. Set GITHUB_TOKEN in .env file');
  }
  return new Octokit({ auth: token });
}

/**
 * 조직 또는 사용자의 전체 저장소 목록 가져오기
 * @param {string} token - GitHub token
 * @param {string} org - 조직 또는 사용자 이름
 * @returns {Promise<Array>} - 저장소 목록
 */
export async function listOrganizationRepositories(token, org) {
  const octokit = createOctokit(token);

  try {
    console.log(`\n[DEBUG] Fetching repositories from: ${org}`);
    console.log(`[DEBUG] Trying organization API first: GET /orgs/${org}/repos`);
    console.log(`[DEBUG] Token present: ${!!token}`);
    console.log(`[DEBUG] Token prefix: ${token.substring(0, 7)}...`);

    const repositories = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      console.log(`[DEBUG] Requesting page ${page}...`);

      const response = await octokit.rest.repos.listForOrg({
        org,
        type: 'all',
        sort: 'created',
        direction: 'desc',
        per_page: perPage,
        page
      });

      console.log(`[DEBUG] Response status: ${response.status}`);
      console.log(`[DEBUG] Received ${response.data.length} repositories on page ${page}`);

      if (response.data.length === 0) break;

      repositories.push(...response.data);

      if (response.data.length < perPage) break;
      page++;
    }

    console.log(`[SUCCESS] Found ${repositories.length} repositories in organization ${org}\n`);
    return repositories;

  } catch (error) {
    // Organization API 실패 시 User API 시도
    if (error.status === 404) {
      console.log(`[INFO] ${org} is not an organization, trying user API...`);
      try {
        const repositories = [];
        let page = 1;
        const perPage = 100;

        while (true) {
          console.log(`[DEBUG] Requesting user repos page ${page}...`);

          const response = await octokit.rest.repos.listForUser({
            username: org,
            type: 'all',
            sort: 'created',
            direction: 'desc',
            per_page: perPage,
            page
          });

          console.log(`[DEBUG] Response status: ${response.status}`);
          console.log(`[DEBUG] Received ${response.data.length} repositories on page ${page}`);

          if (response.data.length === 0) break;

          repositories.push(...response.data);

          if (response.data.length < perPage) break;
          page++;
        }

        console.log(`[SUCCESS] Found ${repositories.length} repositories for user ${org}\n`);
        return repositories;

      } catch (userError) {
        console.error(`\n[ERROR] Failed to fetch repositories for ${org}`);
        console.error(`[ERROR] Status: ${userError.status}`);
        console.error(`[ERROR] Message: ${userError.message}`);
        console.error(`[ERROR] ${org} is neither an organization nor a user`);
        console.error(`[ERROR] Check: https://github.com/${org}\n`);
        throw userError;
      }
    }

    console.error(`\n[ERROR] Failed to fetch repositories for ${org}`);
    console.error(`[ERROR] Status: ${error.status}`);
    console.error(`[ERROR] Message: ${error.message}`);
    console.error(`[ERROR] API URL: ${error.request?.url || 'N/A'}`);
    throw error;
  }
}

/**
 * 특정 기간에 생성된 신규 저장소 필터링
 * @param {Array} repositories - 저장소 목록
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Array} - 신규 저장소 목록
 */
export function filterNewRepositories(repositories, startDate, endDate) {
  return repositories
    .filter(repo => {
      const createdAt = new Date(repo.created_at);
      return isDateInRange(createdAt, startDate, endDate);
    })
    .map(repo => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      createdAt: new Date(repo.created_at),
      url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      isPrivate: repo.private,
      defaultBranch: repo.default_branch
    }));
}

/**
 * 저장소의 커밋 목록 수집 (날짜 정보 포함)
 * @param {string} token - GitHub token
 * @param {string} owner - 저장소 소유자
 * @param {string} repo - 저장소 이름
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Promise<Array>} - 커밋 목록 (날짜 정보 포함)
 */
export async function countCommits(token, owner, repo, startDate, endDate) {
  const octokit = createOctokit(token);

  try {
    let allCommits = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await octokit.rest.repos.listCommits({
        owner,
        repo,
        since: startDate.toISOString(),
        until: endDate.toISOString(),
        per_page: perPage,
        page
      });

      if (response.data.length === 0) break;

      // 커밋 정보 저장 (날짜, 작성자, 메시지)
      const commits = response.data.map(commit => ({
        sha: commit.sha,
        date: commit.commit.author.date,
        author: commit.commit.author.name,
        message: commit.commit.message.split('\n')[0], // 첫 줄만
        url: commit.html_url
      }));

      allCommits.push(...commits);

      if (page === 1) {
        console.log(`    [DEBUG] ${repo}: page ${page} - ${response.data.length} commits`);
      }

      // 마지막 페이지인지 확인
      if (response.data.length < perPage) break;

      page++;

      // Rate limiting 방지 (조직 저장소가 많을 수 있으므로)
      await sleep(100);
    }

    return allCommits;

  } catch (error) {
    if (error.status === 409) {
      console.log(`    [DEBUG] ${repo}: Empty repository (409)`);
      return [];
    }
    if (error.status === 404) {
      console.log(`    [DEBUG] ${repo}: Not found (404)`);
      return [];
    }
    console.error(`    [ERROR] Error counting commits for ${owner}/${repo}: ${error.message}`);
    return [];
  }
}

/**
 * 저장소의 릴리즈 목록 가져오기
 * @param {string} token - GitHub token
 * @param {string} owner - 저장소 소유자
 * @param {string} repo - 저장소 이름
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Promise<Array>} - 릴리즈 목록
 */
export async function collectReleases(token, owner, repo, startDate, endDate) {
  const octokit = createOctokit(token);

  try {
    // 릴리즈가 100개를 초과하는 저장소에서도 누락이 없도록 페이지네이션 처리
    // (listReleases는 created_at 내림차순이므로 페이지의 가장 오래된 항목이
    //  시작일 이전이면 조기 종료)
    const allReleases = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await octokit.rest.repos.listReleases({
        owner,
        repo,
        per_page: perPage,
        page
      });

      if (response.data.length === 0) break;
      allReleases.push(...response.data);

      const oldest = response.data[response.data.length - 1];
      if (oldest.created_at && new Date(oldest.created_at) < startDate) break;

      if (response.data.length < perPage) break;
      page++;
      await sleep(100);
    }

    return allReleases
      .filter(release => {
        const publishedAt = new Date(release.published_at);
        return isDateInRange(publishedAt, startDate, endDate);
      })
      .map(release => ({
        name: release.name || release.tag_name,
        tagName: release.tag_name,
        publishedAt: new Date(release.published_at),
        author: release.author?.login,
        url: release.html_url,
        draft: release.draft,
        prerelease: release.prerelease,
        body: release.body
      }));

  } catch (error) {
    console.error(`Error fetching releases for ${owner}/${repo}: ${error.message}`);
    return [];
  }
}

/**
 * 저장소의 Pull Request 수집
 * @param {string} token - GitHub token
 * @param {string} owner - 저장소 소유자
 * @param {string} repo - 저장소 이름
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Promise<Object>} - PR 통계 {total, merged, closed, open}
 */
export async function collectPullRequests(token, owner, repo, startDate, endDate) {
  const octokit = createOctokit(token);

  try {
    let allPRs = [];
    let page = 1;
    const perPage = 100;

    // closed와 merged PR 수집
    while (true) {
      const response = await octokit.rest.pulls.list({
        owner,
        repo,
        state: 'all',
        per_page: perPage,
        page,
        sort: 'created',
        direction: 'desc'
      });

      if (response.data.length === 0) break;
      allPRs.push(...response.data);

      // 날짜 범위를 벗어나면 중단
      const oldestPR = response.data[response.data.length - 1];
      if (new Date(oldestPR.created_at) < startDate) break;

      if (response.data.length < perPage) break;
      page++;
      await sleep(100);
    }

    // 날짜 범위 필터링
    const filteredPRs = allPRs.filter(pr => {
      const createdAt = new Date(pr.created_at);
      return isDateInRange(createdAt, startDate, endDate);
    });

    const stats = {
      total: filteredPRs.length,
      merged: filteredPRs.filter(pr => pr.merged_at).length,
      closed: filteredPRs.filter(pr => pr.state === 'closed' && !pr.merged_at).length,
      open: filteredPRs.filter(pr => pr.state === 'open').length
    };

    return stats;

  } catch (error) {
    console.error(`Error fetching PRs for ${owner}/${repo}: ${error.message}`);
    return { total: 0, merged: 0, closed: 0, open: 0 };
  }
}

/**
 * 저장소의 Issue 수집
 * @param {string} token - GitHub token
 * @param {string} owner - 저장소 소유자
 * @param {string} repo - 저장소 이름
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Promise<Object>} - Issue 통계 {total, closed, open}
 */
export async function collectIssues(token, owner, repo, startDate, endDate) {
  const octokit = createOctokit(token);

  try {
    let allIssues = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        per_page: perPage,
        page,
        sort: 'created',
        direction: 'desc'
      });

      if (response.data.length === 0) break;

      // PR은 제외 (GitHub API에서 PR도 Issue로 반환됨)
      const issues = response.data.filter(issue => !issue.pull_request);
      allIssues.push(...issues);

      // 날짜 범위를 벗어나면 중단
      const oldestIssue = response.data[response.data.length - 1];
      if (new Date(oldestIssue.created_at) < startDate) break;

      if (response.data.length < perPage) break;
      page++;
      await sleep(100);
    }

    // 날짜 범위 필터링
    const filteredIssues = allIssues.filter(issue => {
      const createdAt = new Date(issue.created_at);
      return isDateInRange(createdAt, startDate, endDate);
    });

    const stats = {
      total: filteredIssues.length,
      closed: filteredIssues.filter(issue => issue.state === 'closed').length,
      open: filteredIssues.filter(issue => issue.state === 'open').length
    };

    return stats;

  } catch (error) {
    console.error(`Error fetching issues for ${owner}/${repo}: ${error.message}`);
    return { total: 0, closed: 0, open: 0 };
  }
}

/**
 * 조직의 전체 활동 수집
 * @param {Object} config - 조직 설정
 * @param {string} token - GitHub token
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Promise<Object>} - 수집된 데이터
 */
export async function collectOrganizationData(config, token, startDate, endDate) {
  const { name, trackNewRepos, trackCommits, trackReleases } = config;
  const octokit = createOctokit(token);

  const result = {
    organization: name,
    newRepositories: [],
    repositoryActivities: [],
    totalPullRequests: { total: 0, merged: 0, closed: 0, open: 0 },
    totalIssues: { total: 0, closed: 0, open: 0 },
    contributors: new Set()
  };

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing organization: ${name}`);
    console.log(`${'='.repeat(60)}`);

    // 1. 전체 저장소 목록 가져오기
    let allRepos;
    try {
      allRepos = await listOrganizationRepositories(token, name);
    } catch (error) {
      console.error(`\n[SKIP] Cannot access ${name}, skipping...\n`);
      return result; // Return empty result instead of throwing
    }

    // 2. 신규 저장소 필터링
    if (trackNewRepos) {
      result.newRepositories = filterNewRepositories(allRepos, startDate, endDate);
      console.log(`[INFO] Found ${result.newRepositories.length} new repositories`);
    }

    // 3. 각 저장소의 활동 수집
    console.log(`\n[INFO] Collecting activities from ${allRepos.length} repositories...`);
    for (const repo of allRepos) {
      try {
        const activity = {
          name: repo.name,
          fullName: repo.full_name,
          url: repo.html_url,
          description: repo.description || null,
          language: repo.language || null,
          stars: repo.stargazers_count || 0,
          commits: [],
          releases: [],
          pullRequests: { total: 0, merged: 0, closed: 0, open: 0 },
          issues: { total: 0, closed: 0, open: 0 }
        };

        // 커밋 수 집계
        if (trackCommits) {
          console.log(`  [DEBUG] Counting commits for ${repo.name}...`);
          activity.commits = await countCommits(token, name, repo.name, startDate, endDate);
          console.log(`  [DEBUG] ${repo.name}: ${activity.commits.length} commits`);
        }

        // 릴리즈 수집
        if (trackReleases) {
          console.log(`  [DEBUG] Fetching releases for ${repo.name}...`);
          activity.releases = await collectReleases(token, name, repo.name, startDate, endDate);
          console.log(`  [DEBUG] ${repo.name}: ${activity.releases.length} releases`);
        }

        // Pull Requests 수집
        console.log(`  [DEBUG] Collecting PRs for ${repo.name}...`);
        activity.pullRequests = await collectPullRequests(token, name, repo.name, startDate, endDate);
        console.log(`  [DEBUG] ${repo.name}: ${activity.pullRequests.total} PRs`);

        // Issues 수집
        console.log(`  [DEBUG] Collecting issues for ${repo.name}...`);
        activity.issues = await collectIssues(token, name, repo.name, startDate, endDate);
        console.log(`  [DEBUG] ${repo.name}: ${activity.issues.total} issues`);

        // 전체 통계에 합산
        result.totalPullRequests.total += activity.pullRequests.total;
        result.totalPullRequests.merged += activity.pullRequests.merged;
        result.totalPullRequests.closed += activity.pullRequests.closed;
        result.totalPullRequests.open += activity.pullRequests.open;

        result.totalIssues.total += activity.issues.total;
        result.totalIssues.closed += activity.issues.closed;
        result.totalIssues.open += activity.issues.open;

        // 활동이 있는 저장소만 추가
        // 주의: activity.commits는 배열이므로 반드시 .length로 비교해야 함
        // (배열을 숫자와 직접 비교하면 항상 false가 되어 커밋만 있는 저장소가 누락됨)
        if (activity.commits.length > 0 || activity.releases.length > 0 ||
            activity.pullRequests.total > 0 || activity.issues.total > 0) {
          result.repositoryActivities.push(activity);
        }

        // Rate limiting 방지
        await sleep(200);
      } catch (error) {
        // 개별 저장소 오류는 로그만 남기고 계속 진행
        console.warn(`⚠️  Skipping ${repo.name}: ${error.message}`);
        await sleep(200);
      }
    }

    // 4. 기여자 수집 (해당 기간에 활동이 있었던 저장소에서만)
    //    - 전체 저장소를 도는 대신 활동 저장소만 조회하여 API 호출/rate limit을 절감
    console.log(`\n[INFO] Collecting contributors from ${result.repositoryActivities.length} active repositories...`);
    for (const activity of result.repositoryActivities) {
      try {
        const response = await octokit.rest.repos.listContributors({
          owner: name,
          repo: activity.name,
          per_page: 100
        });

        response.data.forEach(contributor => {
          result.contributors.add(contributor.login);
        });

        await sleep(100);
      } catch (error) {
        // 저장소가 비어있거나 접근 불가한 경우 무시
      }
    }

    // Set을 배열로 변환
    result.contributors = Array.from(result.contributors);
    console.log(`[INFO] Found ${result.contributors.length} unique contributors`);

    console.log(`Collected activities from ${result.repositoryActivities.length} active repositories`);
    return result;

  } catch (error) {
    console.error(`Error collecting organization data: ${error.message}`);
    // Return partial result instead of throwing
    // Set을 배열로 변환
    result.contributors = Array.from(result.contributors);
    return result;
  }
}

/**
 * 여러 조직에서 데이터 수집
 * @param {Array} organizations - 조직 설정 배열
 * @param {string} token - GitHub token
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Promise<Object>} - 조직별 데이터
 */
export async function collectFromMultipleOrganizations(organizations, token, startDate, endDate) {
  const results = {};

  for (const orgConfig of organizations) {
    if (!orgConfig.enabled) {
      console.log(`Skipping disabled organization: ${orgConfig.name}`);
      continue;
    }

    try {
      const data = await collectOrganizationData(orgConfig, token, startDate, endDate);
      results[orgConfig.name] = data;
    } catch (error) {
      console.error(`Error collecting from ${orgConfig.name}:`, error.message);
      results[orgConfig.name] = {
        organization: orgConfig.name,
        error: error.message,
        newRepositories: [],
        repositoryActivities: []
      };
    }
  }

  return results;
}

/**
 * 지연 함수 (rate limiting 방지)
 * @param {number} ms - 밀리초
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
