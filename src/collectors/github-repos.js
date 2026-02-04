/**
 * GitHub Repository Collector
 * GitHub 저장소 커밋 및 파일 변경 수집기
 */

import { Octokit } from '@octokit/rest';
import { isDateInRange } from '../utils/date-filter.js';
import { collectExternalLinks } from './external-links.js';

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
 * 저장소의 커밋 목록 수집
 * @param {string} token - GitHub token
 * @param {string} owner - 저장소 소유자
 * @param {string} repo - 저장소 이름
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Promise<Array>} - 커밋 목록
 */
export async function collectCommits(token, owner, repo, startDate, endDate) {
  const octokit = createOctokit(token);

  try {
    console.log(`Fetching commits from ${owner}/${repo}`);

    const commits = [];
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

      for (const commit of response.data) {
        const commitDate = new Date(commit.commit.author.date);

        if (isDateInRange(commitDate, startDate, endDate)) {
          commits.push({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author.name,
            email: commit.commit.author.email,
            date: commitDate,
            url: commit.html_url,
            additions: commit.stats?.additions || 0,
            deletions: commit.stats?.deletions || 0,
            total: commit.stats?.total || 0
          });
        }
      }

      if (response.data.length < perPage) break;
      page++;
    }

    console.log(`Found ${commits.length} commits in date range`);
    return commits;

  } catch (error) {
    console.error(`Error fetching commits: ${error.message}`);
    throw error;
  }
}

/**
 * 특정 커밋의 변경된 파일 목록 가져오기
 * @param {string} token - GitHub token
 * @param {string} owner - 저장소 소유자
 * @param {string} repo - 저장소 이름
 * @param {string} sha - 커밋 SHA
 * @param {Array<string>} filePatterns - 파일 패턴 (예: ['*.md', '*.pdf'])
 * @returns {Promise<Array>} - 변경된 파일 목록
 */
export async function collectChangedFiles(token, owner, repo, sha, filePatterns = []) {
  const octokit = createOctokit(token);

  try {
    const response = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: sha
    });

    let files = response.data.files || [];

    // 파일 패턴이 지정된 경우 필터링
    if (filePatterns.length > 0) {
      files = files.filter(file =>
        filePatterns.some(pattern => matchPattern(file.filename, pattern))
      );
    }

    return files.map(file => ({
      filename: file.filename,
      status: file.status, // 'added', 'modified', 'removed', 'renamed'
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
      blobUrl: file.blob_url,
      rawUrl: file.raw_url
    }));

  } catch (error) {
    console.error(`Error fetching changed files for commit ${sha}: ${error.message}`);
    throw error;
  }
}

/**
 * 저장소의 README.md 내용 가져오기
 * @param {string} token - GitHub token
 * @param {string} owner - 저장소 소유자
 * @param {string} repo - 저장소 이름
 * @param {string} [branch='main'] - 브랜치 이름
 * @returns {Promise<string>} - README.md 내용
 */
export async function fetchReadme(token, owner, repo, branch = 'main') {
  const octokit = createOctokit(token);

  try {
    console.log(`Fetching README.md from ${owner}/${repo}`);

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'README.md',
      ref: branch
    });

    // Base64 디코딩
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    return content;

  } catch (error) {
    if (error.status === 404) {
      console.log(`README.md not found in ${owner}/${repo}`);
      return null;
    }
    console.error(`Error fetching README.md: ${error.message}`);
    throw error;
  }
}

/**
 * 저장소에서 전체 데이터 수집 (커밋 + 파일 변경)
 * @param {Object} config - 저장소 설정
 * @param {string} token - GitHub token
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Promise<Object>} - 수집된 데이터
 */
export async function collectRepositoryData(config, token, startDate, endDate) {
  const { owner, repo, trackFiles, parseReadmeLinks } = config;

  const result = {
    repository: `${owner}/${repo}`,
    commits: [],
    changedFiles: [],
    readme: null,
    externalLinks: []
  };

  try {
    // README만 필요한 경우 (trackFiles가 비어있으면 커밋 수집 스킵)
    const needCommits = trackFiles && trackFiles.length > 0;

    if (needCommits) {
      // 1. 커밋 수집
      console.log(`Collecting commits from ${owner}/${repo}...`);
      result.commits = await collectCommits(token, owner, repo, startDate, endDate);

      // 2. 각 커밋의 변경된 파일 수집
      for (const commit of result.commits) {
        const files = await collectChangedFiles(
          token,
          owner,
          repo,
          commit.sha,
          trackFiles
        );

        result.changedFiles.push({
          commitSha: commit.sha,
          commitMessage: commit.message,
          commitDate: commit.date,
          files
        });

        // Rate limiting 방지를 위한 지연
        await sleep(100);
      }
    } else {
      console.log(`Skipping commit collection for ${owner}/${repo} (trackFiles is empty)`);
    }

    // 3. README.md 수집 및 외부 링크 파싱 (parseReadmeLinks가 true인 경우)
    if (parseReadmeLinks) {
      console.log(`Fetching README from ${owner}/${repo}...`);
      result.readme = await fetchReadme(token, owner, repo);

      if (result.readme) {
        console.log(`Parsing external links from README...`);
        result.externalLinks = await collectExternalLinks(
          result.readme,
          startDate,
          endDate,
          true,  // fetchContent
          true   // summarize (AI 요약)
        );
      }
    }

    return result;

  } catch (error) {
    console.error(`Error collecting repository data: ${error.message}`);
    throw error;
  }
}

/**
 * 여러 저장소에서 데이터 수집
 * @param {Array} repositories - 저장소 설정 배열
 * @param {string} token - GitHub token
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Promise<Object>} - 저장소별 데이터
 */
export async function collectFromMultipleRepositories(repositories, token, startDate, endDate) {
  const results = {};

  for (const repoConfig of repositories) {
    if (!repoConfig.enabled) {
      console.log(`Skipping disabled repository: ${repoConfig.owner}/${repoConfig.repo}`);
      continue;
    }

    try {
      const data = await collectRepositoryData(repoConfig, token, startDate, endDate);
      results[`${repoConfig.owner}/${repoConfig.repo}`] = data;
    } catch (error) {
      console.error(`Error collecting from ${repoConfig.owner}/${repoConfig.repo}:`, error.message);
      results[`${repoConfig.owner}/${repoConfig.repo}`] = {
        error: error.message,
        commits: [],
        changedFiles: [],
        readme: null
      };
    }
  }

  return results;
}

/**
 * 파일명이 패턴과 일치하는지 확인 (간단한 glob 매칭)
 * @param {string} filename - 파일명
 * @param {string} pattern - 패턴 (예: '*.md', '*.pdf')
 * @returns {boolean}
 */
function matchPattern(filename, pattern) {
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(filename);
}

/**
 * 지연 함수 (rate limiting 방지)
 * @param {number} ms - 밀리초
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
