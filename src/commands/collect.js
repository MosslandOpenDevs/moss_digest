/**
 * Collect command handler
 * 데이터 수집 명령어
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDateRange } from '../utils/date-filter.js';
import { collectFromMultipleFeeds } from '../collectors/medium.js';
import { collectFromMultipleRepositories } from '../collectors/github-repos.js';
import { collectFromMultipleOrganizations } from '../collectors/github-orgs.js';
import { initializeLLM } from '../utils/summarizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCES_PATH = path.join(__dirname, '../../config/sources.json');

/**
 * 데이터 수집 실행
 * @param {Object} options - CLI 옵션
 */
export async function collectData(options) {
  try {
    const { year, month, quarter, verbose } = options;

    // 날짜 범위 결정
    let reportType, period;
    if (month) {
      reportType = 'monthly';
      period = month;
    } else if (quarter) {
      reportType = 'quarterly';
      period = quarter;
    } else {
      reportType = 'annual';
      period = null;
    }

    const { startDate, endDate } = getDateRange(reportType, year, period);

    console.log('\n🚀 MossDigest Data Collection\n');
    console.log(`📅 Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    console.log(`📊 Type: ${reportType}`);
    if (verbose) {
      console.log(`🔍 Verbose mode: ON\n`);
    }

    // GitHub 토큰 확인
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('❌ Error: GITHUB_TOKEN not found in environment variables');
      console.error('   Please set GITHUB_TOKEN in config/.env file');
      process.exit(1);
    }

    // LLM 초기화 (선택적)
    const llmProvider = process.env.LLM_PROVIDER || 'lmstudio';
    console.log(`\n🤖 Initializing LLM (${llmProvider}) for content summarization...`);
    await initializeLLM();

    // sources.json 읽기
    const sourcesData = await fs.readFile(SOURCES_PATH, 'utf-8');
    const sources = JSON.parse(sourcesData);

    const collectedData = {
      metadata: {
        collectedAt: new Date().toISOString(),
        period: { startDate, endDate },
        type: reportType,
        year,
        month,
        quarter
      },
      medium: {},
      repositories: {},
      organizations: {}
    };

    // 1. Medium RSS 수집
    console.log('\n📝 Collecting Medium RSS feeds...');
    if (sources.medium?.feeds) {
      collectedData.medium = await collectFromMultipleFeeds(
        sources.medium.feeds,
        startDate,
        endDate,
        true  // AI 요약 활성화
      );
      const totalPosts = Object.values(collectedData.medium)
        .reduce((sum, feed) => sum + (feed.count || 0), 0);
      console.log(`   ✅ Collected ${totalPosts} blog posts`);
    }

    // 2. GitHub 저장소 수집
    console.log('\n💾 Collecting GitHub repositories...');
    if (sources.github?.repositories) {
      collectedData.repositories = await collectFromMultipleRepositories(
        sources.github.repositories,
        githubToken,
        startDate,
        endDate
      );
      const totalCommits = Object.values(collectedData.repositories)
        .reduce((sum, repo) => sum + (repo.commits?.length || 0), 0);
      console.log(`   ✅ Collected ${totalCommits} commits from ${Object.keys(collectedData.repositories).length} repositories`);
    }

    // 3. GitHub 조직 수집
    console.log('\n🏢 Collecting GitHub organizations...');
    if (sources.github?.organizations) {
      collectedData.organizations = await collectFromMultipleOrganizations(
        sources.github.organizations,
        githubToken,
        startDate,
        endDate
      );
      const totalNewRepos = Object.values(collectedData.organizations)
        .reduce((sum, org) => sum + (org.newRepositories?.length || 0), 0);
      console.log(`   ✅ Found ${totalNewRepos} new repositories`);
    }

    // 5. 데이터 저장
    const outputDir = path.join(__dirname, '../../data', year.toString(), reportType);
    await fs.mkdir(outputDir, { recursive: true });

    let filename;
    if (reportType === 'monthly') {
      filename = `${year}-${String(month).padStart(2, '0')}.json`;
    } else if (reportType === 'quarterly') {
      filename = `${year}-Q${quarter}.json`;
    } else {
      filename = `${year}.json`;
    }

    const outputPath = path.join(outputDir, filename);
    await fs.writeFile(outputPath, JSON.stringify(collectedData, null, 2), 'utf-8');

    console.log(`\n✅ Data collection completed!`);
    console.log(`📁 Saved to: ${outputPath}`);

    // Summary
    const totalLinks = Object.values(collectedData.repositories)
      .reduce((sum, r) => sum + (r.externalLinks?.length || 0), 0);
    const totalSummarized = Object.values(collectedData.repositories)
      .reduce((sum, r) => {
        const links = r.externalLinks || [];
        return sum + links.filter(link => link.summary).length;
      }, 0);

    console.log('\n📊 Summary:');
    console.log(`   Blog posts: ${Object.values(collectedData.medium).reduce((sum, f) => sum + (f.count || 0), 0)}`);
    console.log(`   Commits: ${Object.values(collectedData.repositories).reduce((sum, r) => sum + (r.commits?.length || 0), 0)}`);
    console.log(`   New repositories: ${Object.values(collectedData.organizations).reduce((sum, o) => sum + (o.newRepositories?.length || 0), 0)}`);
    console.log(`   External links: ${totalLinks}`);
    if (totalSummarized > 0) {
      console.log(`   AI summaries: ${totalSummarized}/${totalLinks}`);
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during data collection:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
