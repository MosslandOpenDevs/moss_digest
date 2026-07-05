import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMetrics,
  extractRepositories,
  generateMonthlyCommitTrend
} from '../src/generators/html.js';

// A fixture where "mossland/RepoA" appears BOTH as an explicit repository source
// and inside an organization's activities. Its commits must be counted once.
function fixture() {
  return {
    medium: {
      blog: {
        posts: [{ title: 't', link: 'l', pubDate: '2025-03-01', author: 'a', summary: 's' }],
        count: 1
      }
    },
    repositories: {
      'mossland/RepoA': {
        commits: [
          { date: '2025-03-01T00:00:00Z', author: 'x' },
          { date: '2025-03-02T00:00:00Z', author: 'x' }
        ]
      }
    },
    organizations: {
      mossland: {
        newRepositories: [],
        repositoryActivities: [
          {
            name: 'RepoB',
            fullName: 'mossland/RepoB',
            url: 'u',
            description: 'desc B',
            language: 'JavaScript',
            stars: 5,
            commits: [{ date: '2025-03-03T00:00:00Z', author: 'y' }],
            releases: [],
            pullRequests: { total: 2, merged: 1, closed: 0, open: 1 },
            issues: { total: 1, closed: 1, open: 0 }
          },
          {
            // Overlaps the repositories source above; commits array (not a number).
            name: 'RepoA',
            fullName: 'mossland/RepoA',
            url: 'u',
            description: null,
            language: null,
            stars: 0,
            commits: [
              { date: '2025-03-01T00:00:00Z', author: 'x' },
              { date: '2025-03-02T00:00:00Z', author: 'x' }
            ],
            releases: [],
            pullRequests: { total: 0, merged: 0, closed: 0, open: 0 },
            issues: { total: 0, closed: 0, open: 0 }
          }
        ],
        totalPullRequests: { total: 2, merged: 1, closed: 0, open: 1 },
        totalIssues: { total: 1, closed: 1, open: 0 },
        contributors: ['x', 'y']
      }
    }
  };
}

test('calculateMetrics does not double-count commits shared by repositories and org activities', () => {
  const m = calculateMetrics(fixture());
  // RepoA (2 commits) counted once via repositories, RepoB (1 commit) via org => 3
  assert.equal(m.totalCommits, 3);
});

test('calculateMetrics aggregates PR/issue/contributor/blog stats', () => {
  const m = calculateMetrics(fixture());
  assert.equal(m.totalPullRequests, 2);
  assert.equal(m.mergedPullRequests, 1);
  assert.equal(m.prMergeRate, '50.0');
  assert.equal(m.totalIssues, 1);
  assert.equal(m.closedIssues, 1);
  assert.equal(m.issueClosureRate, '100.0');
  assert.equal(m.totalContributors, 2);
  assert.equal(m.totalBlogPosts, 1);
});

test('extractRepositories carries description/language/stars from org activities', () => {
  const repos = extractRepositories(fixture());
  const repoB = repos.find((r) => r.fullName === 'mossland/RepoB');
  assert.ok(repoB, 'RepoB should be present');
  assert.equal(repoB.language, 'JavaScript');
  assert.equal(repoB.description, 'desc B');
  assert.equal(repoB.stars, 5);
  assert.equal(repoB.commits, 1);
});

test('extractRepositories does not sum overlapping commit counts twice', () => {
  const repos = extractRepositories(fixture());
  const repoA = repos.find((r) => r.fullName === 'mossland/RepoA');
  assert.ok(repoA, 'RepoA should be present');
  assert.equal(repoA.commits, 2); // not 4
});

test('generateMonthlyCommitTrend buckets commits by month without double-counting', () => {
  const trend = generateMonthlyCommitTrend(fixture(), 2025);
  assert.equal(trend.length, 12);
  // March (index 2): RepoA 2 + RepoB 1 = 3 (RepoA org activity is deduped)
  assert.equal(trend[2], 3);
  assert.equal(trend.reduce((a, b) => a + b, 0), 3);
});
